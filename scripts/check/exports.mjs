/**
 * exports.mjs — the public API lock.
 *
 * Enumerates every value/type exported from each published entry point (via the
 * TypeScript checker, so re-export chains and `export *` are followed) and diffs
 * the result against src/__tests__/public-api.json.
 *
 * Any addition or removal of a public symbol must be an explicit, reviewed change:
 *   node scripts/check/exports.mjs            # verify (CI)
 *   node scripts/check/exports.mjs --update   # re-snapshot after an intended change
 *
 * This is what makes internal restructuring safe: folders can move freely as long
 * as the exported surface stays identical.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SNAPSHOT = join(ROOT, "src/__tests__/public-api.json");
const UPDATE = process.argv.includes("--update");

const ENTRIES = {
  ".": "src/index.ts",
  "./brand": "src/brand/index.ts",
  "./blocks": "src/blocks/index.ts",
};

const config = ts.parseJsonConfigFileContent(
  ts.readConfigFile(join(ROOT, "tsconfig.build.json"), ts.sys.readFile).config,
  ts.sys,
  ROOT,
);

const program = ts.createProgram(
  Object.values(ENTRIES).map((f) => join(ROOT, f)),
  { ...config.options, noEmit: true },
);
const checker = program.getTypeChecker();

const surface = {};
for (const [specifier, file] of Object.entries(ENTRIES)) {
  const source = program.getSourceFile(join(ROOT, file));
  if (!source) throw new Error(`entry point not found: ${file}`);
  const symbol = checker.getSymbolAtLocation(source);
  surface[specifier] = symbol
    ? checker
        .getExportsOfModule(symbol)
        .map((s) => s.getName())
        .sort()
    : [];
}

if (UPDATE) {
  writeFileSync(SNAPSHOT, `${JSON.stringify(surface, null, 2)}\n`);
  const total = Object.values(surface).reduce((n, list) => n + list.length, 0);
  console.log(`✔ snapshotted ${total} public exports → src/__tests__/public-api.json`);
  process.exit(0);
}

let expected;
try {
  expected = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
} catch {
  console.error(
    "✗ src/__tests__/public-api.json is missing — run `bun run check:exports -- --update`.",
  );
  process.exit(1);
}

let failed = 0;
for (const specifier of new Set([...Object.keys(expected), ...Object.keys(surface)])) {
  const before = new Set(expected[specifier] ?? []);
  const after = new Set(surface[specifier] ?? []);
  const removed = [...before].filter((n) => !after.has(n));
  const added = [...after].filter((n) => !before.has(n));
  if (removed.length) {
    failed += removed.length;
    console.error(`✗ ${specifier}: ${removed.length} export(s) REMOVED — ${removed.join(", ")}`);
  }
  if (added.length) {
    failed += added.length;
    console.error(`✗ ${specifier}: ${added.length} export(s) ADDED — ${added.join(", ")}`);
  }
}

if (failed) {
  console.error(
    "\nThe published API surface changed. If that is intended, re-snapshot with " +
      "`bun run check:exports -- --update` and land it in the same changeset.",
  );
  process.exit(1);
}

const total = Object.values(surface).reduce((n, list) => n + list.length, 0);
console.log(
  `✓ public API unchanged — ${total} exports across ${Object.keys(surface).length} entry points.`,
);
