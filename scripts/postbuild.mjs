/**
 * Ship the non-TS assets alongside the compiled output:
 *  - dist/index.css  — the Tailwind v4 entry. @source is rewritten to scan the
 *    COMPILED js (dist has no .tsx), so a consumer's Tailwind picks up the
 *    utility classes used by Qeetrix components.
 *  - dist/fonts/**   — self-hosted Qeet fonts, referenced by @font-face in index.css.
 *  - dist/styles/**  — generated design tokens (semantic + raw CSS, JSON), imported
 *    by index.css and exposed via the ./qeetrix.css / ./tokens.* subpath exports.
 */
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const css = readFileSync(join(ROOT, "src/index.css"), "utf8").replace(
  '@source "./**/*.{ts,tsx}";',
  '@source "./**/*.js";',
);
writeFileSync(join(ROOT, "dist/index.css"), css);
cpSync(join(ROOT, "src/fonts"), join(ROOT, "dist/fonts"), { recursive: true });
// Generated token artifacts — the relative @import in index.css and the
// ./qeetrix.css / ./tokens.* subpath exports resolve from dist/styles.
cpSync(join(ROOT, "src/styles"), join(ROOT, "dist/styles"), { recursive: true });

// Remove the Style Dictionary scratch dir — its fragments have already been
// stitched into src/styles (and copied to dist/styles). It is not a build
// output. NB: validate-tokens reads build/ for the brand-overlay contrast gate,
// but that flow doesn't run postbuild, so this only fires on the publish build.
rmSync(join(ROOT, "build"), { recursive: true, force: true });

console.log(
  "✔ postbuild: wrote dist/index.css (@source → *.js), copied dist/fonts + dist/styles, removed build/",
);
