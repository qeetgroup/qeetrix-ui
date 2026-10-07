# Component layers

Every `.ts`/`.tsx` file under `src/` belongs to exactly one layer. Membership is by directory,
declared in [`src/contracts/layers.ts`](../../src/contracts/layers.ts) as `LAYER_DIRECTORIES`,
and a file that no layer claims fails `bun run check:architecture` — there is no "other".

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

## foundations — `src/foundations/`

**What it is.** The typed values derived from tokens — `DURATION`, `EASING`, `Z_INDEX`,
`ICON_SIZE`, `SHADOW`, `COMPONENT`, `STATE_OPACITY`, `CHART_COLOR`. Framework-free, no React,
no dependencies.

**Generated.** `src/foundations/token-values.ts` is written by `bun run build:tokens` from
`src/tokens/**` and is gitignored, like the token CSS. It is the only place these values exist
in code; [`src/lib/token-values.ts`](../../src/lib/token-values.ts) re-exports it so the
published `@qeetrix/ui/lib/token-values` path keeps resolving.

**What it may import.** `foundations`, `tokens`. In practice: nothing.

**Still filed under `lib`.** `lib/motion.ts` and `lib/responsive.ts` are token-derived helpers
that belong here; moving them is a later phase.

---

## runtime — `src/runtime/`

**What it is.** Framework-level behaviour with no markup: focus management, collection and
selection handling, keyboard navigation, stable id generation. Headless, and testable without
rendering anything.

**What it may import.** `runtime`, `foundations`, `tokens`.

**What it may never import.** `components`, `blocks`, `primitives`. Runtime is
component-agnostic — behaviour is passed *into* it, not looked up.

---

## lib — `src/lib/`

**What it is.** Framework-free helpers: `cn()`, the motion helpers, the responsive query
builders, the generated token values.

**What it may import.** `lib`, `runtime`, `foundations`, `tokens`.

**Note.** `lib` is where `foundations` and `runtime` currently live in fact. As those layers are
populated, `lib` shrinks to genuinely miscellaneous helpers.

---

## hooks — `src/hooks/`

**What it is.** React hooks over `lib` and browser APIs: `useMediaQuery`, `useIsMobile`,
`useMotion`, `usePrefersReducedMotion`.

**What it may import.** `hooks`, `lib`, `runtime`, `foundations`, `tokens`.

**What it may never import.** `components`, `blocks`. A hook that needs to render is a
component.

---

## primitives — `src/primitives/`

**What it is.** The smallest renderable pieces that carry no design opinion: a slot, a
polymorphic element, a portal, a visually-hidden wrapper. They render; they do not decide how
anything looks.

**What it may import.** `primitives`, `hooks`, `lib`, `runtime`, `foundations`, `tokens`.

**What it may never import.** `components`, `blocks`, `providers`.

**Where it lives today.** `components/utility/portal.tsx`,
`components/utility/visually-hidden.tsx`, `components/utility/focus-trap.tsx`.

---

## providers — `src/providers/`

**What it is.** The cross-cutting React contexts: `ThemeProvider` (light/dark/system),
`DensityProvider` (comfortable/compact), `DirectionProvider` (ltr/rtl).

**What it may import.** `providers`, `hooks`, `lib`, `runtime`, `foundations`, `contracts`,
`tokens`.

**What it may never import.** `components`, `blocks`. A provider wraps `children`; it renders no
interface of its own.

---

## brand — `src/brand/`

**What it is.** The Qeet logos (theme-adaptive wrappers over `@qeetrix/icons`, the single source
of the artwork) and the custom Qeet icon set.

**What it may import.** `brand`, `lib`, `runtime`, `foundations`, `tokens`. In practice it
imports nothing internal — it is an asset leaf.

---

## components — `src/components/<category>/`

**What it is.** The library: 145 modules across ten categories (`actions`, `inputs`,
`selection`, `pickers`, `navigation`, `feedback`, `surfaces`, `data-display`, `layout`,
`utility`). Category ownership is declared in
[`scripts/config/category-map.json`](../../scripts/config/category-map.json).

**What it may import.** `components`, `primitives`, `providers`, `brand`, `hooks`, `lib`,
`runtime`, `foundations`, `contracts`, `tokens`.

**What it may never import.** `blocks`.

**Note on categories.** A category is a *filing decision*, not an architectural boundary — the
published import path (`@qeetrix/ui/components/<slug>`) is flat, so moving a component between
categories is invisible to consumers. Cross-category imports are normal and go through the `@/`
alias.

**Every module in a family folder is public.** `scripts/build/subpath-shims.mjs` publishes the
flat path for each slug in [`scripts/config/component-map.json`](../../scripts/config/component-map.json)
and **fails the build** on any compiled module in `src/components/<Family>/` the map does not name
— otherwise `"./components/*"` would publish it by accident. A helper several families share but
no consumer should import (the field recipe, the copy-feedback swap, the logical-side resolver,
the swatch tone) therefore lives in `src/internal/`, the non-public layer, not beside the
component that first needed it. `internal` may not import `components` or `providers`: pass the
value in (`usePhysicalSide(side, useDirection())`) rather than reaching up. (The source tree
today uses `src/components/<Family>/` and `src/internal/`; the `primitives` layer described above
is the target, not yet the layout.)

---

## blocks — `src/blocks/`

**What it is.** Page-level compositions: `AuthShell`, `DashboardShell`, `SettingsLayout`,
`OnboardingWizard`, `PricingTable`, `PageState`. They exist so several products do not each
rebuild the same screen.

**What it may import.** Everything below it — `components`, `primitives`, `providers`, `brand`,
`hooks`, `lib`, `runtime`, `foundations`, `contracts`, `tokens` — plus other blocks.

**What imports it.** Only `@qeetrix/ui/blocks`. Nothing inside `src/` may import a block except
another block.

---

## entry — `src/index.ts`

**What it is.** The published barrel. It composes the surface and is matched *exactly* by the
layer table, not as a path prefix, so a future `src/index-legacy.ts` would not silently inherit
its permissions.

**What it may import.** Anything except the test harness.

---

## tests — `src/__tests__/`, and any `__tests__/` folder

**What it is.** The global harness (setup, a11y smoke, hydration, client boundaries, API lock,
governance) plus the colocated suites under each category.

**Dependency rules do not apply.** A test file is not part of the shipped module graph — a
harness legitimately renders a component, wraps it in a provider and asserts on a lib helper in
one file. Exemption is by path (`__tests__/` or `*.test.ts(x)`), wherever the file lives.
