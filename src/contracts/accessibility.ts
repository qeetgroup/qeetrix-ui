/**
 * The accessibility half of the component contract.
 *
 * Qeetrix components are built on Base UI, which implements the WAI-ARIA Authoring
 * Practices (APG) patterns. `AccessibilityContract` records *which* pattern a component
 * claims, so a reviewer can check the claim and a gate can require it.
 *
 * `pattern` is deliberately three-valued:
 *
 *   - a pattern name — the component implements that APG pattern and must keep honouring it.
 *   - `"none"`       — reviewed, and no APG pattern applies (a Badge is not a widget).
 *   - `null`         — not reviewed yet.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/
 */

/**
 * The WAI-ARIA APG pattern names, plus `"none"` for reviewed-but-not-a-widget.
 * Names are the APG pattern slugs, kebab-cased.
 */
export const ARIA_PATTERNS = [
  "accordion",
  "alert",
  "alertdialog",
  "breadcrumb",
  "button",
  "carousel",
  "checkbox",
  "combobox",
  "dialog",
  "disclosure",
  "feed",
  "grid",
  "landmarks",
  "link",
  "listbox",
  "menu",
  "menubar",
  "menu-button",
  "meter",
  "radio-group",
  "slider",
  "slider-multi-thumb",
  "spinbutton",
  "switch",
  "table",
  "tabs",
  "toolbar",
  "tooltip",
  "treeview",
  "treegrid",
  "window-splitter",
  "none",
] as const;
export type AriaPattern = (typeof ARIA_PATTERNS)[number];

/**
 * The accessibility record for one component.
 *
 * `required: true` is a commitment: the component implements a named pattern (or explicit
 * role semantics) and a change that breaks it is a breaking change. The validator enforces
 * the two consistency rules — `required` implies a `pattern`, and a `pattern` implies
 * `required`.
 */
export type AccessibilityContract = {
  /** Whether this component carries an accessibility contract that changes may not break. */
  required: boolean;
  /** The APG pattern implemented, `"none"` when reviewed and none applies, `null` when unreviewed. */
  pattern: AriaPattern | null;
};
