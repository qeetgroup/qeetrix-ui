/**
 * architecture.mjs — structural invariants for src/.
 *
 * The category layout only stays coherent if it is enforced. This gate checks:
 *   1. category-map.json and the filesystem agree (no orphans, no phantoms)
 *   2. every component is re-exported by its category barrel, unless the file is
 *      marked `@barrel-exclude`
 *   3. no module inside src/ imports a barrel (`@/components`, `@/components/<cat>`)
 *      or the root entry — barrel imports create cycles and defeat tree-shaking
 *   4. cross-category imports go through the `@/` alias — checked against the *resolved*
 *      file, so `../inputs/input`, `../../components/inputs/input` and every deeper form are
 *      the same finding rather than the one shape a regex happened to name
 *   5. filenames are kebab-case; every test sits in a __tests__/ folder next to a
 *      component of the same name
 *   6. a `"use client"` directive, where one exists, is the first statement in the file
 *   7. **layer boundaries** — every module belongs to a layer (src/contracts/layers.ts) and
 *      may only import from the layers its own layer is allowed to reach. Deny by default, so
 *      `tokens → components`, `components → blocks`, `primitives → blocks` and
 *      `runtime → components` hold without being listed one by one — including for the layers
 *      the target architecture reserves but has not populated yet.
 *   8. the rule set itself is coherent — acyclic, and transitively closed, so a chain of
 *      individually legal imports can never add up to an illegal dependency
 *   9. **non-TypeScript production inputs** — a `.css` or `.json` file is a node in the graph
 *      like any other, and importing one is governed by LAYER_ALLOWED_ASSET_DEPENDENCIES.
 *      Deny by default: a stylesheet is a side effect and a raw token file bypasses the CSS
 *      bridge, so neither is something a component may pull in unreviewed
 *
 * Imports are resolved to real files with TypeScript's own dependency scanner and the
 * tsconfig `@/*` alias, so re-exports, type-only imports and dynamic `import()` are all seen
 * and nothing is matched by substring. Path decisions go through `basename`/`sep`, so the
 * per-file rules do not quietly stop testing anything on a platform where the separator is not
 * `/` (they did: `path.split("/")` returned the whole path, and every rule that read a segment
 * out of it passed by accident).
 *
 *   node scripts/check/architecture.mjs
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildModuleGraph,
  findAssetDependencyViolations,
  findDeepLayerViolations,
  findLayerViolations,
  findRelativeEscapes,
  findRuleSetProblems,
} from "../lib/layers.mjs";
import { findClientDirectiveIndex, readLiteralExportsFromDirectory } from "../lib/ts-literals.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const COMPONENTS = join(ROOT, "src/components");
const categoryMap = JSON.parse(
  readFileSync(join(ROOT, "scripts/config/category-map.json"), "utf8"),
);

const problems = [];
const fail = (file, message) => problems.push({ file: relative(ROOT, file), message });

const isComponentFile = (f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx");
const categories = readdirSync(COMPONENTS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

// 1. map ↔ filesystem
for (const category of categories) {
  if (!categoryMap[category])
    fail(join(COMPONENTS, category), "category is missing from category-map.json");
}
for (const category of Object.keys(categoryMap)) {
  if (!categories.includes(category))
    fail(COMPONENTS, `category-map.json lists "${category}" but the folder does not exist`);
}

const slugsOnDisk = new Map();
for (const category of categories) {
  const dir = join(COMPONENTS, category);
  const slugs = readdirSync(dir)
    .filter(isComponentFile)
    .map((f) => f.replace(/\.tsx$/, ""));
  slugsOnDisk.set(category, slugs);
  const mapped = new Set(categoryMap[category] ?? []);
  for (const slug of slugs) {
    if (!mapped.has(slug))
      fail(join(dir, `${slug}.tsx`), `not listed under "${category}" in category-map.json`);
  }
  for (const slug of mapped) {
    if (!slugs.includes(slug))
      fail(join(dir, `${slug}.tsx`), "listed in category-map.json but the file is missing");
  }
}

// 2. barrel completeness
for (const category of categories) {
  const barrelPath = join(COMPONENTS, category, "index.ts");
  if (!existsSync(barrelPath)) {
    fail(barrelPath, "category barrel is missing");
    continue;
  }
  const barrel = readFileSync(barrelPath, "utf8");
  for (const slug of slugsOnDisk.get(category) ?? []) {
    const source = readFileSync(join(COMPONENTS, category, `${slug}.tsx`), "utf8");
    const excluded = source.includes("@barrel-exclude");
    const exported = new RegExp(`from "\\./${slug}"`).test(barrel);
    if (!exported && !excluded)
      fail(
        join(COMPONENTS, category, `${slug}.tsx`),
        `not re-exported by ${category}/index.ts (add it, or mark the file @barrel-exclude)`,
      );
    if (exported && excluded)
      fail(barrelPath, `re-exports ${slug}, which is marked @barrel-exclude`);
  }
}

// 3–6. per-file rules across src/
const BARREL_IMPORT = /from "(@\/components|@\/components\/[a-z-]+|@\/index|@\/)"/;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield path;
  }
}

for (const path of walk(join(ROOT, "src"))) {
  // `join` produces the platform separator, so every path decision below goes through
  // `basename`/`sep` rather than assuming "/". Splitting on "/" on Windows put the whole path
  // in `name`, which silently turned the kebab-case and test-location rules into no-ops.
  const name = basename(path);
  const base = name.replace(/\.(test\.)?(ts|tsx)$/, "").replace(/\.d$/, "");
  const source = readFileSync(path, "utf8");
  const segments = path.split(sep);
  const inTests = segments.includes("__tests__");

  if (BARREL_IMPORT.test(source))
    fail(
      path,
      "imports a barrel — import the component file directly (@/components/<category>/<slug>)",
    );
  if (!KEBAB.test(base)) fail(path, "filename is not kebab-case");
  // Parsed, not string-matched: the phrase in a doc comment is not a directive.
  if (!inTests && findClientDirectiveIndex(path) > 0) {
    fail(path, '"use client" must be the first statement in the file');
  }
  if (/\.test\.tsx?$/.test(name) && !inTests)
    fail(path, "test file must live in a __tests__/ folder");
  if (inTests && /\.test\.tsx?$/.test(name)) {
    const category = segments.at(-3);
    const slug = name.replace(/\.test\.tsx?$/, "");
    const componentDir = dirname(dirname(path));
    if (categories.includes(category) && !existsSync(join(componentDir, `${slug}.tsx`))) {
      fail(path, `has no matching component ${category}/${slug}.tsx`);
    }
  }
}

// 7–8. layer boundaries. The rules live in src/contracts/layers.ts and are read statically
// so this script and `tsc` enforce the same table.
const contracts = readLiteralExportsFromDirectory(join(ROOT, "src/contracts"));
const allowed = contracts.LAYER_ALLOWED_DEPENDENCIES;
const allowedAssets = contracts.LAYER_ALLOWED_ASSET_DEPENDENCIES ?? {};
const layerDirectories = contracts.LAYER_DIRECTORIES;
const explanations = contracts.LAYER_RULE_EXPLANATIONS ?? {};

const ruleProblems = findRuleSetProblems(allowed);
const { modules, unmapped, unresolved } = buildModuleGraph({ root: ROOT, layerDirectories });

for (const file of unmapped) {
  fail(
    join(ROOT, file),
    "no layer claims this file — add its directory to LAYER_DIRECTORIES in src/contracts/layers.ts",
  );
}
for (const { file, specifier } of unresolved) {
  fail(join(ROOT, file), `imports "${specifier}", which resolves to no file under src/`);
}

const layerViolations = findLayerViolations({ modules, allowed, explanations });
// Only report a chain when its last edge is not already reported on its own — otherwise every
// consumer of a bad import repeats the same finding.
const reportedEdges = new Set(
  layerViolations.map((violation) => `${violation.file}->${violation.dependency}`),
);
const deepViolations = findDeepLayerViolations({ modules, allowed }).filter((violation) => {
  const chain = violation.path;
  return !reportedEdges.has(`${chain[chain.length - 2]}->${chain[chain.length - 1]}`);
});

// 4 + 9. The two rules that need the resolved graph rather than the specifier text: a relative
// import's canonical destination, and a dependency on a non-TypeScript production input.
const relativeEscapes = findRelativeEscapes({ modules });
const assetViolations = findAssetDependencyViolations({ modules, allowedAssets });

for (const leak of relativeEscapes) {
  fail(
    join(ROOT, leak.file),
    `imports "${leak.specifier}" → ${leak.dependency ?? "(unresolved)"} — ${leak.rule}`,
  );
}
for (const violation of assetViolations) {
  fail(
    join(ROOT, violation.file),
    `imports the ${violation.targetLayer} asset ${violation.dependency} — ${violation.rule}`,
  );
}

const layerFindings = layerViolations.length + deepViolations.length + ruleProblems.length;

for (const problem of ruleProblems) {
  console.error(`\nArchitecture rule-set problem\n\n  ${problem.message}\n`);
}
for (const violation of layerViolations) {
  console.error(
    [
      "\nArchitecture violation",
      "",
      "Source:",
      `  ${violation.file}`,
      "",
      "Dependency:",
      `  ${violation.dependency ?? "(none)"}`,
      "",
      "Rule:",
      `  ${violation.rule}`,
      "",
    ].join("\n"),
  );
}
for (const violation of deepViolations) {
  console.error(
    [
      "\nArchitecture violation (transitive)",
      "",
      "Source:",
      `  ${violation.file}`,
      "",
      "Chain:",
      ...violation.path.map((step, i) => `  ${i === 0 ? "" : "→ "}${step}`),
      "",
      "Rule:",
      `  ${violation.sourceLayer} cannot reach ${violation.targetLayer}`,
      "",
    ].join("\n"),
  );
}

if (problems.length) {
  console.error(`✗ ${problems.length} architecture violation(s):\n`);
  for (const { file, message } of problems) console.error(`  ${file}\n    ${message}`);
}
if (problems.length || layerFindings) process.exit(1);

const total = [...slugsOnDisk.values()].reduce((n, s) => n + s.length, 0);
const nodes = [...modules.values()];
const shipped = nodes.filter((node) => !node.test && !node.asset).length;
const assets = nodes.filter((node) => node.asset && !node.test).length;
console.log(
  `✓ architecture — ${total} components across ${categories.length} categories, barrels complete, no barrel imports.\n` +
    `✓ layers — ${shipped} modules across ${Object.keys(allowed).length} layers, ` +
    `${nodes.length - shipped - assets} test modules exempt; ` +
    "dependency rules acyclic, transitively closed, no violations.\n" +
    `✓ assets — ${assets} non-TypeScript production inputs in the graph, ` +
    "no ungoverned stylesheet or token-file dependency, no relative import leaving its own directory.",
);
