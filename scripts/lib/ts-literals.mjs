/**
 * ts-literals.mjs — read literal `export const` declarations out of TypeScript source.
 *
 * The contract vocabularies (src/contracts/) and the governance registry
 * (src/manifests/component-registry.ts) are authored in TypeScript on purpose: `tsc` is then
 * the first gate, so an invalid status or ARIA pattern is a compile error with a "did you
 * mean" hint. Build and check scripts are plain `.mjs` run by node, so they cannot import
 * those modules — they read them statically instead, with the TypeScript compiler that
 * scripts/check/exports.mjs already relies on.
 *
 * Only literals are evaluated: strings, numbers, booleans, null, arrays and object literals,
 * unwrapping `as const` / `satisfies` / parentheses. Anything else (a function, a computed
 * value, a spread) is skipped rather than guessed at, so this can never "resolve" something
 * the source does not literally say.
 *
 * src/__tests__/component-contract.test.ts pins the extracted values against the same modules
 * imported for real, so the extractor cannot silently drift from TypeScript's own view.
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import ts from "typescript";

/** Returned for any initializer that is not a supported literal. */
const UNSUPPORTED = Symbol("unsupported");

function parse(filePath) {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );
}

/** Strip `as const`, `satisfies T` and parentheses down to the literal underneath. */
function unwrap(node) {
  let current = node;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function propertyName(node) {
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) return node.name.text;
  return null;
}

function evaluate(node) {
  const value = unwrap(node);

  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
  if (ts.isNumericLiteral(value)) return Number(value.text);
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (value.kind === ts.SyntaxKind.NullKeyword) return null;

  if (ts.isPrefixUnaryExpression(value) && ts.isNumericLiteral(value.operand)) {
    const magnitude = Number(value.operand.text);
    if (value.operator === ts.SyntaxKind.MinusToken) return -magnitude;
    if (value.operator === ts.SyntaxKind.PlusToken) return magnitude;
    return UNSUPPORTED;
  }

  if (ts.isArrayLiteralExpression(value)) {
    const items = [];
    for (const element of value.elements) {
      // `[...ARCHITECTURE_LAYERS]` cannot be resolved without scope, and guessing is worse
      // than reporting the whole array as unsupported.
      if (ts.isSpreadElement(element)) return UNSUPPORTED;
      const item = evaluate(element);
      if (item === UNSUPPORTED) return UNSUPPORTED;
      items.push(item);
    }
    return items;
  }

  if (ts.isObjectLiteralExpression(value)) {
    const object = {};
    for (const property of value.properties) {
      if (!ts.isPropertyAssignment(property)) return UNSUPPORTED;
      const key = propertyName(property);
      if (key === null) return UNSUPPORTED;
      const item = evaluate(property.initializer);
      if (item === UNSUPPORTED) return UNSUPPORTED;
      object[key] = item;
    }
    return object;
  }

  return UNSUPPORTED;
}

/**
 * Every literal `export const` in one file, as `{ NAME: value }`.
 * Declarations whose value is not a literal are omitted.
 */
export function readLiteralExports(filePath) {
  const source = parse(filePath);
  const exported = {};

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const isExported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (!isExported) continue;

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const value = evaluate(declaration.initializer);
      if (value !== UNSUPPORTED) exported[declaration.name.text] = value;
    }
  }

  return exported;
}

/**
 * The union of every literal `export const` across a directory's `.ts` files.
 *
 * `index.ts` is skipped (it only re-exports) and a name declared in two files is a hard
 * error rather than a silent last-one-wins.
 */
export function readLiteralExportsFromDirectory(directory) {
  const merged = {};
  const origin = new Map();

  for (const file of readdirSync(directory).sort()) {
    if (!file.endsWith(".ts") || file === "index.ts" || file.endsWith(".d.ts")) continue;
    const path = join(directory, file);
    for (const [name, value] of Object.entries(readLiteralExports(path))) {
      if (origin.has(name)) {
        throw new Error(
          `${name} is exported by both ${origin.get(name)} and ${basename(path)} — ` +
            "a contract vocabulary must have exactly one home.",
        );
      }
      origin.set(name, basename(path));
      merged[name] = value;
    }
  }

  return merged;
}

/**
 * The statement index of a file's `"use client"` directive, or `-1` when it has none.
 *
 * Parsed rather than string-matched: a directive is an expression statement, so the phrase
 * appearing in a doc comment or inside another string is correctly *not* a directive. Index `0`
 * means the boundary is declared correctly; anything greater means it is too late to take
 * effect.
 */
export function findClientDirectiveIndex(filePath) {
  const source = parse(filePath);
  return source.statements.findIndex(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression) &&
      statement.expression.text === "use client",
  );
}

/**
 * The `cva()` variant groups declared in a component file, as `{ group: [members] }`.
 *
 * Reads every `cva(base, { variants: { … } })` call in the file and merges the groups, which
 * is how a component with more than one `cva` block (a root plus a slot) reports its full
 * surface. Returns `null` when the file has no `cva` call at all — "not recorded", as opposed
 * to an empty variant surface.
 */
export function readCvaVariantGroups(filePath) {
  const source = parse(filePath);
  let found = false;
  const groups = {};

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "cva"
    ) {
      found = true;
      const config = node.arguments[1] ? unwrap(node.arguments[1]) : undefined;
      if (config && ts.isObjectLiteralExpression(config)) {
        for (const property of config.properties) {
          if (!ts.isPropertyAssignment(property) || propertyName(property) !== "variants") continue;
          const variants = unwrap(property.initializer);
          if (!ts.isObjectLiteralExpression(variants)) continue;

          for (const group of variants.properties) {
            if (!ts.isPropertyAssignment(group)) continue;
            const groupName = propertyName(group);
            const members = unwrap(group.initializer);
            if (groupName === null || !ts.isObjectLiteralExpression(members)) continue;

            const names = members.properties
              .filter((member) => ts.isPropertyAssignment(member))
              .map((member) => propertyName(member))
              .filter((name) => name !== null);
            groups[groupName] = [...new Set([...(groups[groupName] ?? []), ...names])];
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return found ? groups : null;
}
