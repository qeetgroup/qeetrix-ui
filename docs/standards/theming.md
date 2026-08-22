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
"brand": { "500": { "$value": "{color.orange.500}" } }
```

Re-point those nine aliases and the whole system follows — semantic tokens, the bridge,
component tokens and every component. Nothing downstream needs editing. That is the point of
having the layers.

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

`src/styles/index.css` maps the bridge onto system colours under
`@media (forced-colors: active)`: `Canvas`, `CanvasText`, `ButtonFace`, `Highlight`, `Mark`.
Shadows and the skeleton shimmer are suppressed, focus falls back to a `Highlight` outline at
the token's outline width, and overlays become opaque `Canvas`.

Because components render bridge variables rather than literal colours, a component needs no
forced-colors branch of its own.

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
| `bun run check:tokens` | ✓ | parity against the base theme, type checks, cycle detection |
| `bun run check:contrast` | ✓ | every text, focus and non-text pair measured |

A `src/tokens/theme/*` directory with **no** registry entry is a hard error in all three, and a
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
bun run check:tokens     # parity, types, references — every registered theme
bun run check:contrast   # WCAG AA + 1.4.11 — every registered theme
```

`check:contrast` is the one that matters most here. Three tiers, and the difference between the
last two is the point:

- **text/focus, blocking** — 22 pairs per theme at AA, including every feedback fill, both
  focus-ring surfaces and the four code-syntax roles.
- **non-text, blocking** — 8 pairs per theme at 3:1 (WCAG 1.4.11): the focused and invalid
  border, and each status fill against the page. These pass today; the tier exists so they cannot
  stop passing.
- **known 1.4.11 gaps, reported** — pairs that are below 3:1 *right now*. Each one has to name
  the surface, what else conveys the information, and — where nothing else does — say so. The
  register is validated both ways: a pair that climbs above its target fails as stale, so it gets
  promoted to the blocking tier instead of lingering as an excuse.

Because the bridge references semantic tokens, those pairs are the pairs that render.

---

## Non-text contrast

Four gaps are registered with **no alternate affordance**, and they are all the same token:
`color.border.default`, which `--border` *and* `--input` both reference. As a divider it is
outside 1.4.11 — a rule between two rows is decoration. As the resting boundary of a
transparent-filled control it is a real failure: 1.26:1 in light, 1.72–1.97:1 in dark, against a
3:1 requirement.

Closing it is a coordinated change, not a token tweak, which is why it is registered rather than
fixed. `--input` is rendered as a **border** by 25 components and as a **fill** (`bg-input/30`
and friends) by 28 more, so darkening it to pass would also darken every dark-mode field wash and
the light-mode Switch off-track. The fix is to split a `color.border.control` role out of
`color.border.default` and retarget `--input` to it. Measured candidates, for whoever takes that
decision:

| | now | 3:1 needs |
|:--|:--|:--|
| light, against `surface.canvas`/`default` (both white) | `neutral.200`, 1.26:1 | `neutral.400` is 2.59:1 — short. A new `neutral.450` at L 0.65 gives 3.24:1; `neutral.500` gives 4.73:1 |
| dark, against `surface.elevated` (the worst case) | `neutral.700`, 1.45:1 | `neutral.500` gives 3.19:1; `neutral.400` gives 5.83:1 |

Note the direction reverses per theme, and that `color.border.hover` (light `neutral.400`) would
have to move too, or hover would become *lighter* than rest.

Three further pairs are registered **with** an alternate affordance and need no token change:
`border.strong` (structure, not a control), `border.hover` (pointer-only, accompanied by a
background and cursor change), and `action.primary` at 2.83:1 in light (0.17 short, but the
checked state is carried by a glyph at 4.5:1 and by `aria-checked`).

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
| `*` | `border-color` and `outline-color` defaults |
| `html` | `font-sans`, antialiasing, `font-feature-settings` |
| `body` | `bg-background`, `font-sans`, `text-foreground` |
| `::selection` | selection background |
| `h1`–`h6` | `font-heading`, `tracking-tight` |
| `button`, `[role="button"]`, `input`, `select`, `textarea`, `label` | `font-family: var(--font-ui)` |
| `button:not(:disabled)`, `[role="button"]:not(:disabled)` | `cursor: pointer` |
| `[data-slot="skeleton"]` | the shimmer sweep |
| `*`, `::before`, `::after` under `prefers-reduced-motion` | all animation and transition collapsed, `!important` |

Unlayered, so it beats everything (this is intended — forced colors is not negotiable):

| Selector | Effect |
|:--|:--|
| `:root`, `.dark` under `forced-colors` | the whole bridge remapped to system colours |
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
