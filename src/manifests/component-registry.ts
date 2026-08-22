/**
 * The component governance registry — the declared half of the component contract.
 *
 * Most of a component's contract is *derived* from the repository (see
 * scripts/build/manifest.mjs). What cannot be derived is declared here, and only here:
 *
 *   - `status`          — maturity is a decision, not a property of the code
 *   - `accessibility`   — which APG pattern a component claims
 *   - `capabilities`    — reviewed overrides where the derived signal is inconclusive
 *   - `states`          — states that exist in behaviour but leave no styling fingerprint
 *   - `deprecation`     — replacement + migration for anything on the way out
 *
 * Rules of the house:
 *
 *   1. **Absent means "not reviewed".** A component with no entry inherits
 *      `REGISTRY_DEFAULTS`, whose accessibility pattern is `null` — an honest "unknown", not
 *      a claim of "no accessibility contract". Filling those in is the review backlog.
 *   2. **No invented facts.** Every seeded pattern below is evidenced by the component's
 *      Base UI primitive or its explicit ARIA role. Nothing is guessed to make the table look
 *      complete.
 *   3. **`removeIn` stays `null`** until a removal is actually announced in a major.
 *
 * TypeScript is the first gate: an invalid status, category or pattern is a compile error.
 * scripts/check/component-contract.mjs is the second: it checks the keys against
 * scripts/config/category-map.json so an entry cannot outlive its component.
 *
 * @see docs/governance/component-status.md
 * @see docs/governance/deprecations.md
 */

import type { AccessibilityContract } from "@/contracts/accessibility";
import type {
  ComponentCapabilities,
  ComponentStatus,
  DeprecationContract,
} from "@/contracts/component";
import type { InteractionState } from "@/contracts/states";

/** What a component declares about itself. Every field is optional; absence means "derive it". */
export type ComponentDeclaration = {
  status?: ComponentStatus;
  accessibility?: Partial<AccessibilityContract>;
  /** Reviewed overrides for capabilities the generator could not settle from source. */
  capabilities?: Partial<ComponentCapabilities>;
  /** States the component supports but does not style with a detectable marker. */
  states?: readonly InteractionState[];
  /** Required when `status` is `"deprecated"`. */
  deprecation?: DeprecationContract;
};

/**
 * Applied to every component before its own declaration.
 *
 * `status: "stable"` is the Phase 1 baseline: everything in this registry shipped in the 1.0
 * line and is already governed by the public-API lock (src/__tests__/public-api.json), so
 * "stable" is the accurate description of the commitment that already exists. Components can
 * be re-classified individually; new components should declare their own status explicitly.
 */
export const REGISTRY_DEFAULTS = {
  status: "stable",
  accessibility: { required: false, pattern: null },
} as const satisfies ComponentDeclaration;

/**
 * Per-component declarations, keyed by kebab-case slug.
 *
 * The accessibility seeds fall into three groups:
 *   - an **APG pattern** — the component is built on the Base UI primitive of that name, or
 *     renders that pattern's role explicitly (`required: true`)
 *   - **`"none"` with `required: true`** — a real accessibility contract (labelling, native
 *     semantics) that maps to no APG pattern
 *   - **`"none"` with `required: false`** — reviewed and presentational
 *
 * A handful of entries also declare `states: ["open"]`. Those components take Base UI's
 * `Root.Props`, so their open/closed state lives in the props contract and leaves no styling
 * marker for the generator to detect — exactly the case declared states exist for.
 */
