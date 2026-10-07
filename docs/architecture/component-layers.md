# Component layers

Every `.ts`/`.tsx` file under `src/` belongs to exactly one layer. Membership is by directory,
declared in [`src/contracts/layers.ts`](../../src/contracts/layers.ts) as `LAYER_DIRECTORIES`,
and a file that no layer claims breaks the contract — there is no "other". (Held in review: the
architecture checker that failed on it was removed in 01dce7a.)

Layers are listed here from most foundational to most composed.

---

## tokens — `src/tokens/`

**What it is.** The single source of truth for every colour, space, radius, shadow, duration,
easing and z-index, authored as W3C DTCG JSON (primitives → light/dark semantic + shadcn
bridge).

**What it may import.** Nothing. Tokens are data. `scripts/build/tokens.mjs` reads them and
emits CSS custom properties and JSON; no TypeScript module imports token JSON directly.

**Why it is a layer at all.** So `tokens → components` is a rule the checker can state, not an
assumption. Data must not know about the things that consume it.

---

## styles — `src/styles/`

**What it is.** `index.css` (the Tailwind v4 entry, `@font-face` declarations, base layer) plus
the generated `tokens.css`, `tokens.raw.css` and `tokens.json`.

**What it may import.** Nothing, in the module-graph sense. The generated files are gitignored;
never edit them.

---

## contracts — `src/contracts/`

**What it is.** The types and closed vocabularies that describe and govern a component:
`ComponentStatus`, `ComponentCapabilities`, `AriaPattern`, `InteractionState`, the layer table
itself.

**What it may import.** Only `contracts`.

**Why the rule is that strict.** The build and check scripts are plain `.mjs` run by node — they
cannot import TypeScript, so they read these declarations *statically*
([`scripts/lib/ts-literals.mjs`](../../scripts/lib/ts-literals.mjs)). A contract that imported
a component could not be read that way, and `tsc` would stop being the first gate.

---

## manifests — `src/manifests/`

**What it is.** The type of the generated `component-manifest.json`, and
`component-registry.ts` — the declared facts (status, ARIA pattern, capability overrides,
deprecations) that cannot be derived from source.

**What it may import.** `contracts`, `manifests`.

**Why it is separate from contracts.** Contracts describe the *shape* of governance; manifests
hold the *data*. Keeping them apart means the shape can be reused without pulling 60 component
declarations along with it.

---

## runtime — `src/runtime/`

**What it is.** Framework-level behaviour with no markup: focus management, collection and
selection handling, keyboard navigation, stable id generation. Headless, and testable without
rendering anything.

**What it may import.** `runtime`, `tokens`.

**What it may never import.** `components`, `blocks`, `internal`. Runtime is
component-agnostic — behaviour is passed *into* it, not looked up.

---

## lib — `src/lib/`

**What it is.** Framework-free helpers: `cn()`, the motion helpers, the responsive query
builders, the generated token values.

**What it may import.** `lib`, `runtime`, `tokens`.

**Note.** `lib` is where `runtime` currently lives in fact, and it holds the generated
`token-values.ts`: the token values code reads as JavaScript.

---

## hooks — `src/hooks/`

**What it is.** React hooks over `lib` and browser APIs: `useMediaQuery`, `useIsMobile`,
`useMotion`, `usePrefersReducedMotion`.

**What it may import.** `hooks`, `lib`, `runtime`, `tokens`.

**What it may never import.** `components`, `blocks`. A hook that needs to render is a
component.

---

## internal — `src/internal/`

**What it is.** Pieces several families share but no consumer imports: the portal and
visually-hidden primitives the public `Portal` and `VisuallyHidden` wrap, the field recipe, the
copy-feedback swap, the logical-side resolver, the swatch tone. Not published.

**What it may import.** `internal`, `hooks`, `lib`, `runtime`, `tokens`.

**What it may never import.** `components`, `providers`, `blocks`, `patterns` — pass a value in
(`usePhysicalSide(side, useDirection())`) rather than reaching up.

---

## providers — `src/providers/`

**What it is.** The cross-cutting React contexts: `ThemeProvider` (light/dark/system),
`DensityProvider` (comfortable/compact), `DirectionProvider` (ltr/rtl).

**What it may import.** `providers`, `hooks`, `lib`, `runtime`, `contracts`,
`tokens`.

**What it may never import.** `components`, `blocks`. A provider wraps `children`; it renders no
interface of its own.

---

## components — `src/components/<Family>/`

**What it is.** The library: 137 modules in 97 family folders — a component and its close
relatives (`Pagination` holds `pagination` and `pagination-bar`). Family ownership is declared in
[`scripts/config/component-map.json`](../../scripts/config/component-map.json).

**What it may import.** `components`, `internal`, `providers`, `hooks`, `lib`, `runtime`,
`contracts`, `tokens`.

**What it may never import.** `blocks`, `patterns`.

**Note on families.** A family is a *filing decision*, not an architectural boundary — the
published import path (`@qeetrix/ui/components/<slug>`) is flat, so moving a component between
families is invisible to consumers. Cross-family imports are normal and go through the `@/`
alias.

**Every module in a family folder is public.** `scripts/build/subpath-shims.mjs` publishes the
flat path for each slug in [`scripts/config/component-map.json`](../../scripts/config/component-map.json)
and **fails the build** on any compiled module in `src/components/<Family>/` the map does not name
— otherwise `"./components/*"` would publish it by accident. A helper several families share but
no consumer should import (the field recipe, the copy-feedback swap, the logical-side resolver,
the swatch tone) therefore lives in `src/internal/`, the non-public layer, not beside the
component that first needed it. `internal` may not import `components` or `providers`: pass the
value in (`usePhysicalSide(side, useDirection())`) rather than reaching up.

---

## blocks and patterns — `src/blocks/`, `src/patterns/`

**What they are.** Compositions built *from* the library and never published with it. A
**block** is a ready-made section of a product screen with a product idea baked in (an access
review, an audit record, a notification inbox). A **pattern** is a proven arrangement of
components for a recurring layout or flow (list + detail). Neither is a component:
`tsconfig.build.json` leaves both folders out of `dist/`, so `@qeetrix/ui` stays the component
library and nothing else. Apps copy a block or pattern file and adapt it.

**What they may import.** Only the package — `@qeetrix/ui` — plus `@qeetrix/icons` (root import)
and React: exactly what an app that copies the file has. `biome check` enforces that, rejecting
`@/…`, `../` and per-icon imports there. In `LAYER_ALLOWED_DEPENDENCIES` both layers sit above
everything, so the table stays transitively closed.

**What imports them.** Nothing in the package. The playground's pattern pages import them, as an
app would after copying them. Each keeps its tests in `__tests__/`, run by `bun run test` and
type-checked by `bun run typecheck`.

---

## entry — `src/index.ts`

**What it is.** The published barrel. It composes the surface and is matched *exactly* by the
layer table, not as a path prefix, so a future `src/index-legacy.ts` would not silently inherit
its permissions.

**What it may import.** Anything except the test harness.

---

## tests — `src/__tests__/`, and any `__tests__/` folder

**What it is.** The global harness (setup, axe smoke, SSR, hydration, token governance) plus the
colocated suites in each family folder.

**Dependency rules do not apply.** A test file is not part of the shipped module graph — a
harness legitimately renders a component, wraps it in a provider and asserts on a lib helper in
one file. Exemption is by path (`__tests__/` or `*.test.ts(x)`), wherever the file lives.
