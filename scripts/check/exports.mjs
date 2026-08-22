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
 *
 * Beyond the snapshot, three rules keep the surface *intentional* — nothing becomes public,
 * or stops being public, by accident:
 *
 *   1. every component module contributes at least one symbol to the published surface, so a
 *      component cannot ship unreachable
 *   2. a module marked `@barrel-exclude` really is excluded — none of the names only it
 *      exports may appear in the public surface
 *   3. no two barrel-exported component modules export the same name. `export *` resolves a
 *      collision by silently dropping the symbol, so an ambiguity is a public API that
 *      disappears without anyone editing an export
 *
 * A second snapshot, src/__tests__/public-props.json, records the *props* each exported `*Props`
 * type declares. The export list alone cannot see a renamed or removed prop — `ButtonProps` is
 * still exported either way — and a prop is as much of a public API as the component is.
 *
 * Only the props Qeetrix declares are recorded, read from the declaration rather than the
 * resolved type: `React.ComponentProps<"div">` contributes ~250 inherited DOM attributes that
 * would bury the signal and churn on every @types/react bump.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SNAPSHOT = join(ROOT, "src/__tests__/public-api.json");
const PROPS_SNAPSHOT = join(ROOT, "src/__tests__/public-props.json");
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

// Every component module is a root file, not only the entry points: a `@barrel-exclude` alias
// is reachable from no entry by design, and it still has to be checked.
const categoryMap = JSON.parse(
  readFileSync(join(ROOT, "scripts/config/category-map.json"), "utf8"),
);
const componentFiles = Object.entries(categoryMap).flatMap(([category, slugs]) =>
  slugs.map((slug) => join(ROOT, "src/components", category, `${slug}.tsx`)),
);

