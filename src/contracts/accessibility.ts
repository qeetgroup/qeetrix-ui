/**
 * The accessibility half of the component contract.
 *
 * Qeetrix components are built on Base UI, which implements the WAI-ARIA Authoring Practices
 * (APG) patterns. `AccessibilityContract` records *which* pattern a component claims, and what an
 * audit actually found — so a reviewer can check the claim and a gate can require it.
 *
 * The baseline is **WCAG 2.2 AA**. WCAG 3 is a working draft and is not a conformance target.
 *
 * Two rules keep this honest:
 *
 *   1. **The roll-up is computed, never declared.** `audit` is derived from the per-dimension
 *      results, so a component cannot be marked `audited` while a dimension is unreviewed. There
 *      is no field that means "accessible: true".
 *   2. **`not-audited` is the default.** A component that nobody has looked at says so. Passing
 *      an axe test is not an audit — axe checks a subset of the semantic layer and nothing at all
 *      about keyboard, focus or announcement behaviour.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/
 * @see docs/standards/accessibility.md
 */

import type { SupportLevel } from "./component";

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
 * The dimensions an accessibility audit covers. Passing one says nothing about the others, which
 * is the whole reason they are tracked separately.
 */
export const A11Y_DIMENSIONS = [
  /** The right element or role, and a correct ARIA state/property model. */
  "semantic",
  /** Every control that needs an accessible name has one, from an appropriate source. */
  "name",
  /** The keyboard model matches the pattern's expected interaction. */
  "keyboard",
  /** Focus entry, movement, containment, visibility and restoration. */
  "focus",
  /** What assistive technology is told, including live announcements. */
  "screenReader",
  /** Behaviour under `dir="rtl"`, not just mirrored layout. */
  "rtl",
  /** Motion degrades under `prefers-reduced-motion`. */
  "reducedMotion",
  /** Legible and operable under `forced-colors: active`. */
  "forcedColors",
  /** Text, focus and non-text contrast hold at AA. */
  "contrast",
] as const;
export type A11yDimension = (typeof A11Y_DIMENSIONS)[number];

/**
 * What an audit found for one dimension.
 *
 * - `pass`           — reviewed and correct, with a test covering it.
 * - `partial`        — reviewed, works for the common case, a known gap remains.
 * - `exception`      — reviewed, deliberately non-conforming, recorded with a reason.
 * - `not-applicable` — the dimension cannot apply (a `Separator` has no keyboard model).
 * - `not-audited`    — nobody has looked.
 */
export const A11Y_DIMENSION_STATES = [
  "pass",
  "partial",
  "exception",
  "not-applicable",
  "not-audited",
] as const;
export type A11yDimensionState = (typeof A11Y_DIMENSION_STATES)[number];

/** The roll-up. Computed from the dimensions by scripts/build/manifest.mjs — never declared. */
export const A11Y_AUDIT_STATES = ["not-audited", "partial", "audited", "exception"] as const;
export type A11yAuditState = (typeof A11Y_AUDIT_STATES)[number];

/**
 * The keys a component handles. Only the ones its pattern calls for — a button does not need
 * arrow keys, and giving it some would be worse than leaving them out.
 */
export const KEYBOARD_KEYS = [
  "tab",
  "shift+tab",
  "enter",
  "space",
  "escape",
  "arrow-up",
  "arrow-down",
  "arrow-left",
  "arrow-right",
  "home",
  "end",
  "page-up",
  "page-down",
  "type-ahead",
  "delete",
  "backspace",
] as const;
export type KeyboardKey = (typeof KEYBOARD_KEYS)[number];

/**
 * How focus moves inside a component.
 *
 * - `none`              — a single focusable element, or none at all.
 * - `sequential`        — several focusables, reached with Tab in DOM order.
 * - `roving`            — one tab stop; arrow keys move `tabindex` between items.
 * - `active-descendant` — the container keeps focus; `aria-activedescendant` names the active item.
 */
export const FOCUS_MODELS = ["none", "sequential", "roving", "active-descendant"] as const;
export type FocusModel = (typeof FOCUS_MODELS)[number];

/**
 * The focus contract. For an overlay this is the part that matters most, and the part axe cannot
 * see at all.
 */
export type FocusContract = {
  model: FocusModel;
  /** Focus is contained while open — correct for a modal, wrong for a non-modal popover. */
  contained: boolean;
  /** Focus returns to the element that opened it, and survives that element unmounting. */
  restored: boolean;
};

/** Politeness of a component's live region, when it announces asynchronously. */
export const LIVE_REGION_POLITENESS = ["off", "polite", "assertive"] as const;
export type LiveRegionPoliteness = (typeof LIVE_REGION_POLITENESS)[number];

/**
 * The accessibility record for one component.
 *
 * `required: true` is a commitment: the component implements a named pattern (or explicit role
 * semantics) and a change that breaks it is a breaking change. The validator enforces the two
 * consistency rules — `required` implies a `pattern`, and a `pattern` implies `required`.
 */
export type AccessibilityContract = {
  /** Whether this component carries an accessibility contract that changes may not break. */
  required: boolean;
  /** The APG pattern implemented, `"none"` when reviewed and none applies, `null` when unreviewed. */
  pattern: AriaPattern | null;
  /** The computed roll-up of `dimensions`. Derived; declaring it is rejected. */
  audit: A11yAuditState;
  /** Per-dimension audit result. Every dimension is present; unreviewed ones say so. */
  dimensions: Readonly<Record<A11yDimension, A11yDimensionState>>;
  /** The keys the component handles, or `null` where it owns no keyboard model. */
  keyboard: readonly KeyboardKey[] | null;
  /** How focus behaves, or `null` where the component holds no focus. */
  focus: FocusContract | null;
  /** Live-region politeness, or `null` when the component announces nothing. */
  liveRegion: LiveRegionPoliteness | null;
  /** Recorded reason for every dimension marked `exception`. */
  exceptions: Readonly<Record<string, string>> | null;
};

/** Support level for a cross-cutting a11y concern, reusing the capability vocabulary. */
export type A11ySupport = SupportLevel;
