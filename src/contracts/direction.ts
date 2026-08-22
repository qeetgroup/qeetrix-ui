/**
 * The direction (RTL) contract.
 *
 * A Qeetrix component is direction-agnostic when its spacing, alignment and corner radii are
 * expressed with CSS *logical* properties, so the same markup mirrors correctly under
 * `dir="rtl"`. Physical properties are not banned — `left-1/2` centres a dialog in either
 * direction — which is why the RTL capability is reviewed rather than purely inferred.
 *
 * `LOGICAL_UTILITY_PREFIXES` is the evidence list the manifest generator looks for; keeping
 * it in the contract means the rule is documented where the vocabulary lives.
 */

export const DIRECTIONS = ["ltr", "rtl"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const DEFAULT_DIRECTION = "ltr" as const;

/** Tailwind logical-property utilities: evidence that a component is direction-agnostic. */
export const LOGICAL_UTILITY_PREFIXES = [
  "ps-",
  "pe-",
  "ms-",
  "me-",
  "start-",
  "end-",
  "inset-inline",
  "border-s",
  "border-e",
  "rounded-s",
  "rounded-e",
  "text-start",
  "text-end",
  "rtl:",
  "ltr:",
] as const;

/** Physical counterparts. Their presence alone is not a fault — it triggers a review. */
export const PHYSICAL_UTILITY_PREFIXES = [
  "pl-",
  "pr-",
  "ml-",
  "mr-",
  "border-l",
  "border-r",
  "rounded-l",
  "rounded-r",
  "text-left",
  "text-right",
] as const;
