# Theming

Light and dark expose **the same semantic vocabulary**. Only the values differ. That single rule
is what keeps theme handling out of component code.

```tsx
// Right — one class, correct in both themes.
<div className="bg-card text-card-foreground" />

// Wrong — the component now owns a theme decision.
<div className={theme === "dark" ? "bg-neutral-850" : "bg-white"} />
```

If a component needs to know the theme in order to look right, a token is missing.

---

## How a theme resolves

```text
color.surface.elevated        the semantic name a component means
        ↓  theme/light/semantic.json → {color.neutral.0}
        ↓  theme/dark/semantic.json  → {color.neutral.800}
--qx-color-surface-elevated   declared in :root, redeclared in .dark
        ↓
--popover                     the bridge variable, referencing the semantic one
        ↓  @theme: --color-popover: var(--popover)
bg-popover                    the utility a component writes
```

Switching theme replaces one CSS custom property scope. No component re-renders to change
colour, and nothing recomputes in JavaScript.

---

## ThemeProvider

```tsx
import { ThemeProvider } from "@qeetrix/ui";

<ThemeProvider defaultTheme="system" storageKey="qeet-theme">
  <App />
</ThemeProvider>
```

Its responsibilities, and only these:

- **selection** — `light` · `dark` · `system`
- **system preference** — follows `prefers-color-scheme` when set to `system`, and keeps
  following it as it changes
- **persistence** — `localStorage`, under `storageKey`
- **the DOM contract** — toggles the `.dark` class on `<html>`
- **SSR safety** — first render matches the server, then reconciles

`useTheme()` returns `{ theme, resolvedTheme, setTheme }`. `resolvedTheme` is `light` or `dark`
— never `system` — for the rare case something genuinely needs to know, such as picking an
image asset or a third-party widget's own theme prop.

It is set from the same computation that puts the class on `<html>`, so the two cannot disagree.
Before the first client effect runs it is *derived*, not observed: during SSR, and on the first
render of a `system` provider where `matchMedia` is unavailable, it reports `light` — which is
what `:root` renders when no `.dark` class is present. Branching **markup** on it is a hydration
hazard for the same reason branching on `theme` is; branching a side effect on it is fine.

The keyboard shortcut (`Ctrl`/`Meta`+`Shift`+`D`) is **opt-in** via `enableKeyboardShortcut`.
An opt-in shortcut can change in a minor; a default one cannot.

What the provider does *not* do: it holds no component styling, no colour values, and no
per-component special cases. Those belong to the token layer.

---

## Re-branding

The brand ramp is one alias hop from the palette:

```json
"brand": { "500": { "$value": "{color.qeet.500}" } }
```

`color.qeet` is Qeet's own ramp — 13 steps, 50…950 plus 150 and 550, built in OKLCH on the same
lightness ladder as the status ramps, with `qeet.500` exactly `#F26D0E`. It is not an alias of
Tailwind orange. Re-point the thirteen `brand` aliases and the whole system follows — semantic
tokens, the bridge, component tokens and every component. Nothing downstream needs editing. That
is the point of having the layers.

Two properties of the ramp that a re-brand has to re-check rather than assume:

- **Two oranges: brand and action.** `#F26D0E` (`qeet.500`) is the brand colour — identity,
  the logo, accents, brand text on dark — but it carries white at only 3.0:1. Filled actions and
  checked controls use **Qeet Ember** (`qeet.600`, `#D04800`), the deepest shade that keeps the
  orange vivid while carrying a white label at 4.55:1 (5.1:1 hover, 5.7:1 pressed), in both
  themes. As a fill it also clears 3:1 against the page in both (4.4:1 light canvas, 4.3:1 dark
  canvas), which `#F26D0E` never did on white. This is the brand-orange / accessible-orange split mature orange brands use. Steps past
  500 shift toward red (47° → 32°) instead of only darkening, so deep oranges stay ember, not brown.
- **Dark mode is neutral near-black.** Graphite is effectively achromatic at the dark end (page
  `#0e0d0d`, cards `#131312`): warm chroma at that lightness reads as brown. For the same reason
  the dark *selected* surface is a neutral lift, not an orange tint; the Qeet signal on a selected
  item is its `border.brand` indicator and brand-coloured icon or check.
- **`brand.500` is a fill, not a text colour.** Brand-coloured text is `color.text.brand`
  (`qeet.700` light, `qeet.400` dark); links are `color.text.link` / `link-hover`. Step 700 is the
  AA text step on light surfaces and 400 on dark — the same rule holds for every ramp.

Retuning corners is one variable: `--radius`. The Tailwind corner ramp is derived from it with
`calc()`, and the semantic corner roles reference the ramp, so overriding `--radius` at runtime
retunes every corner in the library:

