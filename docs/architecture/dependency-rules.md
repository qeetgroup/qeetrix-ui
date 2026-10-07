# Dependency rules

Dependencies between layers are **deny by default**. An import is legal only if the target
layer appears in the source layer's allow-list in
[`src/contracts/layers.ts`](../../src/contracts/layers.ts). Nothing is permitted by omission —
if a layer needs a new edge, someone adds it deliberately and the reason ends up in a diff.

`bun run check:architecture` enforces this against the real module graph. Imports are resolved
to files with TypeScript's own dependency scanner and the tsconfig `@/*` alias, so re-exports,
type-only imports and dynamic `import()` are all seen and nothing is matched by substring.

Every rule is written against the **resolved file**, never against the shape of the specifier
that named it. `../inputs/input`, `../../components/inputs/input` and
`@/components/inputs/input` all reduce to the same canonical identity, so a rule cannot be
evaded by spelling an import differently. `.css` and `.json` files are nodes in the graph too —
see [Non-TypeScript inputs](#non-typescript-inputs).

---

## The table

Read a row as "this layer may import…". Same-layer imports are listed explicitly, because two
layers (`tokens`, `styles`) legitimately have no internal imports at all and one (`contracts`)
must stay closed.

| Layer | May import | May not import |
|:--|:--|:--|
| `tokens` | — | `tokens` · `styles` · `contracts` · `manifests` · `runtime` · `lib` · `hooks` · `internal` · `providers` · `components` · `blocks` · `patterns` · `entry` |
| `styles` | — | `tokens` · `styles` · `contracts` · `manifests` · `runtime` · `lib` · `hooks` · `internal` · `providers` · `components` · `blocks` · `patterns` · `entry` |
| `contracts` | `contracts` | `tokens` · `styles` · `manifests` · `runtime` · `lib` · `hooks` · `internal` · `providers` · `components` · `blocks` · `patterns` · `entry` |
| `manifests` | `contracts` · `manifests` | `tokens` · `styles` · `runtime` · `lib` · `hooks` · `internal` · `providers` · `components` · `blocks` · `patterns` · `entry` |
| `runtime` | `runtime` · `tokens` | `styles` · `contracts` · `manifests` · `lib` · `hooks` · `internal` · `providers` · `components` · `blocks` · `patterns` · `entry` |
| `lib` | `lib` · `runtime` · `tokens` | `styles` · `contracts` · `manifests` · `hooks` · `internal` · `providers` · `components` · `blocks` · `patterns` · `entry` |
| `hooks` | `hooks` · `lib` · `runtime` · `tokens` | `styles` · `contracts` · `manifests` · `internal` · `providers` · `components` · `blocks` · `patterns` · `entry` |
| `internal` | `internal` · `hooks` · `lib` · `runtime` · `tokens` | `styles` · `contracts` · `manifests` · `providers` · `components` · `blocks` · `patterns` · `entry` |
| `providers` | `providers` · `hooks` · `lib` · `runtime` · `contracts` · `tokens` | `styles` · `manifests` · `internal` · `components` · `blocks` · `patterns` · `entry` |
| `components` | `components` · `internal` · `providers` · `hooks` · `lib` · `runtime` · `contracts` · `tokens` | `styles` · `manifests` · `blocks` · `patterns` · `entry` |
| `blocks` | `entry` | `tokens` · `styles` · `contracts` · `manifests` · `runtime` · `lib` · `hooks` · `internal` · `providers` · `components` · `blocks` · `patterns` |
| `patterns` | `entry` | `tokens` · `styles` · `contracts` · `manifests` · `runtime` · `lib` · `hooks` · `internal` · `providers` · `components` · `blocks` · `patterns` |
| `entry` | `components` · `internal` · `providers` · `hooks` · `lib` · `runtime` · `manifests` · `contracts` · `tokens` | `styles` · `blocks` · `patterns` · `entry` |

`tests` is absent from the table on purpose: test files are exempt (see
[Exemptions](#exemptions)).

---

## The forbidden edges that matter

These follow from the table, but they are the ones worth knowing by heart. Each has a
hand-written explanation in `LAYER_RULE_EXPLANATIONS` so the checker says *why*, not just
*no*.

| Forbidden | Why |
|:--|:--|
| `tokens → components` | tokens are data and must not reach into component code |
| `runtime → components` | runtime is component-agnostic; pass behaviour in instead |
| `internal → components` | an internal primitive must not depend on a composed component |
| `contracts → components` | contracts must stay readable by build scripts; keep them type-only |
| `hooks → components` | a hook must not render or import components |
| `providers → components` | providers wrap children; they must not import components |
| `blocks → components` | a block is copied into apps: import from @qeetrix/ui, not its internals |
| `patterns → components` | a pattern is copied into apps: import from @qeetrix/ui, not its internals |

A violation is reported with its source, its dependency and the rule:

```text
Architecture violation

Source:
  src/components/actions/button.tsx

Dependency:
  src/blocks/dashboard-shell.tsx

Rule:
  components cannot depend on blocks — blocks compose components
```

When the illegal edge sits behind a legal one, the whole chain is named, so a violation three
files deep is actionable instead of mysterious:

```text
Architecture violation (transitive)

Source:
  src/components/actions/icon-button.tsx

Chain:
  src/components/actions/icon-button.tsx
  → src/components/actions/button.tsx
  → src/blocks/dashboard-shell.tsx

Rule:
  components cannot reach blocks
```

---

## Non-TypeScript inputs

A stylesheet and a token file are dependencies. They used to sit outside the graph entirely: the
traversal collected `.ts` and `.tsx` and nothing else, so a component could `import
"@/styles/index.css"` or `import colors from "@/tokens/primitive/color.json"` and
`check:architecture` would report a clean TypeScript tree.

They are now nodes, with layers like any other file, governed by a second table —
`LAYER_ALLOWED_ASSET_DEPENDENCIES`. Deny by default, and **currently empty**: no shipped
TypeScript module may import a `.css` or `.json` file.

Two different reasons for two different tables:

- `components` may depend on the `tokens` layer, because it reads *generated TypeScript* derived
  from it. Importing a raw token JSON is a different act — it bypasses the CSS bridge, ships the
  whole token file into the bundle, and hides the component's colour source from
  `check:token-usage`.
- A stylesheet is a side effect. A component that imports one has decided, on behalf of every
  consumer, that the styles load. That is the choice `styles.css` exists to make once, at the
  package boundary.

```text
src/components/actions/button.tsx
  imports the styles asset src/styles/index.css — components may not import a
  non-TypeScript input from styles; add the layer to LAYER_ALLOWED_ASSET_DEPENDENCIES if
  this is intended
```

CSS `@import` between stylesheets is not in this graph — nothing here parses CSS, and claiming
otherwise would be a guess. `src/__tests__/accessibility/environment.test.ts` follows the entry's
relative `@import`s when it asserts the global accessibility guarantees, so moving a rule between
stylesheets cannot make one disappear.

Test files are exempt, as they are for module dependencies: a harness legitimately reads the
generated stylesheet to assert what it contains.

---

## Relative imports

A module reaches a sibling with `./` and everything else with the `@/` alias.

This was enforced by matching one specifier shape, `../../components/<category>/`, which is the
form somebody happened to think of. `../inputs/input` — a cross-category import one directory
up — passed. So did `../../lib/utils` from a component, and every deeper spelling.

It is now enforced on the resolved path: any relative specifier in a shipped module that leaves
its own directory is a violation, and the message names the canonical destination.

```text
src/components/actions/button.tsx
  imports "../inputs/input" → src/components/inputs/input.tsx — reaches category "inputs"
  with a relative path — use "@/components/inputs/…" so the dependency is visible
```

Test files are exempt from this one specifically: a harness legitimately reaches outside `src/`
for a checker script or the built manifest.

---

## Rules about the rules

The rule set is validated independently of any code, by `findRuleSetProblems`:

- **acyclic** — no two *different* layers may each depend on the other. Self-edges are how "a
  component may import a component" is expressed and are always fine.
- **transitively closed** — if `a` may depend on `b`, and `b` on `c`, then `a → c` must be
  allowed.

The second invariant is what makes checking direct edges sufficient. Without it, a chain of
individually legal imports could add up to a dependency the architecture forbids; with it,
that is impossible by construction. Adding an edge that breaks closure fails the check with the
chain spelled out:

```text
Architecture rule-set problem

  blocks may depend on components, and components on lib, but blocks → lib is not
  allowed — close the rule or drop the edge
```

---

## Other rules `check:architecture` enforces

Beyond layers:

1. `scripts/config/category-map.json` and the filesystem agree — no orphans, no phantoms
2. every component is re-exported by its category barrel, unless the file is `@barrel-exclude`
3. no module inside `src/` imports a barrel (`@/components`, `@/components/<category>`, the
   root entry) — barrel imports create cycles and defeat tree-shaking
4. relative imports do not leave their own directory, checked against the resolved file — see
   [Relative imports](#relative-imports)
5. filenames are kebab-case, and every test sits in a `__tests__/` folder beside a component of
   the same name
6. a `"use client"` directive, where one exists, is the first statement in the file — parsed as
   a statement, so the phrase in a doc comment is correctly not a directive
7. every source file is claimed by a layer, and every internal specifier resolves to a real
   file — including the `./thing.js` → `./thing.tsx` rewrite the brand subtree re-exports
   through, which used to resolve to nothing and drop that whole subtree out of the graph
8. no shipped module imports a `.css` or `.json` file — see
   [Non-TypeScript inputs](#non-typescript-inputs)

---

## Exemptions

**Test files.** Any file under a `__tests__/` folder or named `*.test.ts(x)` is exempt from
layer rules, wherever it lives — including the colocated suites in
`src/components/<category>/__tests__/`. A test is not part of the shipped module graph, and a
harness legitimately renders a component, wraps it in a provider and asserts on a lib helper in
the same file. Every other architecture rule still applies to tests.

**Nothing else.** There is no per-file escape hatch and no ignore list. If an import is illegal,
either the design is wrong or the rule is — and both are worth a conversation rather than a
suppression comment.

---

## Layers that do not exist yet

`runtime` is declared with full rules but holds no files. This
is intentional: the rules are live from the first file that lands there, so the migration cannot
start by accident in the wrong direction. See
[overview.md § Migration](./overview.md#migration).
