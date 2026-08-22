---
"@qeetrix/ui": minor
---

**A third theme directory was built by nothing and checked by nothing, and `useTheme()` did not
return the `resolvedTheme` the documentation promised.**

The theme list was the literal `["light", "dark"]` in three separate files — the token build, the
graph validator and the contrast gate — so `src/tokens/theme/<name>/` for any other name silently
did not exist. Adding a theme meant editing code in three places and hoping you found all three.
That is what "theme extensibility is closed" meant in practice.

- **`scripts/config/themes.json` is now the single theme list.** A theme is a directory of token
  overrides plus one entry naming the CSS selector its variables are published under. The build,
  `check:tokens` (parity, types, cycles) and `check:contrast` all read it, and all three now
  **hard-fail** on a theme directory with no entry or an entry with no directory. A theme is either
  fully governed or it fails loudly; there is no quiet middle.
- Selectors are written in the registry rather than derived, because a brand theme's selector is a
  cascade decision: `[data-qx-theme="acme"]` and `.dark` have equal specificity, so a brand that
  also varies by colour scheme needs a selector that says so. `THEME_ATTRIBUTE` in
  `src/contracts/theme.ts` spells the `data-qx-theme` convention once.
- **`useTheme()` returns `resolvedTheme`.** `light` or `dark`, never `system`. It is set from the
  same computation that puts the class on `<html>`, so the two cannot disagree — a consumer picking
  an image asset from it always matches what the CSS is doing. During SSR, and on the first render
  of a `system` provider with no `matchMedia`, it reports `light`, which is what `:root` renders
  with no `.dark` class; that is documented as a hydration hazard for markup, same as `theme`.

The trade-off, stated plainly: **themes stay build-time, by decision.** There is no
`registerTheme()` and no runtime theme object, because the palette is deliberately absent from the
published stylesheet — a theme added at runtime could not resolve a primitive, so it could only
re-point semantic variables the build already emitted, which is a CSS override you can write
today. `docs/standards/theming.md § Adding a theme` says so instead of implying otherwise.

Generated output is unchanged: same variables, same selectors, same order.
