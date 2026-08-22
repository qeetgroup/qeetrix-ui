/**
 * component-contract.mjs — the component-contract gate.
 *
 * Validates `component-manifest.json` — the artifact consumers read — against the contract
 * authored in src/contracts/ and the declarations in src/manifests/component-registry.ts, and
 * cross-checks both against scripts/config/component-map.json.
 *
 * What it catches:
 *   - an invalid status, category, layer, ARIA pattern, capability or interaction state
 *   - a name that does not match its slug, or a duplicate slug/name registration
 *   - a component with metadata but no source, or source but no metadata
 *   - `accessibility.required` without a pattern (and a pattern without `required`)
 *   - a deprecated component with no replacement/migration record, or the reverse
 *   - a stale manifest: wrong schema version, wrong counts, legacy flags out of step
 *   - a density applicability value with no per-slug review behind it (DENSITY-001)
 *
 * Naming drift (a `cva` group that duplicates the `variant`/`size` axes under another name) is
 * reported as a warning and never fails the gate — Phase 1 does not break what already shipped.
 *
 *   node scripts/check/component-contract.mjs
 *   node scripts/check/component-contract.mjs --verbose   # also list the review backlog
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describeComponentSource } from "../lib/component-source.mjs";
import { formatFinding, validateManifest } from "../lib/contract.mjs";
import { densityAwareVariables, loadTokenGraph } from "../lib/tokens.mjs";
import {
  readLiteralExports,
  readLiteralExportsFromDirectory,
  readPropAxes,
} from "../lib/ts-literals.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const VERBOSE = process.argv.includes("--verbose");
const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

const manifest = readJson("component-manifest.json");
const coverageBaseline = readJson("scripts/config/contract-coverage-baseline.json");
const componentMap = readJson("scripts/config/component-map.json");
const densityApplicability = readJson("scripts/config/density-applicability.json");
const vocabulary = readLiteralExportsFromDirectory(join(ROOT, "src/contracts"));
const { COMPONENT_REGISTRY, REGISTRY_DEFAULTS } = readLiteralExports(
  join(ROOT, "src/manifests/component-registry.ts"),
);
const {
  MANIFEST_SCHEMA_VERSION,
  MANIFEST_DOCUMENT_FIELDS,
  MANIFEST_ENTRY_FIELDS,
  MANIFEST_API_FIELDS,
} = readLiteralExports(join(ROOT, "src/manifests/component-manifest.ts"));
const { version: packageVersion } = readJson("package.json");

/**
 * Re-derive the testing claims and the public axis props from source (MAN-001, CVA-001).
 *
 * The generator derives both, and until now nothing checked that the tracked artifact still
 * agreed with what it was derived from — so a claim could outlive its assertion. These are the
 * same rules as the generator's, applied independently: if the two ever disagree, one of them is
 * wrong and the gate says so rather than picking a winner.
 */
const AXE = /\baxe\s*\(|\bexpectNoA11yViolations\s*\(|toHaveNoViolations/;
const INTERACTION = /user-event|userEvent|fireEvent/;

const harnessSlugs = (path) => {
  const found = new Set();
  if (!existsSync(join(ROOT, path))) return found;
  const source = readFileSync(join(ROOT, path), "utf8");
  for (const match of source.matchAll(/@\/components\/[a-z-]+\/([a-z0-9-]+)/g)) found.add(match[1]);
  return found;
};
const globalA11ySlugs = harnessSlugs("src/__tests__/a11y.test.tsx");
const hydrationSlugs = harnessSlugs("src/__tests__/hydration.test.tsx");

const suiteSources = new Map();
for (const category of Object.keys(componentMap)) {
  const dir = join(ROOT, "src/components", category, "__tests__");
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).sort()) {
    if (!/\.test\.tsx?$/.test(file)) continue;
    const slug = file.replace(/\.test\.tsx?$/, "");
    suiteSources.set(
      slug,
      `${suiteSources.get(slug) ?? ""}\n${readFileSync(join(dir, file), "utf8")}`,
    );
  }
}

const testEvidence = {};
const propAxes = {};
for (const entry of manifest.components) {
  const suite = suiteSources.get(entry.slug) ?? "";
  testEvidence[entry.slug] = {
    unit: suite.length > 0,
    accessibility: AXE.test(suite) || globalA11ySlugs.has(entry.slug),
    interaction: INTERACTION.test(suite),
    hydration: hydrationSlugs.has(entry.slug),
  };
  const path = join(ROOT, "src/components", entry.category, `${entry.slug}.tsx`);
  if (existsSync(path)) propAxes[entry.slug] = readPropAxes(path, vocabulary.AXIS_PROP_NAMES);
}

