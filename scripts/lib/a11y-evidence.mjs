/**
 * a11y-evidence.mjs — read the accessibility test suite and report what it actually proves.
 *
 * The manifest records a per-dimension audit result for every component. Nothing used to link
 * those records to a test: a dimension said `pass` because somebody wrote `pass`, and the
 * coverage gate was satisfied by a *file* existing. Delete every keyboard assertion in the
 * repository and `check:a11y` stayed green.
 *
 * This module closes that loop. It reads the test sources with TypeScript's own parser and,
 * for each `it`/`test` leaf, answers two questions independently:
 *
 *   1. **which components does this test render?** — from the file's import bindings, so
 *      `Button` means `src/components/actions/button.tsx` and nothing else. Compound parts
 *      (`AccordionTrigger`, `DialogContent`) resolve through the same binding, because they are
 *      imported from the component's own module.
 *   2. **which dimensions does it assert?** — from the assertion vocabulary below, matched
 *      against the test body with comments stripped.
 *
 * The second question is where the honesty lives. An axe run is evidence for `semantic` and for
 * nothing else: axe cannot see whether Escape closes a dialog, whether focus comes back, or
 * what a screen reader is told. So `expectNoA11yViolations` earns `semantic` only, and a
 * component claiming `keyboard: "pass"` needs a test that presses a key.
 *
 * A vocabulary can be wrong in both directions, and this one was. It matched `DirectionProvider`
 * for `rtl`, which credited two CurrencyInput tests that use the provider to pick a *locale* and
 * assert nothing about direction; and it did not recognise a `rtl:` Tailwind variant, so
 * Pagination's test that asserts three chevrons carry `rtl:rotate-180` — the only assertion there
 * is, since jsdom does no layout — earned nothing. Both are fixed below. The rule that came out of
 * it: an assertion is evidence for a dimension when it would *fail* if the component ignored that
 * dimension. Widening the vocabulary to raise the audited count is the failure mode this whole
 * module exists to prevent, so every rule here should be readable as such a test.
 *
 * Evidence is taken from three corpora, and what separates the first two is *scope*, not location:
 *
 *   - the audit suites in `src/__tests__/accessibility/`, which may credit any component they
 *     render;
 *   - each component's own colocated suite, which may credit **only that component**;
 *   - a *conditional* corpus, which counts only while its own stated precondition holds — see
 *     `verifyConditionalCorpus`, and the browser suite it exists for.
 *
 * Restricting evidence to one directory would have been the same location-coupling this whole
 * finding is about. A colocated test that asserts `aria-expanded` on its own component proves
 * exactly as much as the identical assertion written in the audit suite; what it may not do is
 * credit anything else, so a `data-table.test.tsx` can never vouch for a Button.
 *
 * Three dimensions are proved once, globally, rather than per component — `reducedMotion` and
 * `forcedColors` by the mechanism tests in src/__tests__/accessibility/environment.test.ts, and
 * `contrast` by `bun run check:contrast` against the token graph in both themes. Those are
 * declared in scripts/config/a11y-evidence.json and verified to exist and to assert something,
 * so "global" is still a link to a test rather than a shrug.
 *
 * Everything here is a pure function over plain data or a parsed file, so the rules can be
 * exercised against synthetic sources — see src/__tests__/accessibility/evidence.test.ts.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { stripComments } from "./component-source.mjs";

/** The block functions a test file organises itself with. */
const BLOCK_NAMES = new Set(["describe", "it", "test", "suite"]);

/** One regex that matches where any of `patterns` would, so a family can be named once. */
const anyOf = (patterns) => new RegExp(patterns.map((pattern) => pattern.source).join("|"));

/**
 * `expect(…).toContain("rtl:rotate-180")` — an expectation whose *expected value* names `inner`.
 *
 * Scoping to a matcher call is what keeps the vocabulary made of assertion shapes rather than
 * render shapes: a fixture that happens to spell `ms-2` on a wrapper proves nothing, and this
 * does not match it.
 */
const assertedValue = (inner) =>
  new RegExp(
    `\\.to(?:Be|Equal|StrictEqual|Contain|Match|HaveClass|HaveStyle|HaveAttribute)\\s*\\([^;]{0,240}?(?:${inner})`,
  );

