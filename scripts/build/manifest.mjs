/**
 * manifest.mjs — the machine-readable component manifest.
 *
 * Emits `component-manifest.json`, published as `@qeetrix/ui/manifest.json`: one entry per
 * component carrying its identity, its stable import paths, and its governance contract.
 * Docs, MCP tooling and consumers read it to discover the component surface without parsing
 * barrels or source.
 *
 * The manifest is generated from exactly three inputs, and nothing is invented:
 *
 *   1. the filesystem + scripts/config/component-map.json — identity, category, layer
 *   2. the component source — description (the doc comment on the component's declaration),
 *      capabilities, interaction states, `cva` variants, client boundary, test coverage
 *      (scripts/lib/component-source.mjs)
 *   3. src/manifests/component-registry.ts — the declared facts that cannot be derived:
 *      status, ARIA pattern, reviewed capability overrides, deprecations, and the description
 *      of a module of several exports
 *
 * Anything neither derivable nor declared is emitted as `"unknown"` / `null`. A missing fact
 * and a negative fact are different things.
 *
 * Schema version 2 adds the contract fields; every version-1 field is still emitted, so
 * existing consumers keep working. See docs/standards/component-manifest.md.
 *
 * The output is a tracked artifact, so it has to be reproducible from those inputs alone: no
 * wall-clock stamp, and no dependence on which sibling repos happen to be checked out.
 *
 *   node scripts/build/manifest.mjs            # regenerate
 *   node scripts/build/manifest.mjs --check    # prove the tracked file is current (CI)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describeComponentSource } from "../lib/component-source.mjs";
import { layerOf } from "../lib/layers.mjs";
import { densityAwareVariables, loadTokenGraph } from "../lib/tokens.mjs";
import {
  readCvaVariantGroups,
  readLiteralExports,
  readLiteralExportsFromDirectory,
} from "../lib/ts-literals.mjs";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "../..");
const COMPONENTS = join(PKG, "src/components");
const STORIES = join(PKG, "../qeetrix-story/stories");
const GLOBAL_A11Y_HARNESS = join(PKG, "src/__tests__/a11y.test.tsx");
const HYDRATION_HARNESS = join(PKG, "src/__tests__/hydration.test.tsx");
const OUTPUT = join(PKG, "component-manifest.json");

/** `--check` regenerates in memory and diffs against the tracked file; it never writes. */
const CHECK = process.argv.includes("--check");

/**
 * The manifest currently on disk. Two things read it back:
 *   - `--check`, to prove the tracked artifact is current;
 *   - the story index and the `generated` date, so a machine without the sibling story repo
 *     reproduces the same bytes instead of quietly rewriting 145 entries.
 */
const tracked = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, "utf8")) : null;

const { version } = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));

// The contract vocabularies and the governance registry are authored in TypeScript so `tsc`
// validates them; they are read statically here (see scripts/lib/ts-literals.mjs).
const contracts = readLiteralExportsFromDirectory(join(PKG, "src/contracts"));
const { COMPONENT_REGISTRY, REGISTRY_DEFAULTS } = readLiteralExports(
  join(PKG, "src/manifests/component-registry.ts"),
);
const { MANIFEST_SCHEMA_VERSION } = readLiteralExports(
  join(PKG, "src/manifests/component-manifest.ts"),
);

// Which CSS variables resolve to a density variable. A component consuming
// --qx-component-button-height is density-aware; the token graph is what knows that.
const densityAware = densityAwareVariables(loadTokenGraph({ root: PKG }));

const pascal = (slug) =>
  slug
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");

/**
 * The entry's `name`: the module's real component export when one matches the slug's PascalCase
 * name case-insensitively (`qr-code` → `QRCode`, `otp-input` → `OTPInput`, `json-tree` →
 * `JSONTree`), so a consumer can import what the manifest names. A module of several parts with
 * no export of its own name (`chart`, `clipboard`, `resizable`) keeps the module's name.
 */
const ABBREVIATIONS = new Set(["a.k.a.", "e.g.", "i.e.", "etc.", "vs.", "cf."]);

/**
 * The entry's `description`: the first sentence of the doc comment directly above the
 * declaration of `name`, or `null`. Sentences end at a full stop outside a code span that is not
 * part of an abbreviation such as "e.g.".
 */