const { errors, warnings } = validateManifest({
  manifest,
  vocabulary,
  registry: COMPONENT_REGISTRY,
  registryDefaults: REGISTRY_DEFAULTS,
  componentMap,
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  schemaFields: {
    document: MANIFEST_DOCUMENT_FIELDS,
    entry: MANIFEST_ENTRY_FIELDS,
    api: MANIFEST_API_FIELDS,
  },
  packageVersion,
  testEvidence,
  propAxes,
});

/**
 * Re-derive density from source, so a reviewed declaration cannot outlive its reason.
 *
 * A registry declaration wins over the derived signal. That is the point — source inspection
 * cannot decide that density is irrelevant to a component — but it cuts the other way too: once
 * `capabilities.density: "unsupported"` is written down, the day somebody makes the component read
 * `--qx-control-height` the manifest keeps saying `unsupported` and nobody finds out. 78 families
 * carry that declaration, so the hole is 78 wide.
 *
 * The rule is one-directional on purpose. Derivation proving `supported` beats any declaration and
 * the declaration has to go; derivation *failing* to prove it says nothing, because the whole
 * reason the declaration exists is that composition and design intent are invisible from one file.
 */
const densityAware = densityAwareVariables(loadTokenGraph({ root: ROOT }));
for (const entry of manifest.components) {
  const path = join(ROOT, "src/components", entry.category, `${entry.slug}.tsx`);
  if (!existsSync(path)) continue;
  const derived = describeComponentSource({
    source: readFileSync(path, "utf8"),
    cvaGroups: null,
    stateVocabulary: [],
    densityAware,
  }).capabilities.density;
  if (derived === "supported" && entry.capabilities.density !== "supported") {
    errors.push({
      component: entry.slug,
      issue:
        "the source reads a density metric, but capabilities.density is " +
        `"${entry.capabilities.density}"`,
      expected: "no capabilities.density declaration — derivation now proves `supported`",
      hint: "a declaration wins over derivation, so this one is hiding the metric it now reads",
      location: "src/manifests/component-registry.ts",
    });
  }
}

/**
 * Density applicability: every slug, the value, and the evidence behind it (DENSITY-001).
 *
 * The aggregate `unknownCapabilities` ratchet below cannot see a swap — one component losing
 * density support while another gains it leaves the count unchanged — and it cannot see a
 * component talked out of `unknown` into `not-applicable` at all, which is the direction the
 * original defect went in: 125 of 145 families asserted "density would change nothing here" by
 * derivation, and the count read zero.
 *
 * So the snapshot is per-slug and carries the reason. `supported` may be derived; everything
 * else has to be declared in the registry *and* written down here with the metric it hardcodes
 * or the reason it has none. A value with an empty note is the defect, restated.
 */
const applicability = densityApplicability.components ?? {};
const derivableDensity = new Set(vocabulary.DERIVABLE_DENSITY_APPLICABILITY ?? []);
for (const entry of manifest.components) {
  const recorded = applicability[entry.slug];
  const actual = entry.capabilities.density;
  if (recorded === undefined) {
    errors.push({
      component: entry.slug,
      issue: `capabilities.density is "${actual}" with no entry in the applicability snapshot`,
      expected: "an entry in scripts/config/density-applicability.json",
      hint: "every component's density value is reviewed and its reason recorded",
      location: "scripts/config/density-applicability.json",
    });
    continue;
  }
  if (recorded.density !== actual) {
    errors.push({
      component: entry.slug,
      issue:
        `the applicability snapshot says density is "${recorded.density}", ` +
        `the manifest says "${actual}"`,
      expected: "the two to agree",
      hint: "re-review the component, then update the snapshot and the registry together",
      location: "scripts/config/density-applicability.json",
    });
  }
  if (typeof recorded.evidence !== "string" || recorded.evidence.trim().length === 0) {
    errors.push({
      component: entry.slug,
      issue: `density is "${actual}" with no evidence recorded`,
      expected: "a non-empty `evidence` note naming the metric, or the reason there is none",
      hint: 'for "unknown" the note says what would settle it',
      location: "scripts/config/density-applicability.json",
    });
  }
}
for (const slug of Object.keys(applicability)) {
  if (!manifest.components.some((entry) => entry.slug === slug)) {
    errors.push({
      component: slug,
      issue: "the applicability snapshot names a component that no longer exists",
      expected: "a slug in component-manifest.json",
      location: "scripts/config/density-applicability.json",
    });
  }
}
// The vocabulary check the snapshot needs on its own account: a typo in a hand-edited value
// would otherwise only surface as a mismatch against whatever the manifest happened to say.
for (const [slug, recorded] of Object.entries(applicability)) {
  if (!(vocabulary.DENSITY_APPLICABILITY ?? []).includes(recorded.density)) {
    errors.push({
      component: slug,
      issue: `"${recorded.density}" is not a density applicability value`,
      expected: (vocabulary.DENSITY_APPLICABILITY ?? []).join(" | "),
      location: "scripts/config/density-applicability.json",
    });
  }
  if (derivableDensity.size === 0 || derivableDensity.has(recorded.density)) continue;
  if (!COMPONENT_REGISTRY[slug]?.capabilities?.density) {
    errors.push({
      component: slug,
      issue: `the snapshot records "${recorded.density}" with no registry declaration`,
      expected: "capabilities.density in src/manifests/component-registry.ts",
      hint: `derivation may only produce ${[...derivableDensity].join(" or ")}`,
      location: "src/manifests/component-registry.ts",
    });
  }
}