/**
 * A locale tag that establishes a right-to-left writing direction.
 *
 * `DirectionProvider` carries a `locale` as well as a `direction`, and the two do different jobs:
 * `<DirectionProvider locale="de-DE">` selects German number formatting and says nothing at all
 * about direction, because German reads left to right. The first version of this vocabulary
 * matched the *provider* rather than what the provider was told, so two CurrencyInput tests about
 * decimal separators earned it `rtl` evidence.
 *
 * The language subtags are `RTL_LANGUAGES` and the script subtags a slice of `RTL_SCRIPTS`, both
 * from src/lib/direction.ts; src/__tests__/accessibility/evidence.test.ts resolves every tag
 * listed here through that module's own `directionForLocale`, so the two cannot drift apart.
 */
const RTL_LOCALE =
  /\blocale\s*[:=]\s*\{?\s*["'`](?:(?:ae|ar|arc|ckb|dv|fa|he|iw|nqo|ps|sd|syr|ug|ur|yi)(?![a-z])|[a-z]{2,3}[-_](?:Adlm|Arab|Aran|Hebr|Nkoo|Rohg|Syrc|Thaa|Yezi)\b)/;

/**
 * The render declares a right-to-left writing direction, and declaring it has no other purpose.
 *
 * Kept separate from `RTL_LOCALE` on purpose — see the two conjunctions in the `rtl` entry.
 */
const RTL_DECLARED = anyOf([
  /\b(?:dir|direction)\s*[:=]\s*\{?\s*["'`]rtl["'`]/,
  /setAttribute\(\s*["'`]dir["'`]\s*,\s*["'`]rtl["'`]\s*\)/,
  /\.dir\s*=\s*["'`]rtl["'`]/,
  /["'`]\s*\[dir=["']?rtl/,
]);

/**
 * The asserted outcome is one direction actually decides: which way an arrow key moves, or which
 * physical edge a logical side resolves to.
 *
 * Narrower than `ASSERTS_AN_OUTCOME`, and used only where the RTL-ness of the render might be
 * incidental.
 */
const MIRRORS_A_DIRECTION = anyOf([
  /Arrow(?:Left|Right|Up|Down)\b/,
  /\b(?:to|get)(?:Have)?Attribute\s*\(\s*["'`]data-side["'`]/,
]);

/**
 * An assertion of an *outcome*, as opposed to an assertion of presence.
 *
 * This is the half that stops "renders under `dir="rtl"` without crashing" from counting as
 * direction evidence. `expect(nav).toBeInTheDocument()` inside an RTL provider passes whether or
 * not the component reads the direction — Pagination had exactly that test, and it counted, while
 * the test beside it that asserted the mirrored chevrons did not. Everything below says *what*
 * happened: where focus went, what the handler received, which attribute or computed value came
 * out, which way a number moved.
 */
const ASSERTS_AN_OUTCOME = anyOf([
  /toHaveFocus\s*\(|\bexpectFocus(?:Restored)?\s*\(|\bactiveElement\b/,
  /toHaveBeen[A-Za-z]*\s*\(/,
  /\b(?:to|get)(?:Have)?Attribute\s*\(/,
  /toHaveClass\s*\(|toHaveStyle\s*\(|toHaveTextContent\s*\(/,
  /toBe(?:Greater|Less)Than(?:OrEqual)?\s*\(/,
  /\.to(?:Be|Equal|StrictEqual|Contain|Match)\s*\(/,
  /\bexpectAriaState\s*\(|\bexpectAccessibleName\s*\(/,
]);

/**
 * What counts as evidence for each dimension.
 *
 * A rule is a regex matched against the test body with comments stripped, or `{ all: [...] }`,
 * every member of which has to match. Read them as "an assertion of this shape appears in the
 * test body". They are deliberately *assertion* patterns rather than render patterns: rendering a
 * component with `aria-label` is not evidence that its accessible name is correct; asserting the
 * computed name is.
 *
 * The overlap between `semantic` and `screenReader` is intentional — an `aria-expanded`
 * assertion is evidence for both the ARIA state model and what assistive technology is told.
 *
 * `rtl` is the one dimension whose rules are not all independent, because neither half of the
 * common case is evidence on its own. See the comment on the entry.
 */
export const DIMENSION_ASSERTIONS = {
  semantic: [
    /\bexpectNoA11yViolations\s*\(/,
    /\baxe\s*\(/,
    /\b(?:get|query|find)(?:All)?ByRole\s*\(/,
    /toHaveAttribute\(\s*["']role["']/,
    /getAttribute\(\s*["']role["']\)/,
    /toHaveAttribute\(\s*["']aria-/,
    /getAttribute\(\s*["']aria-/,
    /\bexpectAriaState\s*\(/,
    /querySelector(?:All)?\(\s*["'`]\s*\[?role=/,
    /querySelector(?:All)?\(\s*["'`](?:a|blockquote|button|dd|dl|dt|fieldset|h[1-6]|input|kbd|label|legend|li|mark|meter|nav|ol|output|progress|select|table|textarea|ul)["'`]\s*\)/,
    /\btagName\b/,
    /toBeInstanceOf\(\s*HTML[A-Za-z]*Element\s*\)/,
  ],
  name: [
    /\bexpectAccessibleName\s*\(/,
    /toHaveAccessibleName\s*\(/,
    /\b(?:get|query|find)(?:All)?ByRole\s*\([\s\S]{0,200}?\bname\s*:/,
    /\b(?:get|query|find)(?:All)?ByLabelText\s*\(/,
    /toHaveAttribute\(\s*["']aria-label(?:ledby)?["']/,
    /getAttribute\(\s*["']aria-label(?:ledby)?["']\)/,
    /toHaveAttribute\(\s*["']for["']/,
    /toHaveAttribute\(\s*["']title["']/,
  ],
  keyboard: [
    /\.keyboard\s*\(/,
    /\buser\.(?:tab|type)\s*\(/,
    /\buserEvent\.(?:tab|type)\s*\(/,
    /\bpress(?:Tab|ShiftTab|Enter|Space|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Home|End|PageUp|PageDown)\s*\(/,
    /\btabThrough\s*\(/,
    /fireEvent\.key(?:Down|Up|Press)\s*\(/,
    /\btype\s*\(\s*["'`]/,
  ],
  focus: [
    /toHaveFocus\s*\(/,
    /\bexpectFocus\s*\(/,
    /\bexpectFocusRestored\s*\(/,
    /\bactiveElement\b/,
    /\btabThrough\s*\(/,
    /toHaveAttribute\(\s*["'](?:inert|tabindex)["']/,
    /getAttribute\(\s*["'](?:inert|tabindex)["']\)/,
    /focus-guard/,
  ],
  screenReader: [
    /toHaveAccessibleDescription\s*\(/,
    /\bexpectAccessibleDescription\s*\(/,
    /\bexpectAriaRelationship\s*\(/,
    /\bexpectAriaState\s*\(/,
    /toHaveAttribute\(\s*["']aria-/,
    /getAttribute\(\s*["']aria-/,
    /querySelector(?:All)?\(\s*["'`]\s*\[?aria-/,
    /querySelector(?:All)?\(\s*["'`]\s*\[?role=["']?(?:status|alert|log|progressbar|meter)/,
    /\btoHaveTextContent\s*\(/,
  ],
  /**
   * `rtl` — two shapes, because a component can be direction-correct in two different ways.
   *
   * **By construction.** Its spacing, rotation and entry animation are expressed with logical
   * properties and `rtl:`/`ltr:` variants, so they mirror in the browser with no code involved.
   * jsdom does no layout, so there is nothing to observe at runtime: asserting the direction-aware
   * token *is* the assertion, and `expect(className).toContain("rtl:rotate-180")` fails the moment
   * a chevron goes back to a physical rotation. Pagination's "mirrors every directional chevron"
   * and DropdownMenu's three submenu-direction tests are all this shape, and the first version of
   * this vocabulary gave every one of them nothing.
   *
   * **By behaviour.** It reads the resolved direction and mirrors a key mapping, a pointer delta
   * or a physical `side`. That needs the render to be in RTL *and* the outcome to be asserted —
   * hence the conjunction. Either half alone is worthless: an RTL render with only a
   * `toBeInTheDocument()` is a smoke test, and an outcome assertion with no RTL render is just a
   * test.
   */
  rtl: [
    // Tailwind's direction-aware variants and logical-property utilities — the styling half of
    // the contract, LOGICAL_UTILITY_PREFIXES in src/contracts/direction.ts.
    assertedValue(
      "(?:rtl|ltr):|\\b(?:ps|pe|ms|me|start|end)-(?:\\d|\\[|auto\\b|full\\b|px\\b)|\\bborder-[se]\\b|\\brounded-[se]\\b|\\btext-(?:start|end)\\b|\\binset-inline",
    ),
    // A logical side, and the direction-aware entry animation that pairs with it.
    assertedValue("inline-(?:start|end|\\(start\\|end\\))|slide-in-from-(?:start|end)"),
    // A logical CSS property read back off the CSSOM — `style.paddingInlineStart`. Physical
    // padding would not mirror, which is why asserting the logical one is the point.
    /\b(?:padding|margin|border|inset|scrollPadding|scrollMargin)Inline(?:Start|End)?\b/,
    // The resolved direction itself, published as an attribute for exactly this reason.
    /\b(?:to|get)(?:Have)?Attribute\s*\(\s*["'`](?:dir|data-direction)["'`]/,
    // …or asserted as a value: `expect(options.direction).toBe("rtl")`.
    assertedValue("[\"'`/^]{1,3}(?:rtl|ltr)\\b"),
    // Direction-aware *behaviour*: declared RTL, and asserting what came out of it rather than
    // that something rendered.
    { all: [RTL_DECLARED, ASSERTS_AN_OUTCOME] },
    // The same from an RTL locale, which needs a *mirrored* outcome specifically, because a
    // locale has more than one job. `<DirectionProvider locale="ar-EG">` also selects
    // Arabic-Indic digits, and a test about digits is not a test about direction.
    { all: [RTL_LOCALE, MIRRORS_A_DIRECTION] },
  ],
};

/** A rule is a regex, or a conjunction of regexes all of which must match. */
const matchesRule = (rule, source) =>
  rule instanceof RegExp
    ? rule.test(source)
    : rule.all.every((pattern) => matchesRule(pattern, source));

/** Parse source text with `setParentNodes`, the same way scripts/lib/ts-literals.mjs does. */
function parse(fileName, sourceText) {
  return ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );
}

/**
 * Local identifier → component slug, from the file's own import declarations.
 *
 * Binding-based rather than name-based on purpose: two components can export the same symbol
 * name, and a global name index would credit both. The import statement says exactly which
 * module a name came from.
 */
export function readComponentBindings(sourceFile) {
  const bindings = new Map();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const match = /^@\/components\/[A-Za-z0-9-]+\/([a-z0-9-]+)$/.exec(statement.moduleSpecifier.text);
    if (match === null) continue;

    const slug = match[1];
    const clause = statement.importClause;
    if (clause === undefined) continue;
    if (clause.name) bindings.set(clause.name.text, slug);

    const named = clause.namedBindings;
    if (named && ts.isNamedImports(named)) {
      for (const element of named.elements) bindings.set(element.name.text, slug);
    }
    if (named && ts.isNamespaceImport(named)) bindings.set(named.name.text, slug);
  }

  return bindings;
}

/**
 * Recognise `describe(…)`, `it(…)`, `it.only(…)` and `describe.each(table)(…)`.
 *
 * Returns `null` for anything else, which is what makes the walk below able to recurse through
 * ordinary code without treating a helper call as a test block.
 */
export function readBlockCall(node) {
  if (!ts.isCallExpression(node)) return null;
  const target = node.expression;

  // describe.each(table)(title, fn) — the outer call's callee is itself a call.
  if (ts.isCallExpression(target)) {
    const inner = target.expression;
    if (
      ts.isPropertyAccessExpression(inner) &&
      ts.isIdentifier(inner.expression) &&
      BLOCK_NAMES.has(inner.expression.text) &&
      inner.name.text === "each"
    ) {
      return { kind: inner.expression.text, args: node.arguments, table: target.arguments[0] };
    }
    return null;
  }

  if (ts.isIdentifier(target) && BLOCK_NAMES.has(target.text)) {
    return { kind: target.text, args: node.arguments, table: undefined };
  }
  if (
    ts.isPropertyAccessExpression(target) &&
    ts.isIdentifier(target.expression) &&
    BLOCK_NAMES.has(target.expression.text)
  ) {
    return { kind: target.expression.text, args: node.arguments, table: undefined };
  }
  return null;
}

const titleOf = (node) => {
  if (node === undefined) return "(dynamic)";
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return "(dynamic)";
};

const bodyOf = (args) =>
  [...args].find((argument) => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument));

/**
 * The JSX element names inside a node.
 *
 * `skipBlocks` stops the walk at a nested `describe`/`it`, which is what lets a `describe`
 * body contribute its shared fixture to every test inside it without one sibling test's render
 * leaking into another's evidence.
 */
export function readJsxNames(node, { skipBlocks = false } = {}) {
  const names = new Set();

  const visit = (current, isRoot) => {
    if (skipBlocks && !isRoot && readBlockCall(current) !== null) return;
    if (ts.isJsxOpeningElement(current) || ts.isJsxSelfClosingElement(current)) {
      const tag = current.tagName;
      if (ts.isIdentifier(tag)) names.add(tag.text);
      else if (ts.isPropertyAccessExpression(tag) && ts.isIdentifier(tag.expression)) {
        names.add(tag.expression.text);
      }
    }
    ts.forEachChild(current, (child) => visit(child, false));
  };

  visit(node, true);
  return names;
}

/** File-scope `const NAME = …` initializers, so a `describe.each(CASES)` table can be read. */
function fileScopeInitializers(sourceFile) {
  const found = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        found.set(declaration.name.text, declaration.initializer);
      }
    }
  }
  return found;
}

/**
 * Every `it`/`test` leaf in a file, with the components it renders and the dimensions it
 * asserts.
 *
 * The rendered set is the leaf's own JSX plus the JSX of each enclosing `describe` body
 * (fixtures declared once and reused) plus, for a `.each(TABLE)` block, the JSX in the table
 * itself — which is how the `describe.each(CASES)` audits in this repository render at all.
 */
export function readTestLeaves(filePath) {
  return analyzeTestSource(filePath, readFileSync(filePath, "utf8"));
}

/**
 * `readTestLeaves` over source text rather than a path, so the analysis can be exercised on
 * hand-written suites. The repository's real tests all pass today, which means a test that only
 * ran against them would pass whether or not the analyser worked.
 */
export function analyzeTestSource(fileName, sourceText) {
  const sourceFile = parse(fileName, sourceText);
  const bindings = readComponentBindings(sourceFile);
  const initializers = fileScopeInitializers(sourceFile);
  const leaves = [];

  const tableNames = (table) => {
    if (table === undefined) return new Set();
    if (ts.isIdentifier(table)) {
      const initializer = initializers.get(table.text);
      return initializer ? readJsxNames(initializer) : new Set();
    }
    return readJsxNames(table);
  };

  const visit = (node, inherited) => {
    const call = readBlockCall(node);
    if (call === null) {
      ts.forEachChild(node, (child) => visit(child, inherited));
      return;
    }

    const body = bodyOf(call.args);
    const title = titleOf(call.args[0]);

    if (call.kind === "describe" || call.kind === "suite") {
      const contributed = new Set([
        ...inherited.names,
        ...tableNames(call.table),
        ...(body ? readJsxNames(body, { skipBlocks: true }) : []),
      ]);
      const titles = [...inherited.titles, title];
      if (body) ts.forEachChild(body, (child) => visit(child, { names: contributed, titles }));
      return;
    }

    // An `it`/`test` leaf.
    const rendered = new Set([
      ...inherited.names,
      ...tableNames(call.table),
      ...(body ? readJsxNames(body) : []),
    ]);
    const source = body ? stripComments(body.getText(sourceFile)) : "";
    const dimensions = Object.entries(DIMENSION_ASSERTIONS)
      .filter(([, rules]) => rules.some((rule) => matchesRule(rule, source)))
      .map(([dimension]) => dimension);

    leaves.push({
      title: [...inherited.titles, title].filter((part) => part !== "(dynamic)").join(" › "),
      slugs: [...rendered].map((name) => bindings.get(name)).filter((slug) => slug !== undefined),
      dimensions,
      // `expect(…)` or one of the suite's `expect…()` helpers. The helpers *are* the
      // assertions in this repository — `expectAriaState(trigger, …)` calls `expect` inside —
      // so requiring the bare word would mark the most careful tests as asserting nothing.
      asserts: /\bexpect(?:[A-Z]\w*)?\s*\(/.test(source),
    });
  };

  ts.forEachChild(sourceFile, (child) => visit(child, { names: new Set(), titles: [] }));
  return leaves;
}

/**
 * Per-component, per-dimension evidence across a set of test files.
 *
 * Returns `Map<slug, Map<dimension, string[]>>`, where each string names the test that proves
 * it — so a failure message can say what to look at, and a reviewer can check the claim.
 */
export function collectA11yEvidence({ root, files, scoped = [] }) {
  const evidence = new Map();
  const corpus = [
    ...files.map((file) => ({ file, only: null })),
    ...scoped.map((entry) => ({ file: entry.file, only: entry.slug })),
  ];

  for (const { file, only } of corpus) {
    const path = join(root, file);
    if (!existsSync(path)) continue;

    for (const leaf of readTestLeaves(path)) {
      if (!leaf.asserts) continue; // a test that asserts nothing proves nothing
      // A colocated suite is evidence for its own component and for nothing else.
      const slugs = only === null ? leaf.slugs : leaf.slugs.filter((slug) => slug === only);
      for (const slug of slugs) {
        const perDimension = evidence.get(slug) ?? new Map();
        for (const dimension of leaf.dimensions) {
          const tests = perDimension.get(dimension) ?? [];
          tests.push(`${file} › ${leaf.title}`);
          perDimension.set(dimension, tests);
        }
        evidence.set(slug, perDimension);
      }
    }
  }

  return evidence;
}

/**
 * Verify a declared global evidence record — a mechanism proved once for the whole library.
 *
 * A `test` record must name a suite that exists in the file and asserts something; a `gate`
 * record must name a script that exists. Either way "global" resolves to a real, runnable
 * thing rather than to a claim in a config file.
 */
export function verifyGlobalEvidence({ root, dimension, record }) {
  if (record.kind === "gate") {
    return existsSync(join(root, record.script))
      ? null
      : `${dimension}: global evidence names the gate ${record.script}, which does not exist`;
  }

  const path = join(root, record.file);
  if (!existsSync(path)) {
    return `${dimension}: global evidence names ${record.file}, which does not exist`;
  }

  const leaves = readTestLeaves(path).filter(
    (leaf) => leaf.title.startsWith(`${record.suite} ›`) || leaf.title === record.suite,
  );
  if (leaves.length === 0) {
    return `${dimension}: ${record.file} has no "${record.suite}" suite — the global evidence is a dead reference`;
  }
  if (!leaves.some((leaf) => leaf.asserts)) {
    return `${dimension}: every test in ${record.file} › ${record.suite} asserts nothing`;
  }
  return null;
}

/**
 * Resolve a corpus that is only evidence while something else is true.
 *
 * The case this exists for: `src/__tests__/browser/` proves — in real Chromium — the things jsdom
 * cannot show at all, `inert` exclusion, focus containment, reflow at 200% zoom, pointer
 * hit-testing, and the two host-global media blocks. Six accessibility claims are backed by those
 * tests and by nothing else. They were left out of the corpus for a good reason: `bun run verify`
 * deliberately does not run them (a Playwright Chromium build is ~200 MB and an optional peer), so
 * an evidence link into that directory would have cited tests the local gate never executes.
 *
 * But "the local gate" is not the only gate. The browser suite is a *required* CI job, so the
 * guarantee is available — it is just a different guarantee, and it has to be stated rather than
 * assumed. So a conditional corpus names its own precondition and the gate checks it: the workflow
 * exists, the job exists, and the job runs the script. Delete the job and these files stop being
 * evidence, and every claim that rested on them fails by name. Fail-closed, not fail-quiet.
 *
 * The YAML is matched structurally rather than parsed — the block under a two-space `job:` key,
 * checked for the script — because adding a YAML parser to buy a stricter read of one job name is
 * not a trade worth making. A rename that the block match misses fails closed.
 *
 * Returns `{ accepted, files, reason }`.
 */
export function verifyConditionalCorpus({ root, record }) {
  const refuse = (reason) => ({ accepted: false, files: [], reason });
  const requirement = record.requires;

  if (requirement?.kind !== "ci-job") {
    return refuse(`unknown precondition kind "${requirement?.kind}"`);
  }

  const workflowPath = join(root, requirement.workflow);
  if (!existsSync(workflowPath)) {
    return refuse(`${requirement.workflow} does not exist`);
  }

  const workflow = readFileSync(workflowPath, "utf8");
  const lines = workflow.split("\n");
  const start = lines.indexOf(`  ${requirement.job}:`);
  if (start === -1) {
    return refuse(`${requirement.workflow} has no \`${requirement.job}\` job`);
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^ {2}\S/.test(line));
  const block = (end === -1 ? rest : rest.slice(0, end)).join("\n");
  if (!block.includes(requirement.script)) {
    return refuse(
      `the \`${requirement.job}\` job in ${requirement.workflow} no longer runs ` +
        `\`${requirement.script}\``,
    );
  }

  const files = [];
  for (const dir of record.directories ?? []) {
    const path = join(root, dir);
    if (!existsSync(path)) return refuse(`${dir} does not exist`);
    for (const entry of readdirSync(path, { recursive: true })) {
      const name = typeof entry === "string" ? entry : String(entry);
      if (/\.test\.tsx?$/.test(name)) files.push(`${dir}/${name}`.replace(/\/+/g, "/"));
    }
  }
  if (files.length === 0) return refuse(`no test files under ${record.directories?.join(", ")}`);

  return { accepted: true, files: files.sort(), reason: null };
}

/**
 * The audit claims a component makes that no test backs.
 *
 * A `pass` or `partial` is a claim of conformance, so it needs evidence. `not-applicable` and
 * `not-audited` are not claims and are left to the reason-based review — recorded as a residual
 * rather than pretended away.
 */
export function findUnbackedClaims({
  components,
  evidence,
  globalDimensions,
  scriptedMotion = new Set(),
}) {
  const unbacked = [];

  for (const component of components) {
    for (const [dimension, state] of Object.entries(component.accessibility.dimensions)) {
      if (state !== "pass" && state !== "partial") continue;

      const global = globalDimensions[dimension];
      if (global !== undefined) {
        // A mechanism proved for the library only covers a component the mechanism reaches.
        //
        // The sharpest case: the document-wide `prefers-reduced-motion` rule collapses CSS
        // transitions and cannot touch a `requestAnimationFrame` loop or an autoplay plugin. A
        // component that drives motion from JavaScript therefore does not inherit the global
        // claim, whatever its capability says — `capabilities.reducedMotion: "supported"` is
        // true of both "the CSS rule covers it" and "it handles the query itself in JS", and
        // only the first is what the global test proves.
        if (global.excludeScriptedMotion === true && scriptedMotion.has(component.slug)) {
          const tests = evidence.get(component.slug)?.get(dimension) ?? [];
          if (tests.length > 0) continue;
          unbacked.push({
            slug: component.slug,
            dimension,
            state,
            reason:
              "drives motion from JavaScript, which the document-wide CSS rule cannot reach — " +
              "this one needs its own test",
          });
          continue;
        }
        const requirement = global.requires;
        if (requirement === undefined) continue;
        const actual = component.capabilities?.[requirement.capability];
        if (requirement.is.includes(actual)) continue;
        unbacked.push({
          slug: component.slug,
          dimension,
          state,
          reason:
            `capabilities.${requirement.capability} is "${actual}", so the global mechanism ` +
            `(${global.proves}) does not cover it — this one needs its own test`,
        });
        continue;
      }

      const tests = evidence.get(component.slug)?.get(dimension) ?? [];
      if (tests.length > 0) continue;
      unbacked.push({
        slug: component.slug,
        dimension,
        state,
        reason: "no test in the accessibility suite asserts this dimension for this component",
      });
    }
  }

  return unbacked;
}

/** The per-slug/per-dimension shape the snapshot locks, with keys in a stable order. */
export function auditSnapshot(components) {
  const snapshot = {};
  for (const component of [...components].sort((a, b) => (a.slug < b.slug ? -1 : 1))) {
    const dimensions = {};
    for (const key of Object.keys(component.accessibility.dimensions).sort()) {
      dimensions[key] = component.accessibility.dimensions[key];
    }
    snapshot[component.slug] = dimensions;
  }
  return snapshot;
}

/**
 * Compare the manifest's audit matrix against the tracked snapshot.
 *
 * Exact match, in both directions. An aggregate ratchet cannot tell "we audited one more
 * component" from "we stopped auditing Dialog and started auditing Badge"; a per-slug snapshot
 * can, and forces both to be a deliberate, reviewed edit.
 */
export function diffAuditSnapshot(actual, expected) {
  const differences = [];
  const slugs = [...new Set([...Object.keys(actual), ...Object.keys(expected)])].sort();

  for (const slug of slugs) {
    if (expected[slug] === undefined) {
      differences.push({ slug, dimension: null, from: null, to: "(new component)" });
      continue;
    }
    if (actual[slug] === undefined) {
      differences.push({ slug, dimension: null, from: "(recorded)", to: null });
      continue;
    }
    for (const dimension of Object.keys(expected[slug]).sort()) {
      if (actual[slug][dimension] !== expected[slug][dimension]) {
        differences.push({
          slug,
          dimension,
          from: expected[slug][dimension],
          to: actual[slug][dimension] ?? "(missing)",
        });
      }
    }
  }

  return differences;
}
