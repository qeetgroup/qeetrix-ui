/**
 * build-manifest.mjs — machine-readable component manifest (Gap 5/6).
 *
 * Emits component-manifest.json: one entry per component with its category,
 * slug, import path, deep-import path, and whether it has a story/test. AI tools
 * and consumers can read this to discover the component surface without parsing
 * the barrel. Regenerate with `bun run build:manifest`.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "../..");
const COMPONENTS = join(PKG, "src/components");
const STORIES = join(PKG, "../qeetrix-story/stories");

const { version } = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));

const pascal = (slug) =>
  slug
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");

const isComponent = (f) => /\.tsx$/.test(f) && !/\.(test|stories)\.tsx$/.test(f);

// One entry per src/components/<category>/<slug>.tsx, with its per-category tests.
const categories = readdirSync(COMPONENTS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const entries = [];
const tests = new Set();
for (const category of categories) {
  const dir = join(COMPONENTS, category);
  for (const file of readdirSync(dir)) {
    if (isComponent(file) && file !== "index.ts") {
      entries.push({ slug: file.replace(/\.tsx$/, ""), category });
    }
  }
  const testDir = join(dir, "__tests__");
  if (existsSync(testDir)) {
    for (const file of readdirSync(testDir)) {
      if (/\.test\.tsx?$/.test(file)) tests.add(file.replace(/\.test\.tsx?$/, ""));
    }
  }
}

// story files live in the sibling qeetrix-story repo; index their basenames once.
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

const components = entries
  .sort((a, b) => a.slug.localeCompare(b.slug))
  .map(({ slug, category }) => {
    const source = readFileSync(join(COMPONENTS, category, `${slug}.tsx`), "utf8");
    return {
      slug,
      name: pascal(slug),
      category,
      import: source.includes("@barrel-exclude") ? `@qeetrix/ui/components/${slug}` : "@qeetrix/ui",
      deepImport: `@qeetrix/ui/components/${slug}`,
      groupImport: `@qeetrix/ui/components/${category}`,
      story: storySlugs.has(slug),
      tested: tests.has(slug),
      deprecated: source.includes("@deprecated"),
    };
  });

const manifest = {
  $schema: "https://qeetrix.qeet.in/manifest.schema.json",
  name: "@qeetrix/ui",
  version,
  description:
    "Qeet Group design system — accessible, token-driven React components (Base UI + Tailwind v4).",
  generated: new Date().toISOString().slice(0, 10),
  styles: "@qeetrix/ui/styles.css",
  tokens: "@qeetrix/ui/tokens.json",
  count: components.length,
  categories: Object.fromEntries(
    categories.map((c) => [c, components.filter((x) => x.category === c).length]),
  ),
  components,
};

writeFileSync(join(PKG, "component-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `✔ component-manifest.json — ${components.length} components across ${categories.length} categories ` +
    `(${components.filter((c) => c.tested).length} tested, ${components.filter((c) => c.story).length} with stories)`,
);