const docDescription = (source, name) => {
  const doc = new RegExp(
    String.raw`/\*\*((?:(?!\*/)[\s\S])*)\*/\s*(?:export\s+)?(?:function|const)\s+${name}\b`,
  ).exec(source)?.[1];
  if (!doc) return null;
  const text = doc
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .join(" ")
    .replace(/\{@link\s+([^}\s]+)[^}]*\}/g, "$1")
    .replace(/\s*\(Gap \d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  let inCode = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "`") inCode = !inCode;
    if (inCode || text[i] !== "." || (i < text.length - 1 && text[i + 1] !== " ")) continue;
    const word = text.slice(text.lastIndexOf(" ", i) + 1, i + 1).replace(/^\(/, "");
    if (!ABBREVIATIONS.has(word.toLowerCase())) return text.slice(0, i + 1);
  }
  return text || null;
};

const componentName = (slug, source) => {
  const base = pascal(slug);
  const exported = new Set();
  for (const match of source.matchAll(/export\s*{([^}]*)}/g)) {
    for (const part of match[1].split(",")) {
      const name = part
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) exported.add(name);
    }
  }
  for (const match of source.matchAll(/export (?:function|const) (\w+)/g)) exported.add(match[1]);
  if (exported.has(base)) return base;
  const match = [...exported].find(
    (name) => /^[A-Z]/.test(name) && name.toLowerCase() === base.toLowerCase(),
  );
  return match ?? base;
};

const isComponent = (f) => /\.tsx$/.test(f) && !/\.(test|stories)\.tsx$/.test(f);
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

/**
 * The `src/internal/` modules a component imports, as source text.
 *
 * Internal modules are private implementation — the shared field recipe, the copy-feedback
 * swap, the logical-side resolver — split out so several families can share one copy without it
 * becoming a public subpath. Their classes are the component's own styling, so they are evidence
 * for the component that imports them. (Importing another *public* component is composition, which
 * the detector deliberately does not follow; see deriveDensitySupport.)
 */
