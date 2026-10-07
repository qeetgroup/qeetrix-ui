/**
 * The density contract.
 *
 * Density is delivered as CSS custom properties (`--qx-density-*`) switched by a
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

/**
 * What a component's `capabilities.density` value is allowed to mean.
 *
 * This exists because the four words are not interchangeable, and the derivation used to treat
 * two of them as one. Source inspection can prove `supported` — the component reads a density
 * metric, directly or through a component token that resolves to one. It cannot prove
 * `not-applicable`, which is a *claim about design intent*: that this component would look no
 * different at any density and never should. Reporting every non-participating component as
 * `not-applicable` made 125 of 145 families assert a design decision nobody made, and because
 * the contract ratchet counts only `unknown`, the manifest showed no backlog at all.
 *
 *   supported      — reads a density metric today. Derivable from source.
 *   unsupported    — should respond to density and does not yet. A reviewed, declared backlog
 *                    entry, not a derived value.
 *   not-applicable — density is genuinely irrelevant: the component has no control height, no
 *                    row rhythm and no field gap to compress. A reviewed claim, so it has to be
 *                    declared in the registry rather than inferred.
 *   unknown        — not yet reviewed. The honest default for a component whose source does not
 *                    read a density metric and whose registry entry says nothing.
 *
 * The rule (enforced by the contract check until 01dce7a removed it; by review now): `not-applicable` and
 * `unsupported` may only come from an explicit `src/manifests/component-registry.ts` entry.
 * Derivation may emit `supported` or `unknown` and nothing else — and a derivable value is
 * deliberately *not* declared, because a registry override wins over derivation, so writing
 * `unknown` down would mask the day the component starts reading a metric.
 *
 * Where the line falls, applied to all 145 families in
 * `scripts/config/density-applicability.json` — which records the value *and the evidence* per
 * slug, so a value with nothing behind it fails the gate:
 *
 *   - `supported` needs the family's principal control to resolve a density metric. Reading the
 *     variable in its own source is the usual proof; a thin wrapper that renders, as its own root
 *     control, a component which does — `IconButton` around `Button size="icon"`, `MaskInput`
 *     around `Input` — is the declared case, because file-scoped derivation cannot see through
 *     composition.
 *   - `unsupported` needs the family to own one of the four metrics and hardcode it: a control
 *     height, the rhythm of a repeated row, the vertical padding of a table cell, or the gap
 *     between the parts of a form field.
 *   - `not-applicable` needs the family to own *none* of them. In practice that is one of four
 *     shapes: content-intrinsic (text, a glyph, a status dot, a graphic track whose thickness is
 *     a weight rather than a height), author-sized (a `size` prop in px, an aspect box),
 *     pass-through (a wrapper contributing no metric of its own), or absent from layout.
 *
 * A note on what the four metrics do *not* cover, because it is the single largest reason a
 * family lands on `unsupported`: there is no surface-padding metric. A Card, Dialog, Popover or
 * Toast has nothing to read even if it wanted to participate. That is a gap in this contract, not
 * a property of those components, and calling them `not-applicable` would launder the gap into a
 * design decision.
 */
export const DENSITY_APPLICABILITY = [
  "supported",
  "unsupported",
  "not-applicable",
  "unknown",
] as const;
export type DensityApplicability = (typeof DENSITY_APPLICABILITY)[number];

/**
 * The applicability values source inspection is allowed to produce on its own.
 *
 * Everything outside this set is a design decision and needs a registry declaration. Keeping the
 * list here rather than in the detector is what lets the contract test assert it.
 */
export const DERIVABLE_DENSITY_APPLICABILITY = ["supported", "unknown"] as const;

/**
 * The density metrics published for every mode.
 *
 * `scripts/build/tokens.mjs` emits `--qx-density-<metric>` under each mode selector and
 * `--qx-density-<metric>-default` on `:root`. A component spells its fallback as the `-default`
 * token so it measures the same with and without a provider.
 */
export const DENSITY_METRICS = [
  "control-height",
  "row-height",
  "cell-padding-y",
  "field-gap",
] as const;
export type DensityMetric = (typeof DENSITY_METRICS)[number];