const program = ts.createProgram(
  [...Object.values(ENTRIES).map((f) => join(ROOT, f)), ...componentFiles],
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

// ── the props each exported `*Props` type declares ────────────────────────────────────────
/** The members a props declaration writes itself, ignoring anything it extends. */
function declaredMembers(declaration) {
  const names = new Set();
  const collect = (node) => {
    if (!node) return;
    if (ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node)) {
      for (const member of node.members) {
        if ((ts.isPropertySignature(member) || ts.isMethodSignature(member)) && member.name) {
          names.add(member.name.getText().replace(/^["']|["']$/g, ""));
        }
      }
      return;
    }
    if (ts.isTypeAliasDeclaration(node)) return collect(node.type);
    // `Base & { own: props }` — only the literal side is ours.
    if (ts.isIntersectionTypeNode(node)) {
      for (const member of node.types) collect(member);
      return;
    }
    if (ts.isParenthesizedTypeNode(node)) return collect(node.type);
  };
  collect(declaration);
  return [...names].sort();
}

const props = {};
for (const [specifier, file] of Object.entries(ENTRIES)) {
  const source = program.getSourceFile(join(ROOT, file));
  const symbol = source && checker.getSymbolAtLocation(source);
  if (!symbol) continue;
  const entry = {};
  for (const exported of checker.getExportsOfModule(symbol)) {
    const name = exported.getName();
    if (!name.endsWith("Props")) continue;
    const resolved =
      exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const members = (resolved.declarations ?? []).flatMap((d) => declaredMembers(d));
    if (members.length > 0) entry[name] = [...new Set(members)].sort();
  }
  props[specifier] = entry;
}

if (UPDATE) {
  writeFileSync(SNAPSHOT, `${JSON.stringify(surface, null, 2)}\n`);
  writeFileSync(PROPS_SNAPSHOT, `${JSON.stringify(props, null, 2)}\n`);
  const total = Object.values(surface).reduce((n, list) => n + list.length, 0);
  const propCount = Object.values(props).reduce(
    (n, entry) => n + Object.values(entry).reduce((m, list) => m + list.length, 0),
    0,
  );
  console.log(
    `✔ snapshotted ${total} public exports → src/__tests__/public-api.json\n` +
      `✔ snapshotted ${propCount} declared props → src/__tests__/public-props.json`,
  );
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

// ── the declared props have not changed ───────────────────────────────────────────────────
let expectedProps = {};
try {
  expectedProps = JSON.parse(readFileSync(PROPS_SNAPSHOT, "utf8"));
} catch {
  console.error(
    "✗ src/__tests__/public-props.json is missing — run `bun run check:exports -- --update`.",
  );
  process.exit(1);
}

for (const specifier of new Set([...Object.keys(expectedProps), ...Object.keys(props)])) {
  const before = expectedProps[specifier] ?? {};
  const after = props[specifier] ?? {};
  for (const type of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const had = new Set(before[type] ?? []);
    const has = new Set(after[type] ?? []);
    const removed = [...had].filter((n) => !has.has(n));
    const added = [...has].filter((n) => !had.has(n));
    if (removed.length) {
      failed += removed.length;
      console.error(`✗ ${specifier} ${type}: prop(s) REMOVED — ${removed.join(", ")}`);
    }
    if (added.length) {
      failed += added.length;
      console.error(`✗ ${specifier} ${type}: prop(s) ADDED — ${added.join(", ")}`);
    }
  }
}

if (failed) {
  console.error(
    "\nThe declared props changed. A removed or renamed prop is a breaking change; an added " +
      "optional prop is a minor. Re-snapshot with `bun run check:exports -- --update` and land it " +
      "in the same changeset.",
  );
  process.exit(1);
}

// ── the surface is intentional ────────────────────────────────────────────────────────────
// Enumerate each component module's own exports through the same checker, then hold them to
// the three reachability rules above.
const rootSurface = new Set(surface["."] ?? []);

const modules = [];
for (const [category, slugs] of Object.entries(categoryMap)) {
  for (const slug of slugs) {
    const file = join(ROOT, "src/components", category, `${slug}.tsx`);
    const source = program.getSourceFile(file);
    if (!source) {
      failed += 1;
      console.error(`✗ ${category}/${slug}.tsx is listed in category-map.json but has no source`);
      continue;
    }
    const symbol = checker.getSymbolAtLocation(source);
    modules.push({
      slug,
      category,
      excluded: readFileSync(file, "utf8").includes("@barrel-exclude"),
      exports: symbol ? checker.getExportsOfModule(symbol).map((s) => s.getName()) : [],
    });
  }
}

// Names any barrel-exported module publishes. A `@barrel-exclude` alias re-exporting one of
// these is fine — it is the same symbol, reached by a legacy specifier.
const barrelled = modules.filter((module) => !module.excluded);
const barrelledNames = new Set(barrelled.flatMap((module) => module.exports));

for (const module of modules) {
  const where = `${module.category}/${module.slug}.tsx`;
  if (module.excluded) {
    const leaked = module.exports.filter(
      (name) => !barrelledNames.has(name) && rootSurface.has(name),
    );
    if (leaked.length) {
      failed += leaked.length;
      console.error(
        `✗ ${where} is @barrel-exclude but ${leaked.length} of its own export(s) are public — ${leaked.join(", ")}`,
      );
    }
    continue;
  }
  if (!module.exports.some((name) => rootSurface.has(name))) {
    failed += 1;
    console.error(
      `✗ ${where} contributes nothing to the published surface — export it from ` +
        `${module.category}/index.ts, or mark the file @barrel-exclude`,
    );
  }
}

const owners = new Map();
for (const module of barrelled) {
  for (const name of module.exports) {
    if (!owners.has(name)) owners.set(name, []);
    owners.get(name).push(`${module.category}/${module.slug}.tsx`);
  }
}
for (const [name, files] of owners) {
  if (files.length > 1) {
    failed += 1;
    console.error(
      `✗ duplicate public export "${name}" — exported by ${files.join(" and ")}. ` +
        "`export *` drops an ambiguous name, so one of them would silently vanish.",
    );
  }
}

if (failed) {
  console.error("\nThe published API surface is not intentional — fix the exports above.");
  process.exit(1);
}

const total = Object.values(surface).reduce((n, list) => n + list.length, 0);
console.log(
  `✓ public API unchanged — ${total} exports across ${Object.keys(surface).length} entry points.\n` +
    `✓ public API intentional — ${barrelled.length} component modules reachable, ` +
    `${modules.length - barrelled.length} deliberately excluded, no duplicate exports.`,
);
