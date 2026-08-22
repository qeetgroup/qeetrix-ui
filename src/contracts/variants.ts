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
 * The shared tone vocabulary. A component's `variant` names should come from here so that
 * `destructive` means the same thing on a Button, a Badge, an Alert and a menu item.
 *
 * The library had three names for one tone — `destructive` (Button, Badge, Link, DropdownMenu),
 * `danger` (Alert, Banner) and `error` (Callout, Notification). `destructive` won on usage and
 * because it is what the bridge variable is called; the other two are kept as declared aliases.
 */
export const CANONICAL_VARIANTS = [
  "default",
  "primary",
  "secondary",
  "tertiary",
  "outline",
  "ghost",
  "link",
  "destructive",
  "muted",
  "info",
  "success",
  "warning",
] as const;
export type CanonicalVariant = (typeof CANONICAL_VARIANTS)[number];

/**
 * Prop names that are a *design axis*: a closed set of values that changes how a component
 * looks or how large it is, as opposed to content or behaviour.
 *
 * The manifest records a component's axes from its `cva()` call, which is statically readable.
 * A component that styles without `cva` records `null` — and `null` was doing double duty:
 * "this component has no design axis" and "this component has one and nobody wrote it down"
 * looked identical to every consumer and every docs generator.
 *
 * This list is what makes the two distinguishable. If a component's public props declare one of
 * these names, it *has* that axis, whether or not `cva` produced it — so the axis must be
 * recorded: as `cva` members, as `api.domainAxes` when the value names are domain concepts, or
 * as an `api.axisSources` note saying where the values come from. A component whose props
 * declare none of them has no axis, and that is now a derived fact rather than an absence.
 *
 * @see docs/governance/variant-axes.md
 */
export const AXIS_PROP_NAMES = [
  "variant",
  "size",
  "tone",
  "kind",
  "orientation",
  "severity",
  "intent",
  "appearance",
] as const;
export type AxisPropName = (typeof AXIS_PROP_NAMES)[number];

/**
 * Where an axis prop's values come from, when they do not come from `cva`.
 *
 * - `cva`            — the canonical case; the members are in the manifest already.
 * - `data-attribute` — the prop is written to `data-<axis>` and the styling is
 *                      `data-[<axis>=…]` utilities. A real design axis with a readable value
 *                      set; simply not expressed through `cva`.
 * - `forwarded`      — the prop is passed straight to another component's axis, so that
 *                      component's `cva` is the definition (`IconButton.size` → `Button.size`).
 * - `class-map`      — the values index a lookup table or a conditional of class strings. A
 *                      real design axis with a readable value set, one step short of `cva`.
 * - `measurement`    — a number, not a closed set: a diameter, a pixel size. Not a design axis.
 * - `layout`         — a structural choice (`orientation`) rather than an appearance.
 * - `not-an-axis`    — the name collides with the axis vocabulary but the prop is content
 *                      (`FileCard.size` is the file's byte size, rendered as text).
 */
export const AXIS_SOURCES = [
  "cva",
  "data-attribute",
  "forwarded",
  "class-map",
  "measurement",
  "layout",
  "not-an-axis",
] as const;
export type AxisSource = (typeof AXIS_SOURCES)[number];

/**
 * A recorded axis: where its values live, and a note a reviewer can check.
 * The note is prose on purpose — the machine-readable part is the axis name and the `source`.
 */
export type AxisSourceRecord = {
  source: AxisSource;
  note: string;
};

/**
 * A controlled-state triple: the authoritative prop, the uncontrolled seed, and the callback.
 *
 * The names follow one shape — `x` / `default<X>` / `on<X>Change` — so a consumer who has used
 * one stateful Qeetrix component can predict the next one.
 */
export type ControlledStateContract = {
  /** The controlled prop, e.g. `value`, `open`, `checked`. */
  value: string;
  /** The uncontrolled seed, e.g. `defaultValue`. */
  default: string;
  /** The change callback, e.g. `onValueChange`. */
  change: string;
};

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
