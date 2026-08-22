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

The build takes one Style Dictionary instance per theme (`scripts/build/tokens.mjs`), keyed by
directory. A third theme means:

1. `src/tokens/theme/<name>/{semantic,bridge,chart,component}.json` — the same paths, new values
2. the theme's selector in the build (`:root` for light, `.dark` for dark)
3. `ThemeProvider`'s union, and the parity check's theme list

Parity is enforced across every theme in that list, so an incomplete theme fails the gate rather
than silently inheriting.

---

## What to check when a theme changes

```bash
bun run check:tokens     # parity, types, references
bun run check:contrast   # WCAG AA on every text and focus pair, in every theme
```

`check:contrast` is the one that matters most here: it holds 18 pairs per theme to AA, including
every feedback fill and both focus-ring surfaces. Because the bridge references semantic tokens,
those pairs are the pairs that render.