export const COMPONENT_REGISTRY = {
  // ── APG patterns: Base UI primitive or explicit role ────────────────────────────────
  accordion: { accessibility: { required: true, pattern: "accordion" } },
  "action-bar": { accessibility: { required: true, pattern: "toolbar" } },
  alert: { accessibility: { required: true, pattern: "alert" } },
  "alert-dialog": { accessibility: { required: true, pattern: "alertdialog" }, states: ["open"] },
  "angle-slider": { accessibility: { required: true, pattern: "slider" } },
  autocomplete: { accessibility: { required: true, pattern: "combobox" } },
  breadcrumb: { accessibility: { required: true, pattern: "breadcrumb" } },
  button: { accessibility: { required: true, pattern: "button" } },
  carousel: { accessibility: { required: true, pattern: "carousel" } },
  checkbox: { accessibility: { required: true, pattern: "checkbox" } },
  "checkbox-card": { accessibility: { required: true, pattern: "checkbox" } },
  "close-button": { accessibility: { required: true, pattern: "button" } },
  collapsible: { accessibility: { required: true, pattern: "disclosure" }, states: ["open"] },
  combobox: { accessibility: { required: true, pattern: "combobox" } },
  "command-palette": {
    accessibility: { required: true, pattern: "combobox" },
    // Its requestAnimationFrame call moves focus, not pixels, so the scripted-motion signal is
    // a false positive; the dialog and list transitions it renders are CSS and are collapsed by
    // the base reduced-motion rule.
    capabilities: { reducedMotion: "supported" },
  },
  "context-menu": { accessibility: { required: true, pattern: "menu" } },
  dialog: { accessibility: { required: true, pattern: "dialog" }, states: ["open"] },
  drawer: { accessibility: { required: true, pattern: "dialog" }, states: ["open"] },
  "dropdown-menu": { accessibility: { required: true, pattern: "menu-button" } },
  feed: { accessibility: { required: true, pattern: "feed" } },
  "floating-window": { accessibility: { required: true, pattern: "dialog" } },
  "icon-button": { accessibility: { required: true, pattern: "button" } },
  listbox: { accessibility: { required: true, pattern: "listbox" } },
  menubar: { accessibility: { required: true, pattern: "menubar" } },
  meter: { accessibility: { required: true, pattern: "meter" } },
  "number-field": { accessibility: { required: true, pattern: "spinbutton" } },
  popover: { accessibility: { required: true, pattern: "none" }, states: ["open"] },
  "hover-card": { accessibility: { required: true, pattern: "none" }, states: ["open"] },
  "radio-card": { accessibility: { required: true, pattern: "radio-group" } },
  "radio-group": { accessibility: { required: true, pattern: "radio-group" } },
  rating: { accessibility: { required: true, pattern: "slider" } },
  "segmented-control": { accessibility: { required: true, pattern: "radio-group" } },
  select: { accessibility: { required: true, pattern: "combobox" } },
  sheet: { accessibility: { required: true, pattern: "dialog" }, states: ["open"] },
  slider: { accessibility: { required: true, pattern: "slider" } },
  switch: { accessibility: { required: true, pattern: "switch" } },
  table: { accessibility: { required: true, pattern: "table" } },
  tabs: { accessibility: { required: true, pattern: "tabs" } },
  toggle: { accessibility: { required: true, pattern: "button" } },
  toolbar: { accessibility: { required: true, pattern: "toolbar" } },
  tooltip: { accessibility: { required: true, pattern: "tooltip" } },
  tour: { accessibility: { required: true, pattern: "dialog" } },
  "tree-view": { accessibility: { required: true, pattern: "treeview" } },

  // ── native semantics, no APG pattern ────────────────────────────────────────────────
  input: { accessibility: { required: true, pattern: "none" } },
  "native-select": { accessibility: { required: true, pattern: "none" } },
  textarea: { accessibility: { required: true, pattern: "none" } },
  label: { accessibility: { required: true, pattern: "none" } },
  "skip-nav": { accessibility: { required: true, pattern: "none" } },
  "visually-hidden": { accessibility: { required: true, pattern: "none" } },

  // ── reviewed and presentational ─────────────────────────────────────────────────────
  "aspect-ratio": { accessibility: { required: false, pattern: "none" } },
  avatar: { accessibility: { required: false, pattern: "none" } },
  badge: { accessibility: { required: false, pattern: "none" } },
  blockquote: { accessibility: { required: false, pattern: "none" } },
  chip: { accessibility: { required: false, pattern: "none" } },
  container: { accessibility: { required: false, pattern: "none" } },
  highlight: { accessibility: { required: false, pattern: "none" } },
  kbd: { accessibility: { required: false, pattern: "none" } },
  separator: { accessibility: { required: false, pattern: "none" } },
  skeleton: { accessibility: { required: false, pattern: "none" } },
  typography: { accessibility: { required: false, pattern: "none" } },

  // ── APG patterns, reviewed in Phase 2 ───────────────────────────────────────────
  // Evidenced by the component's rendered role or the library it is built on.
  "access-review": { accessibility: { required: true, pattern: "table" } },
  "app-shell": { accessibility: { required: true, pattern: "landmarks" } },
  calendar: { accessibility: { required: true, pattern: "grid" } },
  clipboard: { accessibility: { required: true, pattern: "button" } },
  "data-state": { accessibility: { required: true, pattern: "alert" } },
  "data-table": { accessibility: { required: true, pattern: "table" } },
  link: { accessibility: { required: true, pattern: "link" } },
  "mention-input": { accessibility: { required: true, pattern: "combobox" } },
  "navigation-menu": { accessibility: { required: true, pattern: "disclosure" } },
  "notification-preference-matrix": { accessibility: { required: true, pattern: "table" } },
  resizable: { accessibility: { required: true, pattern: "window-splitter" } },
  "schedule-calendar": { accessibility: { required: true, pattern: "table" } },
  spoiler: { accessibility: { required: true, pattern: "disclosure" } },
  toast: { accessibility: { required: true, pattern: "alert" } },
  // ── accessibility contract, no APG pattern ──────────────────────────────────────
  // Labelling, native semantics or focus management that a change may not break.
  "audit-event": { accessibility: { required: true, pattern: "none" } },
  "availability-grid": { accessibility: { required: true, pattern: "none" } },
  banner: { accessibility: { required: true, pattern: "none" } },
  "button-group": { accessibility: { required: true, pattern: "none" } },
  callout: { accessibility: { required: true, pattern: "none" } },
  chart: { accessibility: { required: true, pattern: "none" } },
  "code-block": { accessibility: { required: true, pattern: "none" } },
  "color-picker": { accessibility: { required: true, pattern: "none" } },
  "color-swatch": { accessibility: { required: true, pattern: "none" } },
  "copyable-secret": { accessibility: { required: true, pattern: "none" } },
  "country-picker": { accessibility: { required: true, pattern: "none" } },
  "currency-input": { accessibility: { required: true, pattern: "none" } },
  "date-picker": { accessibility: { required: true, pattern: "none" } },
  "date-time-picker": { accessibility: { required: true, pattern: "none" } },
  "diff-viewer": { accessibility: { required: true, pattern: "none" } },
  editable: { accessibility: { required: true, pattern: "none" } },
  field: { accessibility: { required: true, pattern: "none" } },
  "file-upload": { accessibility: { required: true, pattern: "none" } },
  "focus-trap": { accessibility: { required: true, pattern: "none" } },
  form: { accessibility: { required: true, pattern: "none" } },
  icon: { accessibility: { required: true, pattern: "none" } },
  "input-group": { accessibility: { required: true, pattern: "none" } },
  "json-tree": { accessibility: { required: true, pattern: "none" } },
  "logo-uploader": { accessibility: { required: true, pattern: "none" } },
  "mask-input": { accessibility: { required: true, pattern: "none" } },
  notification: { accessibility: { required: true, pattern: "none" } },
  "notification-center": { accessibility: { required: true, pattern: "none" } },
  "org-chart": { accessibility: { required: true, pattern: "none" } },
  "otp-input": { accessibility: { required: true, pattern: "none" } },
  pagination: { accessibility: { required: true, pattern: "none" } },
  "password-input": { accessibility: { required: true, pattern: "none" } },
  "password-strength-meter": { accessibility: { required: true, pattern: "none" } },
  "presence-indicator": { accessibility: { required: true, pattern: "none" } },
  progress: { accessibility: { required: true, pattern: "none" } },
  "progress-circle": { accessibility: { required: true, pattern: "none" } },
  "qr-code": { accessibility: { required: true, pattern: "none" } },
  "reaction-bar": { accessibility: { required: true, pattern: "none" } },
  "rich-text-editor": { accessibility: { required: true, pattern: "none" } },
  "scroll-area": { accessibility: { required: true, pattern: "none" } },
  sidebar: { accessibility: { required: true, pattern: "none" } },
  spinner: { accessibility: { required: true, pattern: "none" } },
  stepper: { accessibility: { required: true, pattern: "none" } },
  "table-of-contents": { accessibility: { required: true, pattern: "none" } },
  "tag-input": { accessibility: { required: true, pattern: "none" } },
  "time-picker": { accessibility: { required: true, pattern: "none" } },
  "time-range-picker": { accessibility: { required: true, pattern: "none" } },
  timer: { accessibility: { required: true, pattern: "none" } },
  "timezone-picker": { accessibility: { required: true, pattern: "none" } },
  "toggle-tip": { accessibility: { required: true, pattern: "none" } },
  // ── reviewed and presentational ─────────────────────────────────────────────────
  // No interactive semantics; nothing for a change to break.
  card: { accessibility: { required: false, pattern: "none" } },
  "chart-presets": { accessibility: { required: false, pattern: "none" } },
  "comment-thread": { accessibility: { required: false, pattern: "none" } },
  "description-list": { accessibility: { required: false, pattern: "none" } },
  "empty-state": { accessibility: { required: false, pattern: "none" } },
  "file-card": { accessibility: { required: false, pattern: "none" } },
  "file-type-icon": { accessibility: { required: false, pattern: "none" } },
  "filter-bar": { accessibility: { required: false, pattern: "none" } },
  marquee: { accessibility: { required: false, pattern: "none" } },
  "master-detail": { accessibility: { required: false, pattern: "none" } },
  "number-formatter": { accessibility: { required: false, pattern: "none" } },
  "overflow-list": { accessibility: { required: false, pattern: "none" } },
  "page-header": { accessibility: { required: false, pattern: "none" } },
  portal: { accessibility: { required: false, pattern: "none" } },
  "preview-card": { accessibility: { required: false, pattern: "none" } },
  "rolling-number": { accessibility: { required: false, pattern: "none" } },
  "security-item": { accessibility: { required: false, pattern: "none" } },
  stat: { accessibility: { required: false, pattern: "none" } },
  "status-pill": { accessibility: { required: false, pattern: "none" } },
  "time-since": { accessibility: { required: false, pattern: "none" } },
  timeline: { accessibility: { required: false, pattern: "none" } },
  // ── deprecated ──────────────────────────────────────────────────────────────────────
  "pagination-bar": {
    status: "deprecated",
    accessibility: { required: false, pattern: "none" },
    deprecation: {
      since: "1.0.0",
      reason: "Renamed to Pagination when the pagination API was consolidated in 1.0.0.",
      replacement: "Pagination",
      migration:
        'Import { Pagination } from "@qeetrix/ui" and rename PaginationBarProps to PaginationProps.',
      removeIn: null,
    },
  },
} as const satisfies Record<string, ComponentDeclaration>;

/** Slugs with an entry above. */
export type RegisteredSlug = keyof typeof COMPONENT_REGISTRY;
