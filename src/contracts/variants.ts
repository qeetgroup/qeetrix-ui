/**
 * The variant/size half of the component contract.
 *
 * Qeetrix styles variants with `cva`, so the variant surface is statically readable:
 * scripts/build/manifest.mjs parses each `cva()` call and records the group names and their
 * members. Components that do not use `cva` report `null` — "not recorded", not "none".
 *
 * Nothing here breaks what already shipped: the only enforced rules are structural (no
 * duplicate or malformed variant names). The naming conventions below are reported, so the
 * library converges over time rather than by decree.
 */

/**
 * The two axes every component that has them must name consistently: the visual variant and
 * the control size. Boolean modifier groups (`selected`, `fullWidth`, `gutters`, …) are a
 * legitimate `cva` idiom and are deliberately not constrained.
 */
export const CANONICAL_VARIANT_GROUPS = ["variant", "size"] as const;
export type CanonicalVariantGroup = (typeof CANONICAL_VARIANT_GROUPS)[number];

/**
 * Synonyms for the canonical axes. Using one of these is naming drift for a concept the
 * library already has a word for, and the contract validator reports it.
 */
export const VARIANT_GROUP_ALIASES = {
  kind: "variant",
  appearance: "variant",
  style: "variant",
  type: "variant",
  scale: "size",
  sizing: "size",
  dimension: "size",
} as const;

/**
 * The recommended scale for a *control* `size` axis: `default` is the token-driven,
 * density-aware size and `icon*` are the square forms used by icon-only controls.
 *
 * This is a convergence target for controls, not a gate — layout components legitimately size
 * themselves on a different axis (`Container` has `prose`/`content`/`wide`/`full`). The
 * contract validator reports deviations under `--verbose` rather than failing on them.
 */
export const RECOMMENDED_SIZE_SCALE = [
  "xs",
  "sm",
  "default",
  "md",
  "lg",
  "xl",
  "icon",
  "icon-xs",
  "icon-sm",
  "icon-lg",
] as const;
export type RecommendedSize = (typeof RECOMMENDED_SIZE_SCALE)[number];

/**
 * The recorded variant surface of a component.
 * `null` on any field means "not recorded", which is different from an empty list.
 */
export type VariantContract = {
  /** Members of the `variant` group, e.g. `["default", "outline", "ghost"]`. */
  variants: readonly string[] | null;
  /** Members of the `size` group. */
  sizes: readonly string[] | null;
  /** Every `cva` group found, including ones beyond `variant`/`size`. */
  variantGroups: readonly string[] | null;
};
