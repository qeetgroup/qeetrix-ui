# Dependency rules

Dependencies between layers are **deny by default**. An import is legal only if the target
layer appears in the source layer's allow-list in
[`src/contracts/layers.ts`](../../src/contracts/layers.ts). Nothing is permitted by omission —
if a layer needs a new edge, someone adds it deliberately and the reason ends up in a diff.

> **Held in review today.** The checker that enforced this against the real module graph
> (`scripts/check/architecture.mjs`, `bun run check:architecture`) was removed on 2026-08-23
> (01dce7a). The graph analysis it used is still in
> [`scripts/lib/layers.mjs`](../../scripts/lib/layers.mjs), so restoring the check means wiring
> that module to a script; until then, nothing fails a build on a forbidden import.

The rules are written against the **resolved file**, never against the shape of the specifier
that named it: `../Input/input` and `@/components/Input/input` are the same dependency, so a rule
cannot be evaded by spelling an import differently. `.css` and `.json` files count too — see
[Non-TypeScript inputs](#non-typescript-inputs).

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
| `blocks` | `entry` · `components` · `internal` · `providers` · `hooks` · `lib` · `runtime` · `manifests` · `contracts` · `tokens` | `styles` · `blocks` · `patterns` |
| `patterns` | `entry` · `components` · `internal` · `providers` · `hooks` · `lib` · `runtime` · `manifests` · `contracts` · `tokens` | `styles` · `blocks` · `patterns` |
| `entry` | `components` · `internal` · `providers` · `hooks` · `lib` · `runtime` · `manifests` · `contracts` · `tokens` | `styles` · `blocks` · `patterns` · `entry` |

`tests` is absent from the table on purpose: test files are exempt (see
[Exemptions](#exemptions)).

---

## The forbidden edges that matter

These follow from the table, but they are the ones worth knowing by heart. Each has a
hand-written explanation in `LAYER_RULE_EXPLANATIONS`, so a checker can say *why*, not just
*no*.

| Forbidden | Why |
|:--|:--|
| `tokens → components` | tokens are data and must not reach into component code |
| `runtime → components` | runtime is component-agnostic; pass behaviour in instead |
| `internal → components` | an internal primitive must not depend on a composed component |
| `contracts → components` | contracts must stay readable by build scripts; keep them type-only |
| `hooks → components` | a hook must not render or import components |
| `providers → components` | providers wrap children; they must not import components |

The removed checker reported each violation with its source file, the dependency, the rule, and
— when the illegal edge sat behind legal ones — the whole chain.

---

## Non-TypeScript inputs

A stylesheet and a token file are dependencies. They used to sit outside the graph entirely: the
traversal collected `.ts` and `.tsx` and nothing else, so a component could `import
"@/styles/index.css"` or `import colors from "@/tokens/primitive/color.json"` and
`check:architecture` would report a clean TypeScript tree.

They are nodes, with layers like any other file, governed by a second table —
`LAYER_ALLOWED_ASSET_DEPENDENCIES`. Deny by default, and **currently empty**: no shipped
TypeScript module may import a `.css` or `.json` file (held in review, like the module rules).

Two different reasons for two different tables:

- `components` may depend on the `tokens` layer, because it reads *generated TypeScript* derived
  from it. Importing a raw token JSON is a different act — it bypasses the CSS bridge, ships the
  whole token file into the bundle, and hides where the component's colours come from.
- A stylesheet is a side effect. A component that imports one has decided, on behalf of every
  consumer, that the styles load. That is the choice `styles.css` exists to make once, at the
  package boundary.


CSS `@import` between stylesheets is not in this graph — nothing here parses CSS, and claiming
otherwise would be a guess. The test that followed the entry's relative `@import`s to assert the
global accessibility guarantees was removed in 01dce7a; `token-governance.test.ts` still asserts
the host-global section of `styles.css` and that every published CSS entry exists.

Test files are exempt, as they are for module dependencies: a harness legitimately reads the
generated stylesheet to assert what it contains.

---

## Relative imports

A module reaches a sibling with `./` and everything else with the `@/` alias. Any relative
specifier in a shipped module that leaves its own directory hides a cross-family dependency, so
it is not allowed: `../Input/input` from a Button file should be `@/components/Input/input`.

The removed checker enforced this on the resolved path, so every spelling was caught; today it is
held in review. Blocks and patterns are the exception that *is* enforced: Biome rejects `../`, `@/`
and per-icon imports in `src/blocks/` and `src/patterns/`.

---

## Rules about the rules

The rule set can be validated independently of any code, by `findRuleSetProblems` in
`scripts/lib/layers.mjs` (nothing runs it automatically since 01dce7a; the table passes it):

- **acyclic** — no two *different* layers may each depend on the other. Self-edges are how "a
  component may import a component" is expressed and are always fine.
- **transitively closed** — if `a` may depend on `b`, and `b` on `c`, then `a → c` must be
  allowed.

The second invariant is what makes checking direct edges sufficient. Without it, a chain of
individually legal imports could add up to a dependency the architecture forbids; with it,
that is impossible by construction. An edge that breaks closure is reported with the chain
spelled out:

```text
Architecture rule-set problem

  blocks may depend on components, and components on lib, but blocks → lib is not
  allowed — close the rule or drop the edge
```

---

## Other structural rules

Beyond layers — enforced by the architecture checker until 01dce7a, held in review now:

1. `scripts/config/component-map.json` and the filesystem agree — no orphans, no phantoms (the
   build's subpath-shim step still fails on a compiled module the map does not name)
2. every component is re-exported by its family barrel, unless the file is `@barrel-exclude`
3. no module inside `src/` imports a barrel (`@/components`, `@/components/<Family>`, the root
   entry) — barrel imports create cycles and defeat tree-shaking
4. relative imports do not leave their own directory — see [Relative imports](#relative-imports)
5. filenames are kebab-case, and every test sits in a `__tests__/` folder beside a component of
   the same name
6. a `"use client"` directive, where one exists, is the first statement in the file
7. every source file is claimed by a layer, and every internal specifier resolves to a real file
8. no shipped module imports a `.css` or `.json` file — see
   [Non-TypeScript inputs](#non-typescript-inputs)

---

## Exemptions

**Test files.** Any file under a `__tests__/` folder or named `*.test.ts(x)` is exempt from
layer rules, wherever it lives — including the colocated suites in
`src/components/<Family>/__tests__/`. A test is not part of the shipped module graph, and a
harness legitimately renders a component, wraps it in a provider and asserts on a lib helper in
the same file. Every other architecture rule still applies to tests.

**Nothing else.** There is no per-file escape hatch and no ignore list. If an import is illegal,
either the design is wrong or the rule is — and both are worth a conversation rather than a
suppression comment.