for (const warning of warnings) console.warn(`\n${formatFinding(warning, "Warning")}\n`);

if (errors.length > 0) {
  for (const error of errors) console.error(`\n${formatFinding(error, "Error")}\n`);
  console.error(
    `✗ ${errors.length} contract violation(s). ` +
      "Declarations live in src/manifests/component-registry.ts; regenerate the manifest with " +
      "`node scripts/build/manifest.mjs`.",
  );
  process.exit(1);
}

// Coverage, so the review backlog is visible on every run rather than only when it fails.
const components = manifest.components;
const capabilityKeys = ["rtl", "darkMode", "density", "ssr", "reducedMotion"];
const unknown = (key) => components.filter((c) => c.capabilities[key] === "unknown");
const reviewed = components.filter((c) => c.accessibility.pattern !== null);
const declared = Object.keys(COMPONENT_REGISTRY).length;

// The ratchet: coverage may improve, never regress. Without it, "145/145 reviewed" is a fact
// about today rather than a property of the library.
const coverage = {
  unreviewedAccessibility: components.length - reviewed.length,
  unknownCapabilities: components.reduce(
    (n, c) => n + Object.values(c.capabilities).filter((v) => v === "unknown").length,
    0,
  ),
};
const regressions = Object.entries(coverage).filter(
  ([key, actual]) => actual > (coverageBaseline[key] ?? Number.POSITIVE_INFINITY),
);
if (regressions.length > 0) {
  for (const [key, actual] of regressions) {
    console.error(
      `\n✗ contract coverage regressed — ${key} is ${actual}, baseline is ${coverageBaseline[key]}.` +
        "\n  Resolve it in src/manifests/component-registry.ts, or lower the baseline deliberately" +
        " in scripts/config/contract-coverage-baseline.json.",
    );
  }
  process.exit(1);
}
for (const [key, actual] of Object.entries(coverage)) {
  if (actual < (coverageBaseline[key] ?? 0)) {
    console.warn(
      `⚠  ${key} improved to ${actual} (baseline ${coverageBaseline[key]}) — tighten the baseline` +
        " in scripts/config/contract-coverage-baseline.json.",
    );
  }
}

console.log(
  `✓ component contract — ${components.length} components valid ` +
    `(${declared} declared, ${components.length - declared} on registry defaults` +
    `${warnings.length > 0 ? `, ${warnings.length} convention warning(s)` : ""}).`,
);
console.log(
  `  accessibility reviewed ${reviewed.length}/${components.length} · ` +
    capabilityKeys
      .map((key) => `${key} unknown ${unknown(key).length}`)
      .filter((line) => !line.endsWith(" 0"))
      .join(" · "),
);

if (VERBOSE) {
  for (const key of capabilityKeys) {
    const backlog = unknown(key);
    if (backlog.length > 0) {
      console.log(`\n  ${key} — unreviewed (${backlog.length}):`);
      console.log(`    ${backlog.map((c) => c.slug).join(", ")}`);
    }
  }
  const unreviewed = components.filter((c) => c.accessibility.pattern === null);
  if (unreviewed.length > 0) {
    console.log(`\n  accessibility — unreviewed (${unreviewed.length}):`);
    console.log(`    ${unreviewed.map((c) => c.slug).join(", ")}`);
  }

  // Convergence report on the control size scale — informational, never a gate. Layout
  // components legitimately size on a different axis.
  const scale = new Set(vocabulary.RECOMMENDED_SIZE_SCALE ?? []);
  const offScale = components
    .filter((c) => (c.api.sizes ?? []).some((size) => !scale.has(size)))
    .map((c) => `${c.slug} (${(c.api.sizes ?? []).filter((s) => !scale.has(s)).join(", ")})`);
  if (offScale.length > 0) {
    console.log(`\n  size axes outside the recommended control scale (${offScale.length}):`);
    console.log(`    ${offScale.join(" · ")}`);
  }
}
