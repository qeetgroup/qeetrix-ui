/**
 * The interaction-state vocabulary.
 *
 * A component's `states` list is the set of states it demonstrably handles — derived from the
 * source by scripts/build/manifest.mjs from Tailwind state variants, `data-*` attributes and
 * ARIA attributes, not self-reported. It is what tells a reviewer whether, say, a new input
 * forgot its `invalid` treatment.
 *
 * Detection is deliberately conservative: only unambiguous markers count, so an empty list
 * means "nothing detected", never "nothing supported". A state listed here with no detection
 * rule in scripts/lib/component-source.mjs would be undetectable, so the two are kept in step
 * by src/__tests__/component-contract.test.ts.
 */

export const INTERACTION_STATES = [
  "hover",
  "focus",
  "focus-visible",
  "active",
  "disabled",
  "read-only",
  "loading",
  "invalid",
  "required",
  "checked",
  "indeterminate",
  "selected",
  "expanded",
  "open",
  "busy",
  "dragging",
  "empty",
] as const;
export type InteractionState = (typeof INTERACTION_STATES)[number];
