# Dependency rules

Dependencies between layers are **deny by default**. An import is legal only if the target
layer appears in the source layer's allow-list in
[`src/contracts/layers.ts`](../../src/contracts/layers.ts). Nothing is permitted by omission —
if a layer needs a new edge, someone adds it deliberately and the reason ends up in a diff.

`bun run check:architecture` enforces this against the real module graph. Imports are resolved
to files with TypeScript's own dependency scanner and the tsconfig `@/*` alias, so re-exports,
type-only imports and dynamic `import()` are all seen and nothing is matched by substring.

---

## The table

Read a row as "this layer may import…". Same-layer imports are listed explicitly, because two
layers (`tokens`, `styles`) legitimately have no internal imports at all and one (`contracts`)
must stay closed.

| Layer | May import | May not import |
|:--|:--|:--|
| `tokens` | — | `styles` · `contracts` · `manifests` · `foundations` · `runtime` · `lib` · `hooks` · `primitives` · `providers` · `brand` · `components` · `blocks` · `entry` |
| `styles` | — | `tokens` · `contracts` · `manifests` · `foundations` · `runtime` · `lib` · `hooks` · `primitives` · `providers` · `brand` · `components` · `blocks` · `entry` |
| `contracts` | `contracts` | `tokens` · `styles` · `manifests` · `foundations` · `runtime` · `lib` · `hooks` · `primitives` · `providers` · `brand` · `components` · `blocks` · `entry` |
| `manifests` | `contracts` · `manifests` | `tokens` · `styles` · `foundations` · `runtime` · `lib` · `hooks` · `primitives` · `providers` · `brand` · `components` · `blocks` · `entry` |
| `foundations` | `foundations` · `tokens` | `styles` · `contracts` · `manifests` · `runtime` · `lib` · `hooks` · `primitives` · `providers` · `brand` · `components` · `blocks` · `entry` |
| `runtime` | `runtime` · `foundations` · `tokens` | `styles` · `contracts` · `manifests` · `lib` · `hooks` · `primitives` · `providers` · `brand` · `components` · `blocks` · `entry` |
| `lib` | `lib` · `runtime` · `foundations` · `tokens` | `styles` · `contracts` · `manifests` · `hooks` · `primitives` · `providers` · `brand` · `components` · `blocks` · `entry` |
| `hooks` | `hooks` · `lib` · `runtime` · `foundations` · `tokens` | `styles` · `contracts` · `manifests` · `primitives` · `providers` · `brand` · `components` · `blocks` · `entry` |
| `primitives` | `primitives` · `hooks` · `lib` · `runtime` · `foundations` · `tokens` | `styles` · `contracts` · `manifests` · `providers` · `brand` · `components` · `blocks` · `entry` |
| `providers` | `providers` · `hooks` · `lib` · `runtime` · `foundations` · `contracts` · `tokens` | `styles` · `manifests` · `primitives` · `brand` · `components` · `blocks` · `entry` |
| `brand` | `brand` · `lib` · `runtime` · `foundations` · `tokens` | `styles` · `contracts` · `manifests` · `hooks` · `primitives` · `providers` · `components` · `blocks` · `entry` |
| `components` | `components` · `primitives` · `providers` · `brand` · `hooks` · `lib` · `runtime` · `foundations` · `contracts` · `tokens` | `styles` · `manifests` · `blocks` · `entry` |
| `blocks` | `blocks` · `components` · `primitives` · `providers` · `brand` · `hooks` · `lib` · `runtime` · `foundations` · `contracts` · `tokens` | `styles` · `manifests` · `entry` |
| `entry` | `blocks` · `components` · `primitives` · `providers` · `brand` · `hooks` · `lib` · `runtime` · `foundations` · `manifests` · `contracts` · `tokens` | `styles` |

`tests` is absent from the table on purpose: test files are exempt (see
[Exemptions](#exemptions)).

---

## The forbidden edges that matter

These follow from the table, but they are the ones worth knowing by heart. Each has a
hand-written explanation in `LAYER_RULE_EXPLANATIONS` so the checker says *why*, not just
*no*.

| Forbidden | Why |
|:--|:--|
| `tokens → components` | tokens are data; data must not know its consumers |
| `tokens → blocks` | same |
| `foundations → components` | foundations sit below components; invert the dependency |
| `foundations → blocks` | same |
| `runtime → components` | runtime is component-agnostic — pass behaviour in |
| `runtime → blocks` | same |
| `primitives → components` | a primitive must not depend on a composed component |
| `primitives → blocks` | a primitive must not depend on a block |
| `components → blocks` | blocks compose components, never the reverse |
| `contracts → components` | contracts must stay statically readable by build scripts |
| `hooks → components` | a hook that needs to render is a component |
| `providers → components` | a provider wraps `children`; it renders no interface |

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
4. cross-category imports go through the `@/` alias, never `../../<other-category>`
5. filenames are kebab-case, and every test sits in a `__tests__/` folder beside a component of
   the same name
6. a `"use client"` directive, where one exists, is the first statement in the file — parsed as
   a statement, so the phrase in a doc comment is correctly not a directive
7. every source file is claimed by a layer, and every `@/` specifier resolves to a real file

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

`foundations`, `runtime` and `primitives` are declared with full rules but hold no files. This
is intentional: the rules are live from the first file that lands there, so the migration cannot
start by accident in the wrong direction. See
[overview.md § Migration](./overview.md#migration).
