# Contributing to `@qeetrix/ui`

## Setup

```bash
bun install
bun run build     # generates src/styles/* (gitignored) — needed before typecheck
```

## The one command

```bash
bun run verify
```

Types, lint, tests, and seven structural checks. If it passes, CI passes. Run
`bun run verify:package` as well when you touch `package.json` exports, the
build pipeline, or anything under `scripts/build/`.

Each check also has its own script, for when you want just one:
`check:architecture` · `check:contract` · `check:tokens` · `check:exports` ·
`check:a11y` · `check:token-usage` · `check:contrast`.

## Where things live

| | |
|:--|:--|
| A component | `src/components/<category>/<slug>.tsx` |
| Its test | `src/components/<category>/__tests__/<slug>.test.tsx` |
| Category barrel | `src/components/<category>/index.ts` |
| Which category owns which slug | `scripts/config/category-map.json` |
| Design tokens | `src/tokens/{primitive,semantic,component,theme}/**` |
| Generated token artifacts | `src/styles/tokens*` · `src/foundations/token-values.ts` — never edit |
| Contract types + vocabularies | `src/contracts/**` |
| A component's declared metadata | `src/manifests/component-registry.ts` |
| The generated catalog | `component-manifest.json` (never edit — `bun run build:manifest`) |
| Global test harness | `src/__tests__/` |
| Standards + governance | [`docs/`](./docs/README.md) |

Categories: `actions` · `inputs` · `selection` · `pickers` · `navigation` ·
`feedback` · `surfaces` · `data-display` · `layout` · `utility`.

## Adding a component

1. `src/components/<category>/<slug>.tsx` — kebab-case file, `cva` + `cn()`,
   `data-slot` attributes, Base UI for anything interactive, tokens for every
   colour/shadow/z-index. Add `"use client"` as the **first** line if it uses
   hooks, state or browser APIs. Follow
   [docs/standards/api-guidelines.md](./docs/standards/api-guidelines.md).
2. Add the slug to `scripts/config/category-map.json`.
3. Export it from the category `index.ts`.
4. Add `__tests__/<slug>.test.tsx` with at least a render assertion and an
   `axe` pass.
5. Declare it in `src/manifests/component-registry.ts` — its `status`
   (`experimental` or `beta`, not `stable`) and its `accessibility` (the APG
   pattern it implements, or `"none"`). Everything else is derived from the
   source; don't declare what the generator can observe.
6. `bun run build:manifest` to regenerate the catalog.
7. `bun run verify` — it names anything you missed.
8. `bun run check:exports -- --update` to re-snapshot the public API.
9. `bun run changeset` — `minor` for new exports, `major` for removals or
   renames. See [docs/governance/versioning.md](./docs/governance/versioning.md).

## Moving a component between categories

Move the file and its test, update `category-map.json`, fix the barrels. **Do
not** touch anything else: `@qeetrix/ui/components/<slug>` is generated at build
time and stays stable, so consumers never see the move. `bun run verify` proves
the public surface is unchanged.

## The public API lock

`src/__tests__/public-api.json` records every exported symbol. Any addition or
removal fails `verify` until you re-snapshot it deliberately — so an API change
is always a visible line in the diff and always ships with a changeset.

To keep a symbol out of the barrel (deprecated aliases), mark the file
`@barrel-exclude`; it stays reachable only via its deep import.

## Layers

Code flows one way: `tokens → foundations → runtime/primitives → components →
blocks`, with `lib`, `hooks`, `providers` and `brand` as supporting layers.
Dependencies are **deny by default** — the allow-list lives in
`src/contracts/layers.ts` and `bun run check:architecture` enforces it against
the real module graph. A component may never import a block.

Full table: [docs/architecture/dependency-rules.md](./docs/architecture/dependency-rules.md).

## Conventions

- Files and folders are kebab-case; exported components are PascalCase.
- Import siblings and other categories through the `@/` alias, never `../../`.
- Never import a barrel (`@/components`, `@/components/<category>`) from inside
  `src/` — it creates cycles and defeats tree-shaking.
- No raw colours, z-indexes, coloured shadows or bare lengths. Colours that are domain data
  go in `scripts/config/raw-value-exemptions.json` with a reason; the pre-existing length
  backlog is ratcheted in `scripts/config/raw-dimension-baseline.json` and may only shrink.
- Components consume **component or semantic** tokens, never primitives — the palette is not
  published to the runtime stylesheet, so it will not resolve. See
  [docs/standards/tokens.md](./docs/standards/tokens.md).
- Component-internal copy is plain English. Localization belongs to the
  consuming product — expose a prop instead of a translation key.

## Regenerating things

```bash
bun run build:tokens               # src/styles/tokens.{css,raw.css,json}
bun run build:manifest             # component-manifest.json
node scripts/build/logos.mjs       # src/brand/logos/*.tsx from the raw SVGs
```
