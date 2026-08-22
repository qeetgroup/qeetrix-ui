/**
 * The density contract.
 *
 * Density is delivered as CSS custom properties (`--qx-density-*`) switched by a root
 * `data-qx-density` attribute, which `DensityProvider` sets. A component "supports density"
 * when it sizes itself from those variables rather than from a fixed height.
 *
 * The vocabulary here is the same one `src/providers/density-provider.tsx` exposes;
 * src/__tests__/component-contract.test.ts asserts the two never drift apart.
 */

export const DENSITY_MODES = ["comfortable", "compact"] as const;
export type DensityMode = (typeof DENSITY_MODES)[number];

/** The default when no `DensityProvider` is present. */
export const DEFAULT_DENSITY_MODE = "comfortable" as const;

/** The attribute a density scope is expressed with, on the root element or a subtree. */
export const DENSITY_ATTRIBUTE = "data-qx-density" as const;

/** The custom-property prefix a density-aware component reads its metrics from. */
export const DENSITY_TOKEN_PREFIX = "--qx-density-" as const;
