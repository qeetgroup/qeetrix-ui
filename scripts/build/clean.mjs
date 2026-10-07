/**
 * clean.mjs — remove build output and generated source artifacts.
 *
 * Replaces `rm -rf`: the package declares `engines.node >= 20` and nothing else, so a build
 * step that needs a POSIX shell is a portability claim the manifest does not make. Node's
 * `rm` covers Windows, macOS and Linux identically.
 *
 * Deletes exactly what a generator recreates — never a hand-authored file. `src/styles/index.css`
 * is hand-authored and versioned; the token artifacts next to it are not.
 *
 *   node scripts/build/clean.mjs
 */
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Generated, git-ignored, and recreated by `bun run build`. */
const TARGETS = [
  "dist",
  "node_modules/.cache/qeetrix",
  "src/styles/tokens.css",
  "src/styles/tokens.raw.css",
  "src/styles/tokens.json",
  "src/lib/token-values.ts",
];

for (const target of TARGETS) {
  rmSync(join(ROOT, target), { recursive: true, force: true });
}

console.log(`✔ clean: removed ${TARGETS.length} generated paths`);