const INTERNAL = join(PKG, "src/internal");
const internalSourceOf = (source) =>
  [...source.matchAll(/from\s+["']@\/internal\/([a-z0-9-]+)["']/g)]
    .map(([, name]) =>
      [".ts", ".tsx"].map((ext) => join(INTERNAL, `${name}${ext}`)).find((p) => existsSync(p)),
    )
    .filter(Boolean)
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");

// One entry per src/components/<Family>/<slug>.tsx, with its colocated test source so the
// testing contract can be observed rather than declared.
const families = readdirSync(COMPONENTS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const entries = [];
const testSources = new Map();
for (const family of families) {
  const dir = join(COMPONENTS, family);
  for (const file of readdirSync(dir)) {
    if (isComponent(file) && file !== "index.ts") {
      entries.push({ slug: file.replace(/\.tsx$/, ""), category: family });
    }
  }
  const testDir = join(dir, "__tests__");
  if (!existsSync(testDir)) continue;
  for (const file of readdirSync(testDir).sort()) {
    const match = /^(.*)\.test\.tsx?$/.exec(file);
    if (!match) continue;
    // A slug may have both a .test.ts and a .test.tsx suite; treat them as one body of tests.
    const previous = testSources.get(match[1]) ?? "";
    testSources.set(match[1], `${previous}\n${readFileSync(join(testDir, file), "utf8")}`);
  }
}

/**
 * Story files live in the sibling qeetrix-story repo; index their basenames once. Read-only —
 * this build never writes outside the package.
 *
 * The sibling is not part of this package, so its absence must not change the output: it used
 * to flip `story` and `testing.visual` to `false` for every component, which made a *tracked*
 * artifact depend on the checkout topology of the machine that ran the build. When the sibling
 * is missing the last indexed answer is carried forward from the tracked manifest, and the
 * source of the index is reported, so the manifest is reproducible everywhere.
 */
const storySlugs = new Set();
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(dir, e.name));
    else if (e.name.endsWith(".stories.tsx") || e.name.endsWith(".stories.ts"))
      storySlugs.add(e.name.replace(/\.stories\.tsx?$/, "").toLowerCase());
  }
};
let storyIndexSource = "qeetrix-story";
if (existsSync(STORIES)) {
  walk(STORIES);
} else if (tracked) {
  storyIndexSource = "carried forward from component-manifest.json";
  for (const component of tracked.components ?? []) {
    if (component.story) storySlugs.add(component.slug);
  }
} else {
  storyIndexSource = "none";
}

// Components covered by a global harness rather than a colocated suite.
const harnessSlugs = (harness) => {
  const found = new Set();
  const pattern = /@\/components\/[A-Za-z]+\/([a-z0-9-]+)/g;
  let match = pattern.exec(harness);
  while (match !== null) {
    found.add(match[1]);
    match = pattern.exec(harness);
  }
  return found;
};
const globalA11ySlugs = harnessSlugs(read(GLOBAL_A11Y_HARNESS));
const hydrationSlugs = harnessSlugs(read(HYDRATION_HARNESS));

const components = entries
  // Not localeCompare: it is locale-sensitive, and this file's byte order is a tracked artifact.
  .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
  .map(({ slug, category }) => {
    const relativePath = `src/components/${category}/${slug}.tsx`;
    const source = readFileSync(join(PKG, relativePath), "utf8");
    const declared = COMPONENT_REGISTRY[slug] ?? {};
    const test = testSources.get(slug) ?? "";

    const derived = describeComponentSource({
      // The component's own file first: the client directive is read from its head.
      source: `${source}\n${internalSourceOf(source)}`,
      cvaGroups: readCvaVariantGroups(join(PKG, relativePath)),
      stateVocabulary: contracts.INTERACTION_STATES,
      densityAware,
    });

    // Declared capabilities are reviewed overrides; they win over the derived signal.
    const capabilities = { ...derived.capabilities, ...(declared.capabilities ?? {}) };

    // Declared states cover behaviour that leaves no styling fingerprint; union, not override.
    const states = contracts.INTERACTION_STATES.filter((state) =>
      new Set([...derived.states, ...(declared.states ?? [])]).has(state),
    );

    const status = declared.status ?? REGISTRY_DEFAULTS.status;

    const name = componentName(slug, source);
    return {
      slug,
      name,
      // Declared for a module of several exports, else read off the component's doc comment.
      description: declared.description ?? docDescription(source, name),
      category,
      layer: layerOf(relativePath, contracts.LAYER_DIRECTORIES),

      // Schema v1 import surface — unchanged, and stable across category moves.
      import: source.includes("@barrel-exclude") ? `@qeetrix/ui/components/${slug}` : "@qeetrix/ui",
      deepImport: `@qeetrix/ui/components/${slug}`,
      groupImport: `@qeetrix/ui/components/${category}`,

      // Schema v2 — the component contract.
      status,
      capabilities,
      states,
      // The derived cva surface, plus what only a human can declare: which variant names are
      // legacy aliases, which axes use domain names, and the controlled-state triples.
      api: {
        ...derived.api,
        variantAliases: declared.api?.variantAliases ?? null,
        domainAxes: declared.api?.domainAxes ?? null,
        axisSources: declared.api?.axisSources ?? null,
        controlled: declared.api?.controlled ?? null,
      },
      accessibility: accessibilityFor(declared),
      testing: {
        unit: test.length > 0,
        accessibility: /\baxe\(/.test(test) || globalA11ySlugs.has(slug),
        interaction: /user-event|fireEvent/.test(test),
        visual: storySlugs.has(slug),
        hydration: hydrationSlugs.has(slug),
      },
      deprecation: declared.deprecation ?? null,

      // Schema v1 booleans, retained for existing consumers.
      story: storySlugs.has(slug),
      tested: test.length > 0,
      deprecated: status === "deprecated" || derived.deprecatedMarker,
    };
  });

/**
 * Assemble a component's accessibility record.
 *
 * Every dimension is present, defaulting to `not-audited`, and `audit` is *computed* from them —
 * there is no way to declare a component audited, which is the point. A component with one
 * unreviewed dimension is `not-audited`, however many of the others pass.
 */
function accessibilityFor(declared) {
  const declaredA11y = declared.accessibility ?? {};
  const dimensions = Object.fromEntries(
    contracts.A11Y_DIMENSIONS.map((dimension) => [
      dimension,
      declaredA11y.dimensions?.[dimension] ?? "not-audited",
    ]),
  );
  const states = Object.values(dimensions);
  const audit = states.includes("not-audited")
    ? "not-audited"
    : states.includes("exception")
      ? "exception"
      : states.includes("partial")
        ? "partial"
        : "audited";

  return {
    required: declaredA11y.required ?? REGISTRY_DEFAULTS.accessibility.required,
    pattern: declaredA11y.pattern ?? REGISTRY_DEFAULTS.accessibility.pattern,
    audit,
    dimensions,
    keyboard: declaredA11y.keyboard ?? null,
    focus: declaredA11y.focus ?? null,
    liveRegion: declaredA11y.liveRegion ?? null,
    exceptions: declaredA11y.exceptions ?? null,
  };
}

const countBy = (keys, predicate) =>
  Object.fromEntries(keys.map((key) => [key, components.filter((c) => predicate(c, key)).length]));

/**
 * `generated` is the date the catalog last *changed*, not the date this script last ran.
 *
 * A wall-clock stamp made every run non-reproducible: two machines, or the same machine on two
 * days, produced a different tracked file from identical inputs, so "is the committed manifest
 * current?" could not be answered by regenerating and diffing. Holding the tracked date while
 * the content is identical makes that check exact. `QEETRIX_MANIFEST_DATE` pins it outright for
 * hermetic builds.
 */
const withoutDate = (value) => {
  if (!value) return null;
  const { generated: _generated, ...rest } = value;
  return JSON.stringify(rest);
};

const manifest = {
  $schema: "https://qeetrix.qeet.in/manifest.schema.json",
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  name: "@qeetrix/ui",
  version,
  description:
    "Qeet Group design system — accessible, token-driven React components (Base UI + Tailwind v4).",
  generated: "",
  styles: "@qeetrix/ui/styles.css",
  tokens: "@qeetrix/ui/tokens.json",
  count: components.length,
  categories: countBy(families, (c, key) => c.category === key),
  statuses: countBy(contracts.COMPONENT_STATUSES, (c, key) => c.status === key),
  /** Component count per accessibility audit state. */
  accessibilityAudit: countBy(
    contracts.A11Y_AUDIT_STATES,
    (c, key) => c.accessibility.audit === key,
  ),
  components,
};

const unchanged = withoutDate(manifest) === withoutDate(tracked);
manifest.generated =
  process.env.QEETRIX_MANIFEST_DATE ??
  (unchanged && tracked?.generated ? tracked.generated : new Date().toISOString().slice(0, 10));

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

if (CHECK) {
  const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, "utf8") : null;
  if (current === serialized) {
    console.log(
      `✓ component-manifest.json is current and reproducible — ${components.length} components ` +
        `(story index: ${storyIndexSource})`,
    );
    process.exit(0);
  }
  console.error("✗ component-manifest.json is stale — regenerating it produces different bytes.");
  if (current === null) {
    console.error("  the file does not exist");
  } else {
    const before = JSON.parse(current);
    const changed = [];
    for (const key of new Set([...Object.keys(before), ...Object.keys(manifest)])) {
      if (key === "components") continue;
      if (JSON.stringify(before[key]) !== JSON.stringify(manifest[key])) {
        changed.push(`${key}: ${JSON.stringify(before[key])} → ${JSON.stringify(manifest[key])}`);
      }
    }
    const bySlug = new Map((before.components ?? []).map((c) => [c.slug, c]));
    for (const component of components) {
      const previous = bySlug.get(component.slug);
      if (!previous) changed.push(`components.${component.slug}: added`);
      else if (JSON.stringify(previous) !== JSON.stringify(component))
        changed.push(`components.${component.slug}: changed`);
      bySlug.delete(component.slug);
    }
    for (const slug of bySlug.keys()) changed.push(`components.${slug}: removed`);
    for (const line of changed.slice(0, 20)) console.error(`  ${line}`);
    if (changed.length > 20) console.error(`  … and ${changed.length - 20} more`);
  }
  console.error("\nRun `bun run build:manifest` and commit the result.");
  process.exit(1);
}

writeFileSync(OUTPUT, serialized);

const reviewed = components.filter((c) => c.accessibility.pattern !== null).length;
const unknowns = components.reduce(
  (n, c) => n + Object.values(c.capabilities).filter((v) => v === "unknown").length,
  0,
);
console.log(
  `✔ component-manifest.json (schema v${MANIFEST_SCHEMA_VERSION}) — ${components.length} components across ${families.length} families ` +
    `(${components.filter((c) => c.tested).length} tested, ${components.filter((c) => c.story).length} with stories)\n` +
    `  accessibility reviewed: ${reviewed}/${components.length} · unknown capabilities: ${unknowns} · ` +
    `story index: ${storyIndexSource}`,
);
