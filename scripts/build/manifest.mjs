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
 *   1. the filesystem + scripts/config/category-map.json — identity, category, layer
 *   2. the component source — capabilities, interaction states, `cva` variants, client
 *      boundary, test coverage (scripts/lib/component-source.mjs)
 *   3. src/manifests/component-registry.ts — the declared facts that cannot be derived:
 *      status, ARIA pattern, reviewed capability overrides, deprecations
 *
 * Anything neither derivable nor declared is emitted as `"unknown"` / `null`. A missing fact
 * and a negative fact are different things.
 *
 * Schema version 2 adds the contract fields; every version-1 field is still emitted, so
 * existing consumers keep working. See docs/standards/component-manifest.md.
 *
 *   node scripts/build/manifest.mjs
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

const isComponent = (f) => /\.tsx$/.test(f) && !/\.(test|stories)\.tsx$/.test(f);
const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : "");

// One entry per src/components/<category>/<slug>.tsx, with its colocated test source so the
// testing contract can be observed rather than declared.
const categories = readdirSync(COMPONENTS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const entries = [];
const testSources = new Map();
for (const category of categories) {
  const dir = join(COMPONENTS, category);
  for (const file of readdirSync(dir)) {
    if (isComponent(file) && file !== "index.ts") {
      entries.push({ slug: file.replace(/\.tsx$/, ""), category });
    }
  }
  const testDir = join(dir, "__tests__");
  if (!existsSync(testDir)) continue;
  for (const file of readdirSync(testDir)) {
    const match = /^(.*)\.test\.tsx?$/.exec(file);
    if (!match) continue;
    // A slug may have both a .test.ts and a .test.tsx suite; treat them as one body of tests.
    const previous = testSources.get(match[1]) ?? "";
    testSources.set(match[1], `${previous}\n${readFileSync(join(testDir, file), "utf8")}`);
  }
}

// Story files live in the sibling qeetrix-story repo; index their basenames once. Read-only —
// this build never writes outside the package.
const storySlugs = new Set();
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(dir, e.name));
    else if (e.name.endsWith(".stories.tsx") || e.name.endsWith(".stories.ts"))
      storySlugs.add(e.name.replace(/\.stories\.tsx?$/, "").toLowerCase());
  }
};
try {
  walk(STORIES);
} catch {
  // stories directory is optional
}

// Components covered by a global harness rather than a colocated suite.
const harnessSlugs = (harness) => {
  const found = new Set();
  const pattern = /@\/components\/[a-z-]+\/([a-z0-9-]+)/g;
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
  .sort((a, b) => a.slug.localeCompare(b.slug))
  .map(({ slug, category }) => {
    const relativePath = `src/components/${category}/${slug}.tsx`;
    const source = readFileSync(join(PKG, relativePath), "utf8");
    const declared = COMPONENT_REGISTRY[slug] ?? {};
    const test = testSources.get(slug) ?? "";

    const derived = describeComponentSource({
      source,
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

    return {
      slug,
      name: pascal(slug),
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
      api: derived.api,
      accessibility: { ...REGISTRY_DEFAULTS.accessibility, ...(declared.accessibility ?? {}) },
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

const countBy = (keys, predicate) =>
  Object.fromEntries(keys.map((key) => [key, components.filter((c) => predicate(c, key)).length]));

const manifest = {
  $schema: "https://qeetrix.qeet.in/manifest.schema.json",
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  name: "@qeetrix/ui",
  version,
  description:
    "Qeet Group design system — accessible, token-driven React components (Base UI + Tailwind v4).",
  generated: new Date().toISOString().slice(0, 10),
  styles: "@qeetrix/ui/styles.css",
  tokens: "@qeetrix/ui/tokens.json",
  count: components.length,
  categories: countBy(categories, (c, key) => c.category === key),
  statuses: countBy(contracts.COMPONENT_STATUSES, (c, key) => c.status === key),
  components,
};

writeFileSync(join(PKG, "component-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const reviewed = components.filter((c) => c.accessibility.pattern !== null).length;
const unknowns = components.reduce(
  (n, c) => n + Object.values(c.capabilities).filter((v) => v === "unknown").length,
  0,
);
console.log(
  `✔ component-manifest.json (schema v${MANIFEST_SCHEMA_VERSION}) — ${components.length} components across ${categories.length} categories ` +
    `(${components.filter((c) => c.tested).length} tested, ${components.filter((c) => c.story).length} with stories)\n` +
    `  accessibility reviewed: ${reviewed}/${components.length} · unknown capabilities: ${unknowns}`,
);
