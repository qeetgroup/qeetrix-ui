# Architecture overview

`@qeetrix/ui` is the Qeet Group design system: one package that ships design tokens, brand
assets and 137 React components, consumed by every Qeet product. It has exactly one job — make
the same interface decisions available everywhere, and keep them from drifting.

That only works if the structure is enforced rather than described. This document is the map.
Some of its rules run in CI (`build`, `typecheck`, `lint`, `test`); the ones whose checkers were
removed in 01dce7a are marked as held in review.

---

## The shape of the package

```text
src/
├── tokens/        W3C DTCG token source (primitive + light/dark theme)   — data
├── styles/        the CSS entry + generated token CSS/JSON               — generated
├── contracts/     types + vocabularies that describe a component         — governance
├── manifests/     the manifest's type, and the declarations it is built from
├── runtime/       headless behaviour: focus trap, overlay, collapse, storage
├── lib/           framework-free helpers (cn, motion, responsive) + generated token values
├── hooks/         React hooks over lib + browser APIs
├── providers/     theme · density · direction · messages
├── internal/      shared pieces the components wrap — never published
├── components/    97 family folders, each with index.ts + __tests__/
├── blocks/        copy-paste sections of product screens — never published
├── patterns/      copy-paste layout solutions — never published
├── __tests__/     global harness: setup, axe smoke, SSR, hydration, token governance
└── index.ts       the published barrel
```

