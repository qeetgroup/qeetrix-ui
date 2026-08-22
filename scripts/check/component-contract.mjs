/**
 * component-contract.mjs — the component-contract gate.
 *
 * Validates `component-manifest.json` — the artifact consumers read — against the contract
 * authored in src/contracts/ and the declarations in src/manifests/component-registry.ts, and
 * cross-checks both against scripts/config/category-map.json.
 *
 * What it catches:
 *   - an invalid status, category, layer, ARIA pattern, capability or interaction state
 *   - a name that does not match its slug, or a duplicate slug/name registration
 *   - a component with metadata but no source, or source but no metadata
 *   - `accessibility.required` without a pattern (and a pattern without `required`)
 *   - a deprecated component with no replacement/migration record, or the reverse
 *   - a stale manifest: wrong schema version, wrong counts, legacy flags out of step
 *
 * Naming drift (a `cva` group that duplicates the `variant`/`size` axes under another name) is
 * reported as a warning and never fails the gate — Phase 1 does not break what already shipped.
 *
 *   node scripts/check/component-contract.mjs
 *   node scripts/check/component-contract.mjs --verbose   # also list the review backlog
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatFinding, validateManifest } from "../lib/contract.mjs";
import { readLiteralExports, readLiteralExportsFromDirectory } from "../lib/ts-literals.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const VERBOSE = process.argv.includes("--verbose");
const readJson = (path) => JSON.parse(readFileSync(join(ROOT, path), "utf8"));

const manifest = readJson("component-manifest.json");
const coverageBaseline = readJson("scripts/config/contract-coverage-baseline.json");
const categoryMap = readJson("scripts/config/category-map.json");
const vocabulary = readLiteralExportsFromDirectory(join(ROOT, "src/contracts"));
const { COMPONENT_REGISTRY, REGISTRY_DEFAULTS } = readLiteralExports(
  join(ROOT, "src/manifests/component-registry.ts"),
);
const { MANIFEST_SCHEMA_VERSION } = readLiteralExports(
  join(ROOT, "src/manifests/component-manifest.ts"),
);

const { errors, warnings } = validateManifest({
  manifest,
  vocabulary,
  registry: COMPONENT_REGISTRY,
  registryDefaults: REGISTRY_DEFAULTS,
  categoryMap,
  schemaVersion: MANIFEST_SCHEMA_VERSION,
});

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
