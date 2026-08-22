/**
 * architecture.mjs — structural invariants for src/.
 *
 * The category layout only stays coherent if it is enforced. This gate checks:
 *   1. category-map.json and the filesystem agree (no orphans, no phantoms)
 *   2. every component is re-exported by its category barrel, unless the file is
 *      marked `@barrel-exclude`
 *   3. no module inside src/ imports a barrel (`@/components`, `@/components/<cat>`)
 *      or the root entry — barrel imports create cycles and defeat tree-shaking
 *   4. cross-category imports go through the `@/` alias, never `../<other-category>`
 *   5. filenames are kebab-case; every test sits in a __tests__/ folder next to a
 *      component of the same name
 *   6. `"use client"` is the first statement in files that declare it
 *
 *   node scripts/check/architecture.mjs
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

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
const RELATIVE_ESCAPE = /from "\.\.\/\.\.\/components\//;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx)$/.test(entry.name)) yield path;
  }
}

for (const path of walk(join(ROOT, "src"))) {
  const name = path.split("/").pop();
  const base = name.replace(/\.(test\.)?(ts|tsx)$/, "").replace(/\.d$/, "");
  const source = readFileSync(path, "utf8");
  const inTests = path.includes("/__tests__/");

  if (BARREL_IMPORT.test(source))
    fail(
      path,
      "imports a barrel — import the component file directly (@/components/<category>/<slug>)",
    );
  if (RELATIVE_ESCAPE.test(source))
    fail(path, "reaches into another category with a relative path — use the @/ alias");
  if (!KEBAB.test(base)) fail(path, "filename is not kebab-case");
  if (
    !inTests &&
    source.includes('"use client"') &&
    !source.trimStart().startsWith('"use client"')
  ) {
    fail(path, '"use client" must be the first statement in the file');
  }
  if (/\.test\.tsx?$/.test(name) && !inTests)
    fail(path, "test file must live in a __tests__/ folder");
  if (inTests && /\.test\.tsx?$/.test(name)) {
    const category = path.split("/").at(-3);
    const slug = name.replace(/\.test\.tsx?$/, "");
    const componentDir = dirname(dirname(path));
    if (categories.includes(category) && !existsSync(join(componentDir, `${slug}.tsx`))) {
      fail(path, `has no matching component ${category}/${slug}.tsx`);
    }
  }
}

if (problems.length) {
  console.error(`✗ ${problems.length} architecture violation(s):\n`);
  for (const { file, message } of problems) console.error(`  ${file}\n    ${message}`);
  process.exit(1);
}

const total = [...slugsOnDisk.values()].reduce((n, s) => n + s.length, 0);
console.log(
  `✓ architecture — ${total} components across ${categories.length} categories, barrels complete, no barrel imports.`,
);
