/**
 * Ship the non-TS assets alongside the compiled output:
 *  - dist/styles/**      — the CSS entry + generated design tokens (semantic + raw
 *    CSS, JSON), exposed via the ./styles.css, ./qeetrix.css and ./tokens.* exports.
 *  - dist/styles/index.css — the Tailwind v4 entry. @source is rewritten to scan the
 *    COMPILED js (dist has no .tsx), so a consumer's Tailwind picks up the utility
 *    classes used by Qeetrix components.
 *  - dist/fonts/**       — self-hosted Qeet fonts, referenced by @font-face in index.css.
 *  - dist/component-manifest.json — the component catalog (@qeetrix/ui/manifest.json).
 */
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

// Styles first (index.css + generated token artifacts), then overwrite the entry
// with its dist-flavoured @source so Tailwind scans the compiled js.
cpSync(join(ROOT, "src/styles"), join(ROOT, "dist/styles"), { recursive: true });
const css = readFileSync(join(ROOT, "src/styles/index.css"), "utf8").replace(
  '@source "../**/*.{ts,tsx}";',
  '@source "../**/*.js";',
);
writeFileSync(join(ROOT, "dist/styles/index.css"), css);
cpSync(join(ROOT, "src/fonts"), join(ROOT, "dist/fonts"), { recursive: true });
// The component catalog travels with the package, so docs/MCP consumers can read it
// from node_modules instead of reaching into a checkout.
cpSync(join(ROOT, "component-manifest.json"), join(ROOT, "dist/component-manifest.json"));

console.log(
  "✔ postbuild: wrote dist/styles/index.css (@source → *.js), copied dist/fonts + dist/styles",
);
