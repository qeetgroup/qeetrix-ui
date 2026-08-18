/**
 * build-manifest.mjs — machine-readable component manifest (Gap 5/6).
 *
 * Emits packages/qeetrix-ui/component-manifest.json: one entry per component with its
 * slug, import path, deep-import path, and whether it has a story/test. AI tools
 * and consumers can read this to discover the component surface without parsing
 * the barrel. Regenerate with `bun run --filter @qeetrix/ui manifest`.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "..");
const UI = join(PKG, "src/components/ui");
const STORIES = join(PKG, "../../apps/qeetrix-story/stories");

const { version } = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));

const pascal = (slug) =>
  slug
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");

const files = readdirSync(UI);
const isComponent = (f) => /\.tsx$/.test(f) && !/\.(test|stories)\.tsx$/.test(f);
const tests = new Set(
  files.filter((f) => /\.test\.tsx$/.test(f)).map((f) => f.replace(/\.test\.tsx$/, "")),
);

// story files live under apps/qeetrix-story/stories/**; index their basenames once.
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

const components = files
  .filter(isComponent)
  .map((f) => f.replace(/\.tsx$/, ""))
  .sort()
  .map((slug) => ({
    slug,
    name: pascal(slug),
    import: "@qeetrix/ui",
    deepImport: `@qeetrix/ui/components/${slug}`,
    story: storySlugs.has(slug),
    tested: tests.has(slug),
  }));

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
  components,
};

writeFileSync(join(PKG, "component-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `✔ component-manifest.json — ${components.length} components ` +
    `(${components.filter((c) => c.tested).length} tested, ${components.filter((c) => c.story).length} with stories)`,
);
