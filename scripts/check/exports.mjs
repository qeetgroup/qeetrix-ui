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
 * **A name is not a signature.** A snapshot of names alone passes when a prop becomes required,
 * a union is narrowed, a callback gains an argument, a props type stops extending the DOM
 * attributes it used to inherit, or an exported function is replaced by a type of the same name —
 * every one of which is a breaking change for a consumer. So two things are recorded:
 *
 *   - **src/__tests__/public-api.json** — every exported name *and its kind* (function, variable,
 *     interface, type alias, …), per entry point. Every explicit entry point in the package
 *     export map is covered, not only the three barrels: `./providers`, the six `./blocks/<name>`
 *     modules, and the supported `./hooks/<name>` and `./lib/<name>` paths are all locked.
 *   - **src/__tests__/public-props.json** — for every exported `*Props` type: its type parameters,
 *     the types it extends, and each declared member with its optionality and declared type text.
 *
 * Signatures are read from the *declaration*, not from the resolved type. `React.ComponentProps<
 * "div">` resolves to ~250 inherited DOM attributes that would bury the signal and churn on every
 * @types/react bump; the fact that a props type extends it is recorded instead, so removing that
 * inheritance still fails.
 *
 * The 145 `@qeetrix/ui/components/<slug>` paths are deliberately not separate entries: each is
 * `export *` of one module, `check:architecture` requires the category barrel to re-export the
 * module completely, and `check:package` proves every one of those paths resolves. So the root
 * barrel's surface is theirs.
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
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SNAPSHOT = join(ROOT, "src/__tests__/public-api.json");
const PROPS_SNAPSHOT = join(ROOT, "src/__tests__/public-props.json");
const UPDATE = process.argv.includes("--update");

/**
 * Every explicit entry point in the package export map, in the order they appear there.
 * Derived from package.json rather than restated, so a new export cannot be added without
 * being locked — and a locked entry cannot be removed from the map without failing here.
 */
const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

/** `./dist/blocks/auth.js` → `src/blocks/auth.ts[x]`, resolved against what exists. */
function sourceOf(target) {
  const base = target.replace(/^\.\/dist\//, "src/").replace(/\.js$/, "");
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    try {
      readFileSync(join(ROOT, candidate));
      return candidate;
    } catch {
      // next candidate
    }
  }
  return null;
}

const ENTRIES = {};
for (const [specifier, target] of Object.entries(packageJson.exports)) {
  // Patterns, denials and asset entry points are covered by check:package, not by the symbol lock.
  if (specifier.includes("*") || target === null || typeof target === "string") continue;
  const source = sourceOf(target.import);
  if (!source) throw new Error(`export "${specifier}" has no source for ${target.import}`);
  ENTRIES[specifier] = source;
}

const config = ts.parseJsonConfigFileContent(
  ts.readConfigFile(join(ROOT, "tsconfig.build.json"), ts.sys.readFile).config,
  ts.sys,
  ROOT,
);

// Every component module is a root file, not only the entry points: a `@barrel-exclude` alias
// is reachable from no entry by design, and it still has to be checked.
const componentMap = JSON.parse(
  readFileSync(join(ROOT, "scripts/config/component-map.json"), "utf8"),
);
const componentFiles = Object.entries(componentMap).flatMap(([family, slugs]) =>
  slugs.map((slug) => join(ROOT, "src/components", family, `${slug}.tsx`)),
);

const program = ts.createProgram(
  [...Object.values(ENTRIES).map((f) => join(ROOT, f)), ...componentFiles],
  { ...config.options, noEmit: true },
);
const checker = program.getTypeChecker();

const exportsOf = (file) => {
  const source = program.getSourceFile(join(ROOT, file));
  if (!source) throw new Error(`entry point not found: ${file}`);
  const symbol = checker.getSymbolAtLocation(source);
  return symbol ? checker.getExportsOfModule(symbol) : [];
};

const resolve = (symbol) =>
  symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

/**
 * What kind of thing the name is. A value silently becoming a type — or a `function` becoming a
 * `const` of an incompatible shape — is invisible to a list of names.
 */
function kindOf(symbol) {
  const flags = resolve(symbol).flags;
  if (flags & ts.SymbolFlags.Class) return "class";
  if (flags & ts.SymbolFlags.Enum) return "enum";
  if (flags & ts.SymbolFlags.Function) return "function";
  if (flags & ts.SymbolFlags.Interface) return "interface";
  if (flags & ts.SymbolFlags.TypeAlias) return "type";
  if (flags & ts.SymbolFlags.Variable) return "variable";
  if (flags & ts.SymbolFlags.Module) return "namespace";
  return "unknown";
}

