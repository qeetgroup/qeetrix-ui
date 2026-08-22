/**
 * The theme contract.
 *
 * Every colour, shadow and radius in the library resolves from a semantic token that has a
 * value in every registered theme. Two gates already hold that invariant — `token-usage`
 * rejects raw colours *and named Tailwind palette utilities* in component source, and `contrast`
 * holds every semantic text/focus pair to WCAG AA and every control-boundary pair to 1.4.11 in
 * *every* registered theme — which is why `capabilities.darkMode` is derived from the token
 * discipline rather than declared per component.
 *
 * **Themes are build-time, by decision.** A theme is a directory of token overrides under
 * `src/tokens/theme/<name>/` plus an entry in `scripts/config/themes.json` naming the CSS
 * selector its variables are published under. There is no runtime theme registry and no
 * `registerTheme()`, because the palette is deliberately absent from the published stylesheet:
 * a theme that could be added at runtime could not resolve a primitive, so it could only
 * re-point semantic tokens the build already emitted — which a consumer can do today with a
 * stylesheet override. What the registry buys is that a new theme is *governed*: the build emits
 * it, `check:tokens` holds it to parity against the base theme, and `check:contrast` measures
 * every pair in it. An unregistered `src/tokens/theme/*` directory is a hard error in all three,
 * so a half-wired theme fails loudly instead of being silently skipped.
 *
 * `THEME_MODES` below is the *colour-scheme* vocabulary — what `ThemeProvider` switches. It is
 * intentionally not the registry: `light` and `dark` are the two schemes a user agent has a
 * preference for, while a brand theme is a build artifact the host selects with
 * `THEME_ATTRIBUTE`. See docs/standards/theming.md.
 *
 * The vocabulary mirrors `src/providers/theme-provider.tsx`;
 * src/__tests__/component-contract.test.ts asserts they stay in step.
 */

/** What a consumer may ask for. `system` follows `prefers-color-scheme`. */
export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** What `system` resolves to, and what `useTheme().resolvedTheme` reports. */
export const RESOLVED_THEME_MODES = ["light", "dark"] as const;
export type ResolvedThemeMode = (typeof RESOLVED_THEME_MODES)[number];

export const DEFAULT_THEME_MODE = "system" as const;

/** The class the dark theme is switched with. */
export const THEME_DARK_CLASS = "dark" as const;

/**
 * The attribute a registered brand theme is selected with.
 *
 * The convention the registry expects for anything other than `light`/`dark`:
 * `[data-qx-theme="<name>"]`. Nothing in `src/` reads it — it exists so the selector a theme is
 * registered under is spelled once, and so a host setting it is writing a documented contract
 * rather than guessing.
 */
export const THEME_ATTRIBUTE = "data-qx-theme" as const;

/** The custom-property prefix every Qeetrix token is emitted under. */
export const TOKEN_PREFIX = "--qx-" as const;