```css
:root { --radius: 0.75rem; }
```

---

## Overriding a token in an application

Override at the layer that matches the intent:

```css
/* One component's look — the narrowest change. */
:root { --qx-component-card-corner: var(--radius-2xl); }

/* A meaning, everywhere it is used. */
:root { --qx-color-surface-rail: var(--qx-color-surface-sunken); }

/* The shadcn contract, if a consumer already themes against it. */
:root { --primary: oklch(0.6 0.2 250); }
```

Do **not** override a primitive to change an appearance — the palette is not published to the
runtime stylesheet, so it will not resolve. Change the semantic token that points at it.

---

## Forced colors

`src/styles/base.css` maps the bridge onto system colours under
`@media (forced-colors: active)`: `Canvas`, `CanvasText`, `ButtonFace`, `Highlight`, `Mark`.
Shadows and the skeleton shimmer are suppressed, focus falls back to a `Highlight` outline at
the token's outline width, and overlays become opaque `Canvas`.

Most of a component needs no forced-colors branch of its own: text, borders and plain fills are
forced by the browser. What does need one is any **state that is carried by a fill** — the
browser removes authored fills, so a highlighted menu item or a selected day would otherwise look
exactly like its neighbours. There is one recipe per kind of state, and only these three:

| The state is shown by… | Forced-colours treatment | How |
|:--|:--|:--|
| **a fill behind a label** — a highlighted menu item or option, the active tab, the current nav or sidebar item, a selected calendar day or availability slot, a pressed toggle or toolbar button, the active segment, the current step marker | the system selection: `Highlight` fill and edge, `HighlightText` for the item **and every descendant** | `forced-colors-selected`, under the state's variant: `data-highlighted:forced-colors-selected`, `data-[active]:forced-colors-selected`, `data-pressed:forced-colors-selected`, `aria-selected:forced-colors-selected` |
| **an indicator with no text on it** — a selection bar, a checkbox box, a radio dot, a switch track, a slider range, a progress fill | `Highlight` directly | `forced-colors:bg-[Highlight]` / `forced-colors:before:bg-[Highlight]` / `forced-colors:border-[Highlight]` |
| **a container with content** — a selected card, file card, checkbox card or radio card | a `Highlight` **edge**, never a fill (a fill would turn a whole card of content into selection colour) | `forced-colors:data-selected:border-[Highlight]` |

