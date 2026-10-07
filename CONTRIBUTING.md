# Contributing to `@qeetrix/ui`

## Setup

```bash
bun install
bun run build     # generates src/styles/* (gitignored) — needed before typecheck
```

Supported on **macOS and Linux**. The scripts use Node's filesystem and path APIs rather than a
POSIX shell, so Windows may work, but only Linux runs in CI — treat it as unverified.

## The one command

```bash
bun run verify
```

Types (source and test fixtures), lint, tests, and seven structural checks. If it passes, CI passes. Run
`bun run verify:package` as well when you touch `package.json` exports, the
build pipeline, or anything under `scripts/build/`.

Each check also has its own script, for when you want just one:
`check:architecture` · `check:contract` · `check:tokens` · `check:exports` ·
`check:a11y` · `check:token-usage` · `check:contrast` · `check:performance`.

Two gates sit outside `verify`, because they answer different questions:

- `bun run check:generated` — the tracked generated artifacts (`component-manifest.json`, the
  brand logo components) are what their generators produce right now.
- `bun run check:release` — the publication preflight. Everything it fails on is a decision or a
  credential, not a code defect; it fails today by design (see
  [docs/governance/release.md](./docs/governance/release.md)).

## Where things live

| | |
|:--|:--|
| A component | `src/components/<category>/<slug>.tsx` |
| Its test | `src/components/<category>/__tests__/<slug>.test.tsx` |
| Category barrel | `src/components/<category>/index.ts` |
| Which category owns which slug | `scripts/config/category-map.json` |
| Design tokens | `src/tokens/{primitive,semantic,component,theme}/**` |
| Generated token artifacts | `src/styles/tokens*` · `src/lib/token-values.ts` — never edit |
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
   [docs/standards/component-api.md](./docs/standards/component-api.md).
2. Add the slug to `scripts/config/category-map.json`.
3. Export it from the category `index.ts`.
4. Add `__tests__/<slug>.test.tsx` with at least a render assertion and an
   `axe` pass.
5. Declare it in `src/manifests/component-registry.ts` — its `status`
   (`experimental` or `beta`, not `stable`), its `accessibility` (the APG
   pattern it implements, or `"none"`), and its `api` (controlled-state
   triples, variant aliases). Everything else is derived from the source;
   don't declare what the generator can observe.
6. `bun run build:manifest` to regenerate the catalog.
7. `bun run verify` — it names anything you missed.
8. `bun run check:exports -- --update` to re-snapshot the public API. The snapshot records
   *signatures*, not just names: a prop's optionality, its declared type, a props type's
   generics and what it extends. A newly required prop or a narrowed union fails the check.
9. Set the version and write the changelog. `version.yml` bumps the patch on
   your PR; set `version` in `package.json` yourself for a `minor` (new
   exports) or `major` (removals or renames), and add the section to
   `CHANGELOG.md`. See [docs/governance/versioning.md](./docs/governance/versioning.md)
   and [docs/governance/release.md](./docs/governance/release.md).

## Moving a component between categories

Move the file and its test, update `category-map.json`, fix the barrels. **Do
not** touch anything else: `@qeetrix/ui/components/<slug>` is generated at build
time and stays stable, so consumers never see the move. `bun run verify` proves
the public surface is unchanged.

## The public API lock

`src/__tests__/public-api.json` records every exported symbol. Any addition or
removal fails `verify` until you re-snapshot it deliberately — so an API change
is always a visible line in the diff and always ships with a version bump and a
changelog entry.

To keep a symbol out of the barrel (deprecated aliases), mark the file
`@barrel-exclude`; it stays reachable only via its deep import.

## Component APIs

The rules are in [docs/standards/component-api.md](./docs/standards/component-api.md); the order
to do things in is [docs/standards/component-checklist.md](./docs/standards/component-checklist.md).
The short version:

- **`variant`** is what it looks like, **`size`** is how big, **state** is what it's doing.
  `variant="disabled"` fails `check:contract`.
- **One name per tone.** `destructive`, not `danger` or `error` — the old names still work on the
  four components that had them, declared as `api.variantAliases`.
- **Controlled state is a triple**: `x` / `default<X>` / `on<X>Change`, built with
  `useControllableState` or inherited from Base UI. Declare it in the registry.
- **Export `<Name>Props`** and nothing else from the type layer. Declared props are snapshotted,
  so removing one fails `check:exports`.
- **Extend native props, never enumerate them.** Spread `{...props}` last.
- **Composition over configuration**, flat exports (`DialogTrigger`, not `Dialog.Trigger`), and
  `render` for polymorphism — not `as` or `asChild`.
- **The styling API is `className`, `style`, `data-slot` and component tokens.** Nothing else.

## Layers

Code flows one way: `tokens → runtime / internal → components`, with blocks and
patterns built on the package entry, and with `lib`, `hooks` and `providers` as supporting layers.
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
bun run check:generated            # …and prove the committed output matches the generators
```

The manifest is a **tracked** generated file, so it has to be
reproducible: CI regenerates them and fails on any diff. Two consequences worth knowing:

- The generators emit exactly what Biome accepts, directives included. If you find yourself
  hand-fixing generated output, fix the template instead.
- The manifest carries no wall-clock stamp. `generated` is the date the catalog last *changed*,
  and story coverage is carried forward from the committed manifest when the sibling
  `qeetrix-story` repo is not checked out, so your topology cannot rewrite 137 entries.

## Adding a public import path

The `exports` map in `package.json` is an **enumerated allowlist**. There are no wildcards over
`hooks/`, `lib/`, `providers/` or `blocks/` — a new module there is internal until someone adds it
to the map, and `src/__tests__/package-contract.test.ts` makes you classify it either way. Adding
a path is a `minor`; removing one is a `major`.

Deep category paths (`@qeetrix/ui/components/actions/button`) are explicitly **denied**: the
category a component lives in is an implementation detail, and the flat
`@qeetrix/ui/components/button` façade is the contract. `bun run verify:package` proves every
published path resolves and every denied one does not, in both ESM resolution and TypeScript.