The typed token values JavaScript reads are generated into `lib/token-values.ts`. Every
directory above is populated. See [Migration](#migration) below.

---

## Layers and dependency direction

Code flows one way:

```text
tokens → runtime / internal → components
```

with `lib`, `hooks` and `providers` as supporting layers that may never reach forward
into `components` or `blocks`.

Layer membership and the permitted edges are declared in
[`src/contracts/layers.ts`](../../src/contracts/layers.ts). Dependencies are **deny by
default**: an import is legal only if the target layer appears in the source layer's allow-list.
The checker that enforced this (`scripts/check/architecture.mjs`) was removed in 01dce7a, so the
table is held in review. The full table, and why each edge exists, is in
[dependency-rules.md](./dependency-rules.md); what each layer is *for* is in
[component-layers.md](./component-layers.md).

Two properties of the rule set are themselves checked:

- **acyclic** — no two layers may each depend on the other
- **transitively closed** — if `a → b` and `b → c` are legal, `a → c` must be legal too

The second one matters more than it looks. Without it, a chain of individually permitted
imports could add up to a dependency the architecture forbids. With it, checking direct edges
is sufficient.

---

## Public versus internal

The published surface is **only** what the entry points export:

| Specifier | Source |
|:--|:--|
| `@qeetrix/ui` | `src/index.ts` — the full barrel |
| `@qeetrix/ui/components/<slug>` | one component, stable regardless of its family folder |
| `@qeetrix/ui/components/<Family>` | a family group (`Pagination`) |
| `@qeetrix/ui/providers` | `src/providers` |
| `@qeetrix/ui/providers/<name>` | one provider |
| `@qeetrix/ui/hooks/<name>` | the four public hooks — `use-media-query`, `use-mobile`, `use-motion`, `use-prefers-reduced-motion` |
| `@qeetrix/ui/lib/<name>` | the four public helpers — `utils` (`cn`), `motion`, `responsive`, `token-values` |
| `@qeetrix/ui/styles.css` · `/qeetrix.css` · `/tokens.css` · `/tokens.json` | the stylesheet (one entry, host-global rules included) + the generated token files |
| `@qeetrix/ui/manifest.json` | the generated component manifest |

Paths outside the map resolve to nothing: `@qeetrix/ui/hooks/use-controllable-state` (it is on
the barrel), `src/contracts/`, `src/manifests/`, `src/runtime/` and `src/internal/`. Two paths
resolve through the `components/*` wildcard without being supported —
`@qeetrix/ui/components/<Family>/<slug>` and `@qeetrix/ui/components/index`; consumers use the
flat `components/<slug>` path or the barrel. The
*governance data* is public as `@qeetrix/ui/manifest.json`; the TypeScript that produces it is
not, so it can keep evolving without a semver event.

The surface used to be held by an export check (`scripts/check/exports.mjs`) with a symbol lock
(`public-api.json`) and a signature lock (`public-props.json`). All three were removed in 01dce7a.
What holds it now:

1. **explicit exports** — every name is a line in a family `index.ts`, in `src/index.ts`, or an
   entry in the `exports` map, so an addition or removal is a visible line in the diff, to ship
   with a version bump and a changelog entry;
2. **the build** — `scripts/build/subpath-shims.mjs` fails on a compiled component module that
   `scripts/config/component-map.json` does not name, so nothing is published by accident;
3. **review** — for what the locks used to catch mechanically: a required prop becoming optional,
   a union losing a member, two barrel modules exporting the same name (`export *` drops a
   colliding symbol silently).

Internal structure is therefore free to move. The published deep-import paths are generated by
[`scripts/build/subpath-shims.mjs`](../../scripts/build/subpath-shims.mjs), so a component can
change family without a consumer noticing.

---

## Components versus blocks

A **component** is a single interface element with a prop-level API: `Button`, `Dialog`,
`DataTable`. It composes tokens, other components and hooks, knows nothing about any product,
and contains no copy that a product would want to change.

A **block** is a ready-made section of a product screen built from components — an access
review, an audit record, a notification inbox — and a **pattern** is a proven arrangement of
components for a recurring layout (list + detail). Both live in `src/blocks/` and `src/patterns/`
as copy-paste source: they are never published, and an app copies the file and adapts it.

The direction is absolute: **a component may never import a block.** A component that needs
something a block has is describing a missing component.

---

## Runtime versus internal

Both layers are populated. `runtime` holds `focus-trap`, `overlay`, `overlay-position`,
`collapse` and `storage`; `internal` holds the `portal` and `visually-hidden` primitives plus the
helpers several families share. The distinction is what each may contain:

- **runtime** — framework-level behaviour with no markup: focus management, overlay
  positioning, collapse, storage. Headless, testable without rendering.
- **internal** — renderable pieces and shared helpers that carry no design decision of their own,
  which the public components wrap. Never published.

Neither may import `components`, `blocks` or `patterns`.

---

## Tokens versus token values

- **tokens** are *data*: W3C DTCG JSON under `src/tokens/`, compiled by Style Dictionary into
  CSS custom properties and JSON. They import nothing and are imported by nothing —
  `scripts/build/tokens.mjs` reads them.
- **token values** are the few tokens JavaScript has to read as values — durations and easings
  for animation, icon sizes and strokes, the geometry Sidebar and Tour position with. Code
  imports those, never token JSON; everything else is a `--qx-*` CSS variable.

They live in [`src/lib/token-values.ts`](../../src/lib/token-values.ts), **generated** from the
token source by `bun run build:tokens` and published as `@qeetrix/ui/lib/token-values`.

The primitive layer is deliberately **not published to the stylesheet components render
against** — `src/styles/tokens.css` carries the semantic and component layers only. That turns
"components must not depend on primitive values" from a convention into a fact: the variable is
not there to resolve. See [docs/standards/tokens.md](../standards/tokens.md).

---

## Contracts

[`src/contracts/`](../../src/contracts/) holds the types and closed vocabularies that describe
a component: its status, capabilities, interaction states, variant surface, ARIA pattern,
layer. It has one dependency rule — **contracts may only import contracts** — which is what
lets build scripts read it.

Every vocabulary is declared once as an `as const` array with the union type derived from it,
so the runtime list and the compile-time type cannot disagree. The build and check scripts read
the same declarations statically through
[`scripts/lib/ts-literals.mjs`](../../scripts/lib/ts-literals.mjs), and
`src/__tests__/component-contract.test.ts` pins that reader against TypeScript's own view.

The result is that `tsc` is the *first* gate. An invalid status or ARIA pattern in the registry
is a compile error, with a "did you mean" hint, before any script runs.

---

## Manifests

[`component-manifest.json`](../../component-manifest.json) is the published projection of the
contract. It is generated by
[`scripts/build/manifest.mjs`](../../scripts/build/manifest.mjs) from three inputs and nothing
else:

1. the filesystem + `scripts/config/component-map.json` — identity, family, layer
2. the component source — capabilities, states, `cva` variants, client boundary, test coverage
3. [`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts) — the
   declared facts that cannot be derived: status, ARIA pattern, reviewed capability overrides,
   deprecations

Anything neither derivable nor declared is emitted as `"unknown"` / `null`. **A missing fact
and a negative fact are different things** — only the first is a backlog item. The full schema
is documented in [component-manifest.md](../standards/component-manifest.md).

---

## Validation

CI runs `build`, `typecheck`, `lint` and `test`; if those pass locally, CI passes.

| Command | Enforces |
|:--|:--|
| `build` | the manifest generates; no compiled component module is missing from the component map |
| `typecheck` | TypeScript across the package, every test, the blocks and patterns, and the playground — including the contract types on the registry |
| `lint` | Biome; blocks and patterns import only the public packages |
| `test` | every component's suite with axe, SSR and hydration, the token graph (layer direction, references, cycles, types, theme parity) and WCAG AA on every semantic text/surface pair in both themes, a playground example per manifest module |

Not enforced since 01dce7a removed `scripts/check/`: layer boundaries, the export and signature
locks, the manifest contract check, the raw-value scan, the packed-tarball check.

---

## Release governance

- **Design tokens** — [docs/standards/tokens.md](../standards/tokens.md)
- **Theming · density · motion · RTL** — [theming](../standards/theming.md) ·
  [density](../standards/density.md) · [motion](../standards/motion.md) ·
  [rtl](../standards/rtl.md)
- **Versioning** — [docs/governance/versioning.md](../governance/versioning.md)
- **Component maturity** — [docs/governance/component-status.md](../governance/component-status.md)
- **Deprecation** — [docs/governance/deprecations.md](../governance/deprecations.md)
- **API conventions** — [docs/standards/component-api.md](../standards/component-api.md)

Changes ship by merging to `main` ([release.md](../governance/release.md)). A public API change
is a version raised to the right level with its changelog entry and — when a component's status
or contract changes — an updated registry entry.

---

## Migration

The generated token values, briefly a `foundations/` layer of their own, are written straight
to `src/lib/token-values.ts`, holding only what code reads.

Every layer declared in [`src/contracts/layers.ts`](../../src/contracts/layers.ts) now holds
files: `runtime/` and `internal/` were populated by moving behaviour out of individual
components, one module at a time, rather than moving 137 components to satisfy a diagram.

Because the published deep-import paths are generated rather than mirrored from `src/`, a later
move is invisible to consumers. With the API lock gone, confirm that by reading the barrel and
`exports` diff; a migration can still go one layer at a time behind green CI.