Plain **hover** paints nothing in forced colours. The bridge maps the hover fills (`--accent`,
`--sidebar-accent`, and the sidebar's selected tint) to `Canvas` / `CanvasText`; keyboard users
see the `Highlight` focus outline instead, and menus and listboxes still highlight under the
pointer, because Base UI's `data-highlighted` follows it.

### Why the recipe opts out of adjustment

Under `forced-color-adjust: auto`, Chromium paints a `Canvas` **text backplate** behind every
glyph. `HighlightText` on a `Highlight` fill therefore renders white on white: the fill shows
around the text, and the text vanishes into its own backplate. Until the integration pass the
bridge mapped `--accent` to `Highlight` / `HighlightText`, so every `hover:bg-accent
hover:text-accent-foreground` had this bug. `forced-colors-selected` sets
`forced-color-adjust: none` on the item, which removes the backplate, and then names every colour
it paints — including `HighlightText` for each descendant, because under `none` a descendant's
authored colour (a brand check, muted secondary text) would otherwise show through. Everything
in it is `!important`: this is a user accessibility mode, and no authored state tint may outrank
it. The utility is defined once, in `src/styles/index.css`.

### Opting a control out

`base.css` re-asserts `forced-color-adjust: auto` on native controls and on the control roles
(`button`, `[role=option]`, `[role=tab]`, …), so a control nested in a subtree that opted out — a
chart, a rating — still takes part in forced colours. That rule is a **layered default** (`@layer
base`): a component's own `forced-colors:forced-color-adjust-none` beats it without `!`. It used
to be unlayered, which silently disabled every opt-out written without `!` (colour swatches,
segmented-control labels). Opt out only where colour is the information (a swatch, a chart
series, a QR tile) and name system colours for everything else you paint.

## State variants

shadcn's state variants — `data-active:`, `data-checked:`, `data-open:`, `data-selected:`,
`data-disabled:` and the rest, from `shadcn/tailwind.css` — wrap their selector in `:where()`, so
they add **no specificity** and lose to `hover:` and `focus-visible:` on the same property. A
selected sidebar item turned grey under the pointer; a pressed rich-text link button lost its tint.

Qeetrix components therefore spell a state that must hold against hover in the **attribute
form** — `data-[active]:`, `data-[selected]:`, `data-[checked]:` — which compiles to
`[data-active]` and is ordered after `hover:`, and give the hovered state its own step
(`data-[active]:hover:bg-brand-subtle-hover`). The attribute form matches **presence**, so a
component writes the attribute only while the state holds: `data-active={active || undefined}`
(Base UI's `useRender` state and its own parts already do). shadcn's variants are left as they
ship, because a consumer's classes compile against the same stylesheet; `index.css` redefines
only `data-selected:`, to match presence the way its siblings do.

The shorter variant is fine for a property nothing else on the element sets (`data-open:animate-in`).

---

## Adding a theme

**Themes are build-time. This is a decision, not a limitation we intend to lift.** There is no
`registerTheme()` and no runtime theme object, because the palette is deliberately absent from
the published stylesheet: a theme registered at runtime could not resolve a primitive, so it
could only re-point semantic variables the build had already emitted — which is a CSS override,
and you can write one today (see *Overriding a token in an application*).

What a theme *is*: a directory of token overrides plus one entry in
[`scripts/config/themes.json`](../../scripts/config/themes.json) naming the CSS selector its
variables are published under.

```json
{ "name": "acme", "selector": "[data-qx-theme=\"acme\"]", "description": "why this theme exists" }
```

Two steps, and both are required:

1. `src/tokens/theme/<name>/{semantic,bridge,chart,component,syntax}.json` — the same paths, new
   values. Only the tokens that differ; everything else inherits.
2. the registry entry above.

That is all. The registry — not a list in any script — is what makes the theme real:

| | reads the registry | so a registered theme gets |
|:--|:--|:--|
| `scripts/build/tokens.mjs` | ✓ | its variables emitted under its selector, in `tokens.css` |
| `src/__tests__/token-governance.test.ts` | ✓ | the token-graph rules — parity against the base theme, types, cycles — and 207 contrast pairs |

A `src/tokens/theme/*` directory with **no** registry entry is a hard error in the build, and a
registry entry with no directory is too. Before the registry existed the theme list was the
literal `["light", "dark"]` in those three files, so a third directory was built by nothing and
checked by nothing — it silently did not exist.

`light` is the **base theme**: its selector is `:root`, and parity is measured against it, so a
colour another theme omits is reported rather than quietly inherited.

Selectors are written in the registry rather than derived because a brand theme's selector is a
cascade decision. `[data-qx-theme="acme"]` and `.dark` have the same specificity, so whichever is
emitted later wins — a brand that also varies by colour scheme needs a selector that says so
(`.dark [data-qx-theme="acme"]`), and only the person adding it knows which. `THEME_ATTRIBUTE` in
[`src/contracts/theme.ts`](../../src/contracts/theme.ts) spells the `data-qx-theme` convention
once; nothing in `src/` reads it, so a host sets the attribute itself.

`ThemeProvider` is not involved. Its `theme` prop is the *colour-scheme* vocabulary — `light`,
`dark`, `system` — which is what a user agent has a preference for. A brand theme is a build
artifact the host selects.

---

## What to check when a theme changes

```bash
bun run build:tokens
bunx vitest run src/__tests__/token-governance.test.ts
```

The governance test reads the theme registry, so a new theme is measured the moment it is
registered. It holds three things, per theme:

- **the token graph** — every rule in `scripts/lib/tokens.mjs`: layer direction, references,
  types, cycles, cross-component coupling, undocumented literals, theme parity;
- **207 contrast pairs**, measured on the generated `tokens.css` the browser receives — `var()`
  chains followed, `color-mix()` mixed, translucent fills (selection, the dark field wash, the
  status tints) composited over the surface they sit on. 139 are text at 4.5:1: every text role
  on all eleven surfaces, links and brand text, the on-brand label on rest/hover/pressed, status
  text on its own subtle surface, the bridge pairs components actually paint with, the sidebar,
  placeholder inside a field, selected text, and six syntax roles on three code surfaces. 68 are
  non-text at 3:1 (WCAG 1.4.11): `border.control`, `--input`, `--ring` and `border.brand` on all
  eleven surfaces, the sidebar indicator, the field border on its own fill, and the chart series
  and chart chrome;
- **theme-scoped values** — elevation and the surface-fade gradient must be authored per theme,
  and `base.css` must declare each theme's `color-scheme`.

Because the bridge references semantic tokens, those pairs are the pairs that render.

---

## Non-text contrast

Resting control boundaries have their own role, `color.border.control`, and `--input` references
it. That closes the gap this section used to register: `--input` was `color.border.default`, a
divider colour, at 1.26:1 in light and 1.72:1 in dark.

| | `border.control` | `border.control-hover` | worst surface |
|:--|:--|:--|:--|
| light | `graphite.450` | `graphite.600` | 3.07:1 on `surface.brand-subtle-hover` (3.8:1 on white) |
| dark | `graphite.450` | `graphite.400` | 3.32:1 on `surface.interactive-hover` (4.7:1 on `surface.default`) |

`--input` is painted as a **border** by about 25 components and as a **fill** by about 28 more
(`dark:bg-input/30` and friends, shadcn's idiom). A 3:1 boundary at the old fill percentages would
have turned every dark field into a grey slab, so the fills were rescaled to keep their previous
visual weight: `/30 → /12`, `/40 → /16`, `/disabled → /20` on hover, `/80 → /35` when disabled,
and `dark:border-input → dark:border-border-strong` where the border was decorative (outline
button, chip, active tab). Consumer components written against shadcn that derive fills from
`--input` will look heavier in dark mode and should do the same.

Still below 3:1, deliberately:

- `border.default` and `border.subtle` — dividers and card edges, decoration rather than a
  control boundary, so outside 1.4.11.

---

## CSS entry points

Four are published. They are not alternatives to each other:

| Entry | File | What it is |
|:--|:--|:--|
| `@qeetrix/ui/styles.css` | `src/styles/index.css` | **The one to import.** Tailwind + tokens + fonts + the `@theme` mapping + the host-global base layer. |
| `@qeetrix/ui/qeetrix.css` | `src/styles/tokens.css` | Generated. The semantic + component + bridge variables, no primitives, no utilities. For a consumer theming against the variables without Tailwind. |
| `@qeetrix/ui/tokens.css` | `src/styles/tokens.raw.css` | Generated. The same, **plus** the primitive ramps, all `--qx-` prefixed. For design tooling that wants the palette. |
| `@qeetrix/ui/tokens.json` | `src/styles/tokens.json` | Generated. Resolved values per theme, for anything that is not CSS. |

The names do not make the `qeetrix.css` / `tokens.css` distinction obvious — that is a naming
mistake preserved for compatibility. The one-line rule: **`qeetrix.css` is what a component can
resolve; `tokens.css` additionally contains what it deliberately cannot.**

---

## What styles.css does to your document

`styles.css` is a **host-global side effect**, and this is the full extent of it. Every rule lives
in [`src/styles/base.css`](../../src/styles/base.css), which the entry imports; the set is locked
by `src/__tests__/token-governance.test.ts`, so adding one is a reviewed change.

Inside `@layer base` (so any host rule of equal specificity that is unlayered wins):

| Selector | Effect |
|:--|:--|
| `:root`, `.dark` | `color-scheme: light` / `dark`, so browser-drawn UI (scrollbars, form controls, autofill) follows the theme |
| `*` | `border-color` and `outline-color` defaults |
| `html` | `font-sans`, antialiasing, `font-feature-settings` |
| `body` | `bg-background`, `font-sans`, `text-foreground` |
| `::selection` | selection background |
| `h1`–`h6` | `font-heading`, `tracking-tight` |
| `button`, `[role="button"]`, `input`, `select`, `textarea`, `label`, and the menu, sidebar and breadcrumb text slots | `font-family: var(--font-ui)` |
| `button:not(:disabled)`, `[role="button"]:not(:disabled)` | `cursor: pointer` |
| `[data-slot="skeleton"]` | the shimmer sweep |
| `*`, `::before`, `::after` under `prefers-reduced-motion` | all animation and transition collapsed, `!important` |
| native controls and control roles under `forced-colors` | `forced-color-adjust: auto` — a default a component's own opt-out overrides (§ Forced colors) |

Unlayered, so it beats everything (this is intended — forced colors is not negotiable):

| Selector | Effect |
|:--|:--|
| `:root`, `.dark` under `forced-colors` | the whole bridge remapped to system colours; hover fills to `Canvas` |
| `*` under `forced-colors` | `box-shadow`/`text-shadow` removed, `!important` |
| `:focus-visible` under `forced-colors` | `Highlight` outline, `!important` |
| a handful of `[data-slot=…]` rules | overlays opaque, skeleton stilled, chart and rating opted out of the forced palette |

Plus 17 `@font-face` declarations (three Qeet families and Fira Code) and `@import "tailwindcss"`,
which brings **Tailwind Preflight** — a full element reset — with it.

There is deliberately **no scoped variant**. Making `styles.css` apply only inside a Qeetrix
subtree would change what an existing import does, which is a major-version decision and a
visual-regression exercise, not a refactor. Splitting the globals into `base.css` is the
non-breaking half: the blast radius now has a name, a boundary, and a test. If your application
cannot accept the table above, that is the conversation to have — not a flag to add.
