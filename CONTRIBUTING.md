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

Types, lint, tests, and five structural checks. If it passes, CI passes. Run
`bun run verify:package` as well when you touch `package.json` exports, the
build pipeline, or anything under `scripts/build/`.

## Where things live

| | |
|:--|:--|
| A component | `src/components/<category>/<slug>.tsx` |
| Its test | `src/components/<category>/__tests__/<slug>.test.tsx` |
| Category barrel | `src/components/<category>/index.ts` |
| Which category owns which slug | `scripts/config/category-map.json` |
| Design tokens | `src/tokens/**` (never edit `src/styles/tokens*` — generated) |
| Global test harness | `src/__tests__/` |

Categories: `actions` · `inputs` · `selection` · `pickers` · `navigation` ·
`feedback` · `surfaces` · `data-display` · `layout` · `utility`.

## Adding a component

1. `src/components/<category>/<slug>.tsx` — kebab-case file, `cva` + `cn()`,
   `data-slot` attributes, Base UI for anything interactive, tokens for every
   colour/shadow/z-index. Add `"use client"` as the **first** line if it uses
   hooks, state or browser APIs.
2. Add the slug to `scripts/config/category-map.json`.
3. Export it from the category `index.ts`.
4. Add `__tests__/<slug>.test.tsx` with at least a render assertion and an
   `axe` pass.
5. `bun run verify` — it names anything you missed.
6. `node scripts/check/exports.mjs --update` to re-snapshot the public API.
7. `bun run changeset` — `minor` for new exports, `major` for removals or
   renames.

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

## Conventions

- Files and folders are kebab-case; exported components are PascalCase.
- Import siblings and other categories through the `@/` alias, never `../../`.
- Never import a barrel (`@/components`, `@/components/<category>`) from inside
  `src/` — it creates cycles and defeats tree-shaking.
- No raw colours, z-indexes or coloured shadows. Documented exceptions go in
  `scripts/config/raw-value-exemptions.json` with a reason.
- Component-internal copy is plain English. Localization belongs to the
  consuming product — expose a prop instead of a translation key.

## Regenerating things

```bash
node scripts/build/tokens.mjs      # src/styles/tokens.{css,raw.css,json}
node scripts/build/manifest.mjs    # component-manifest.json
node scripts/build/logos.mjs       # src/brand/logos/*.tsx from the raw SVGs
```
