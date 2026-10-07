# Contributing to `@qeetrix/ui`

## Setup

```bash
bun install
bun run build     # generates src/styles/* (gitignored) — needed before typecheck
```

Supported on **macOS and Linux**. The scripts use Node's filesystem and path APIs rather than a
POSIX shell, so Windows may work, but only Linux runs in CI — treat it as unverified.

## The checks

```bash
bun run build && bun run typecheck && bun run lint && bun run test
```

That is exactly what CI runs ([`ci.yml`](./.github/workflows/ci.yml)), so if it passes locally, CI
passes. The README's [Develop](./README.md#-develop) section lists what each command enforces and
what nothing enforces any more: the `scripts/check/` scripts (architecture, API lock, raw-value
scan, package contents, bundle and coverage budgets) were removed on 2026-08-23.

## Where things live

| | |
|:--|:--|
| A component | `src/components/<Family>/<slug>.tsx` |
| Its test | `src/components/<Family>/__tests__/<slug>.test.tsx` |
| Family barrel | `src/components/<Family>/index.ts` |
| Which family owns which slug | `scripts/config/component-map.json` |
| Its playground example | `playground/src/examples/<family>.tsx` |
| Copy-paste blocks and patterns | `src/blocks/` · `src/patterns/` (never published) |
| Design tokens | `src/tokens/{primitive,semantic,component,theme}/**` |
| Generated token artifacts | `src/styles/tokens*` · `src/lib/token-values.ts` — never edit |
| Contract types + vocabularies | `src/contracts/**` |
| A component's declared metadata | `src/manifests/component-registry.ts` |
| The generated catalog | `component-manifest.json` (never edit — `bun run build:manifest`) |
| Global test harness | `src/__tests__/` |
| Standards + governance | [`docs/`](./docs/README.md) |

There are 97 families, one folder each: a component and its close relatives (`Pagination`
holds `pagination` and `pagination-bar`).

## Adding a component

1. `src/components/<Family>/<slug>.tsx` — kebab-case file, `cva` + `cn()`,
   `data-slot` attributes, Base UI for anything interactive, tokens for every
   colour/shadow/z-index. Add `"use client"` as the **first** line if it uses
   hooks, state or browser APIs. Follow
   [docs/standards/component-api.md](./docs/standards/component-api.md).
2. Add the slug under its family in `scripts/config/component-map.json`.
3. Export it from the family's `index.ts`.
4. Add `__tests__/<slug>.test.tsx` with at least a render assertion and an
   `axe` pass.
5. Declare it in `src/manifests/component-registry.ts` — its `status`
   (`experimental` or `beta`, not `stable`), its `accessibility` (the APG
   pattern it implements, or `"none"`), and its `api` (controlled-state
   triples, variant aliases). Everything else is derived from the source;
   don't declare what the generator can observe.
6. Add a playground example for the slug — the playground's coverage test fails without one.
7. `bun run build:manifest` to regenerate the catalog, then run [the checks](#the-checks).
8. Set the version and write the changelog. `version.yml` bumps the patch on
   your PR; set `version` in `package.json` yourself for a `minor` (new
   exports) or `major` (removals or renames), and add the section to
   `CHANGELOG.md`. See [docs/governance/versioning.md](./docs/governance/versioning.md)
   and [docs/governance/release.md](./docs/governance/release.md).

## Moving a component between families

Move the file and its test, update `component-map.json`, fix the barrels. **Do
not** touch anything else: `@qeetrix/ui/components/<slug>` is generated at build
time and stays stable, so consumers never see the move. Nothing checks the public
surface automatically, so read the barrel diff to confirm it is unchanged.

## Public API changes

There is no automated API lock any more (`src/__tests__/public-api.json` went with the checks).
An addition or removal shows as a change to a family `index.ts`, `src/index.ts` or the `exports`
map in `package.json`: review those lines, and ship the change with a version bump and a
changelog entry.

To keep a symbol out of the barrel (deprecated aliases), leave it out of the family's `index.ts`
and mark the file `@barrel-exclude`, so the manifest records its deep import.

## Component APIs

The rules are in [docs/standards/component-api.md](./docs/standards/component-api.md); the order
to do things in is [docs/standards/component-checklist.md](./docs/standards/component-checklist.md).
The short version:

- **`variant`** is what it looks like, **`size`** is how big, **state** is what it's doing.
  `variant="disabled"` is not allowed.
- **One name per tone.** `destructive`, not `danger` or `error` — the old names still work on the
  four components that had them, declared as `api.variantAliases`.
- **Controlled state is a triple**: `x` / `default<X>` / `on<X>Change`, built with
  `useControllableState` or inherited from Base UI. Declare it in the registry.
- **Export `<Name>Props`** and nothing else from the type layer. Removing or renaming a declared
  prop is a breaking change.
- **Extend native props, never enumerate them.** Spread `{...props}` last.
- **Composition over configuration**, flat exports (`DialogTrigger`, not `Dialog.Trigger`), and
  `render` for polymorphism — not `as` or `asChild`.
- **The styling API is `className`, `style`, `data-slot` and component tokens.** Nothing else.

## Layers

Code flows one way: `tokens → runtime / internal → components`, with blocks and
patterns built on the package entry, and with `lib`, `hooks` and `providers` as supporting layers.
Dependencies are **deny by default** — the allow-list lives in
`src/contracts/layers.ts`. No check enforces it today, so it is held in review. A component may
never import a block.

Full table: [docs/architecture/dependency-rules.md](./docs/architecture/dependency-rules.md).

## Conventions

- Files are kebab-case; family folders and exported components are PascalCase.
- Import siblings and other families through the `@/` alias, never `../../`.
- Never import a barrel (`@/components`, `@/components/<Family>`) from inside
  `src/` — it creates cycles and defeats tree-shaking.
- No raw colours, z-indexes, coloured shadows or bare lengths. Nothing scans for them any more,
  so review catches them; colours that are domain data (a chart series, a brand swatch) say why
  in a comment.
- Components consume **component or semantic** tokens, never primitives — the palette is not
  published to the runtime stylesheet, so it will not resolve. See
  [docs/standards/tokens.md](./docs/standards/tokens.md).
- Component-internal copy is plain English. Localization belongs to the
  consuming product — expose a prop instead of a translation key.

## Regenerating things

```bash
bun run build:tokens               # src/styles/tokens.{css,raw.css,json}
bun run build:manifest             # component-manifest.json
```

The manifest is a **tracked** generated file, so commit it whenever it changes. CI rebuilds it but
does not compare it with the committed copy, so it has to be reproducible on its own:

- The generators emit exactly what Biome accepts, directives included. If you find yourself
  hand-fixing generated output, fix the template instead.
- The manifest carries no wall-clock stamp. `generated` is the date the catalog last *changed*,
  and story coverage is carried forward from the committed manifest when the sibling
  `qeetrix-story` repo is not checked out, so your topology cannot rewrite 137 entries.

## Adding a public import path

The `exports` map in `package.json` is an **enumerated allowlist**. There are no wildcards over
`hooks/`, `lib/`, `providers/` or `blocks/` — a new module there is internal until someone adds it
to the map. Adding a path is a `minor`; removing one is a `major`.

Family paths (`@qeetrix/ui/components/Button/button`) also resolve through the `components/*`
wildcard, but they are not supported: the family a component lives in is an implementation
detail, and the flat `@qeetrix/ui/components/button` façade is the contract.
