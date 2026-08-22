/**
 * Ship the non-TS assets alongside the compiled output:
 *  - dist/styles/**      — the CSS entry + generated design tokens (semantic + raw
 *    CSS, JSON), exposed via the ./styles.css, ./qeetrix.css and ./tokens.* exports.
 *  - dist/styles/index.css — the Tailwind v4 entry. @source is rewritten to scan the
 *    COMPILED js (dist has no .tsx), so a consumer's Tailwind picks up the utility
 *    classes used by Qeetrix components.
 *  - dist/fonts/**       — self-hosted Qeet fonts, referenced by @font-face in index.css.
 *  - dist/component-manifest.json — the component catalog (@qeetrix/ui/manifest.json).
 *
 * Every rewrite and every copy is asserted. The @source rewrite in particular is an exact
 * string replacement: if src/styles/index.css is reworded, a silent no-op would ship a
 * stylesheet that scans `.tsx` files the tarball does not contain, and every consumer would
 * lose every utility class Qeetrix components rely on — with no build error anywhere.
 */
import assert from "node:assert/strict";
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Copy a tree and prove it arrived: a silent empty copy is the failure mode worth catching. */
function copyTree(from, to) {
  assert.ok(existsSync(join(ROOT, from)), `postbuild: ${from} does not exist`);
  cpSync(join(ROOT, from), join(ROOT, to), { recursive: true });
  const copied = readdirSync(join(ROOT, to), { recursive: true }).filter((entry) =>
    statSync(join(ROOT, to, entry)).isFile(),
  );
  assert.ok(copied.length > 0, `postbuild: ${to} is empty after copying ${from}`);
  return copied.length;
}

// Styles first (index.css + generated token artifacts), then overwrite the entry
// with its dist-flavoured @source so Tailwind scans the compiled js.
const styles = copyTree("src/styles", "dist/styles");

const SOURCE_DIRECTIVE = '@source "../**/*.{ts,tsx}";';
const DIST_DIRECTIVE = '@source "../**/*.js";';
const source = readFileSync(join(ROOT, "src/styles/index.css"), "utf8");
const occurrences = source.split(SOURCE_DIRECTIVE).length - 1;
assert.equal(
  occurrences,
  1,
  `postbuild: expected exactly one \`${SOURCE_DIRECTIVE}\` in src/styles/index.css, found ` +
    `${occurrences}. The dist stylesheet must scan compiled js; update this rewrite together ` +
    "with the stylesheet.",
);
const css = source.replace(SOURCE_DIRECTIVE, DIST_DIRECTIVE);
writeFileSync(join(ROOT, "dist/styles/index.css"), css);
const written = readFileSync(join(ROOT, "dist/styles/index.css"), "utf8");
assert.ok(written.includes(DIST_DIRECTIVE), "postbuild: dist/styles/index.css lost its @source");
assert.ok(
  !written.includes(SOURCE_DIRECTIVE),
  "postbuild: dist/styles/index.css still scans .tsx sources that are not published",
);

const fonts = copyTree("src/fonts", "dist/fonts");

// The component catalog travels with the package, so docs/MCP consumers can read it
// from node_modules instead of reaching into a checkout.
const manifestSource = join(ROOT, "component-manifest.json");
assert.ok(
  existsSync(manifestSource),
  "postbuild: component-manifest.json is missing — run `bun run build:manifest`",
);
cpSync(manifestSource, join(ROOT, "dist/component-manifest.json"));
assert.equal(
  readFileSync(join(ROOT, "dist/component-manifest.json"), "utf8"),
  readFileSync(manifestSource, "utf8"),
  "postbuild: dist/component-manifest.json does not match the source manifest",
);

console.log(
  `✔ postbuild: dist/styles/index.css (@source → *.js, verified), ${styles} style files, ` +
    `${fonts} font files, component-manifest.json`,
);