const surface = {};
for (const [specifier, file] of Object.entries(ENTRIES)) {
  surface[specifier] = Object.fromEntries(
    exportsOf(file)
      .map((symbol) => [symbol.getName(), kindOf(symbol)])
      .sort(([a], [b]) => (a < b ? -1 : 1)),
  );
}

/* ── the declared shape of each exported props type ───────────────────────────────────────── */

/** Declared type text, normalised: comments dropped, whitespace collapsed. */
const normalize = (node) =>
  node
    ? node
        .getText()
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/\/\/[^\n]*/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "unknown";

/**
 * What a props declaration writes itself: its type parameters, what it inherits, and each member
 * with optionality and declared type. Anything it extends is recorded by name only — the point is
 * to notice when the inheritance changes, not to inline 250 DOM attributes.
 */
function declaredShape(declaration) {
  const shape = { generics: "", extends: [], props: {} };
  const collect = (node) => {
    if (!node) return;
    if (node.typeParameters?.length) {
      shape.generics = `<${node.typeParameters.map(normalize).join(", ")}>`;
    }
    if (ts.isInterfaceDeclaration(node)) {
      for (const clause of node.heritageClauses ?? []) {
        for (const type of clause.types) shape.extends.push(normalize(type));
      }
    }
    if (ts.isInterfaceDeclaration(node) || ts.isTypeLiteralNode(node)) {
      for (const member of node.members) {
        if ((ts.isPropertySignature(member) || ts.isMethodSignature(member)) && member.name) {
          const name = member.name.getText().replace(/^["']|["']$/g, "");
          const optional = member.questionToken ? "?" : "";
          const type = ts.isMethodSignature(member)
            ? `(${member.parameters.map(normalize).join(", ")}) => ${normalize(member.type)}`
            : normalize(member.type);
          shape.props[name] = `${optional}: ${type}`;
        }
      }
      return;
    }
    if (ts.isTypeAliasDeclaration(node)) return collect(node.type);
    // `Base & { own: props }` — the literal side is ours, the rest is inheritance.
    if (ts.isIntersectionTypeNode(node)) {
      for (const member of node.types) {
        if (ts.isTypeLiteralNode(member)) collect(member);
        else shape.extends.push(normalize(member));
      }
      return;
    }
    if (ts.isParenthesizedTypeNode(node)) return collect(node.type);
    // A props type that is nothing but an alias of something else: record what it aliases.
    shape.extends.push(normalize(node));
  };
  collect(declaration);
  shape.extends = [...new Set(shape.extends)].sort();
  shape.props = Object.fromEntries(
    Object.entries(shape.props).sort(([a], [b]) => (a < b ? -1 : 1)),
  );
  return shape;
}

const props = {};
for (const [specifier, file] of Object.entries(ENTRIES)) {
  const entry = {};
  for (const exported of exportsOf(file)) {
    const name = exported.getName();
    if (!name.endsWith("Props")) continue;
    const declarations = resolve(exported).declarations ?? [];
    const merged = { generics: "", extends: [], props: {} };
    for (const declaration of declarations) {
      const shape = declaredShape(declaration);
      merged.generics ||= shape.generics;
      merged.extends = [...new Set([...merged.extends, ...shape.extends])].sort();
      Object.assign(merged.props, shape.props);
    }
    merged.props = Object.fromEntries(
      Object.entries(merged.props).sort(([a], [b]) => (a < b ? -1 : 1)),
    );
    if (merged.extends.length > 0 || Object.keys(merged.props).length > 0) entry[name] = merged;
  }
  props[specifier] = entry;
}

if (UPDATE) {
  writeFileSync(SNAPSHOT, `${JSON.stringify(surface, null, 2)}\n`);
  writeFileSync(PROPS_SNAPSHOT, `${JSON.stringify(props, null, 2)}\n`);
  const total = Object.values(surface).reduce((n, entry) => n + Object.keys(entry).length, 0);
  const propCount = Object.values(props).reduce(
    (n, entry) =>
      n + Object.values(entry).reduce((m, shape) => m + Object.keys(shape.props).length, 0),
    0,
  );
  console.log(
    `✔ snapshotted ${total} public exports → src/__tests__/public-api.json\n` +
      `✔ snapshotted ${propCount} declared props → src/__tests__/public-props.json`,
  );
  process.exit(0);
}

const stale = (file) =>
  `✗ ${file} is out of date for this format — run \`bun run check:exports -- --update\`, review ` +
  "the diff, and land it in the same changeset.";

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
  const before = expected[specifier];
  const after = surface[specifier];
  if (!before) {
    failed += 1;
    console.error(`✗ ${specifier}: new entry point, not in the snapshot`);
    continue;
  }
  if (!after) {
    failed += 1;
    console.error(`✗ ${specifier}: entry point REMOVED from the package export map`);
    continue;
  }
  if (Array.isArray(before)) {
    console.error(stale("src/__tests__/public-api.json"));
    process.exit(1);
  }
  for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!(name in after)) {
      failed += 1;
      console.error(`✗ ${specifier}: export REMOVED — ${name}`);
    } else if (!(name in before)) {
      failed += 1;
      console.error(`✗ ${specifier}: export ADDED — ${name} (${after[name]})`);
    } else if (before[name] !== after[name]) {
      failed += 1;
      console.error(`✗ ${specifier}: ${name} changed kind — ${before[name]} → ${after[name]}`);
    }
  }
}

