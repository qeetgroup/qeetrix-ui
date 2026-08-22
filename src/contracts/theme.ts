/**
 * The theme contract.
 *
 * Every colour, shadow and radius in the library resolves from a semantic token that has a
 * value in both `:root` and `.dark`. Two gates already hold that invariant — `token-usage`
 * rejects raw colours in component source, and `contrast` holds every semantic text/surface
 * pair to WCAG AA in *both* themes — which is why `capabilities.darkMode` is derived from
 * the token discipline rather than declared per component.
 *
 * The vocabulary mirrors `src/providers/theme-provider.tsx`;
 * src/__tests__/component-contract.test.ts asserts they stay in step.
 */

/** What a consumer may ask for. `system` follows `prefers-color-scheme`. */
export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** What `system` resolves to. */
export const RESOLVED_THEME_MODES = ["light", "dark"] as const;
export type ResolvedThemeMode = (typeof RESOLVED_THEME_MODES)[number];

export const DEFAULT_THEME_MODE = "system" as const;

/** The class the dark theme is switched with. */
export const THEME_DARK_CLASS = "dark" as const;

/** The custom-property prefix every Qeetrix token is emitted under. */
export const TOKEN_PREFIX = "--qx-" as const;