if (failed) {
  console.error(
    "\nThe published API surface changed. If that is intended, re-snapshot with " +
      "`bun run check:exports -- --update` and land it in the same changeset.",
  );
  process.exit(1);
}

/* ── the declared props have not changed ──────────────────────────────────────────────────── */

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
    const had = before[type];
    const has = after[type];
    if (Array.isArray(had)) {
      console.error(stale("src/__tests__/public-props.json"));
      process.exit(1);
    }
    if (!had) {
      failed += 1;
      console.error(`✗ ${specifier} ${type}: props type ADDED`);
      continue;
    }
    if (!has) {
      failed += 1;
      console.error(`✗ ${specifier} ${type}: props type REMOVED`);
      continue;
    }
    if (had.generics !== has.generics) {
      failed += 1;
      console.error(
        `✗ ${specifier} ${type}: type parameters changed — "${had.generics}" → "${has.generics}"`,
      );
    }
    const droppedBases = had.extends.filter((base) => !has.extends.includes(base));
    const addedBases = has.extends.filter((base) => !had.extends.includes(base));
    if (droppedBases.length) {
      failed += droppedBases.length;
      console.error(
        `✗ ${specifier} ${type}: no longer extends ${droppedBases.join(", ")} — every prop it ` +
          "inherited from that type is gone",
      );
    }
    if (addedBases.length) {
      failed += addedBases.length;
      console.error(`✗ ${specifier} ${type}: now extends ${addedBases.join(", ")}`);
    }
    for (const name of new Set([...Object.keys(had.props), ...Object.keys(has.props)])) {
      const from = had.props[name];
      const to = has.props[name];
      if (to === undefined) {
        failed += 1;
        console.error(`✗ ${specifier} ${type}: prop REMOVED — ${name}${from}`);
      } else if (from === undefined) {
        failed += 1;
        console.error(`✗ ${specifier} ${type}: prop ADDED — ${name}${to}`);
      } else if (from !== to) {
        failed += 1;
        const requiredNow = from.startsWith("?") && !to.startsWith("?");
        console.error(
          `✗ ${specifier} ${type}: prop ${name} changed — "${from}" → "${to}"` +
            (requiredNow ? " (now REQUIRED — breaking)" : ""),
        );
      }
    }
  }
}

if (failed) {
  console.error(
    "\nThe declared props changed. A removed or renamed prop, a newly required prop, a narrowed " +
      "type and a dropped base type are all breaking changes; an added optional prop is a minor. " +
      "Re-snapshot with `bun run check:exports -- --update` and land it in the same changeset.",
  );
  process.exit(1);
}

/* ── the surface is intentional ───────────────────────────────────────────────────────────── */
// Enumerate each component module's own exports through the same checker, then hold them to
// the three reachability rules above.
const rootSurface = new Set(Object.keys(surface["."] ?? {}));

const modules = [];
for (const [family, slugs] of Object.entries(componentMap)) {
  for (const slug of slugs) {
    const file = join(ROOT, "src/components", family, `${slug}.tsx`);
    const source = program.getSourceFile(file);
    if (!source) {
      failed += 1;
      console.error(`✗ ${family}/${slug}.tsx is listed in component-map.json but has no source`);
      continue;
    }
    const symbol = checker.getSymbolAtLocation(source);
    modules.push({
      slug,
      category: family,
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

const total = Object.values(surface).reduce((n, entry) => n + Object.keys(entry).length, 0);
const signatures = Object.values(props).reduce(
  (n, entry) =>
    n +
    Object.values(entry).reduce(
      (m, shape) => m + Object.keys(shape.props).length + shape.extends.length,
      0,
    ),
  0,
);
console.log(
  `✓ public API unchanged — ${total} exports across ${Object.keys(surface).length} entry points, ` +
    `${signatures} declared prop signatures and base types.\n` +
    `✓ public API intentional — ${barrelled.length} component modules reachable, ` +
    `${modules.length - barrelled.length} deliberately excluded, no duplicate exports.`,
);
