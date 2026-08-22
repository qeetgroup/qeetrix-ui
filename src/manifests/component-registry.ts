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

import type {
  A11yDimension,
  A11yDimensionState,
  AccessibilityContract,
} from "@/contracts/accessibility";
import type {
  ComponentCapabilities,
  ComponentStatus,
  DeprecationContract,
} from "@/contracts/component";
import type { InteractionState } from "@/contracts/states";
import type { ControlledStateContract } from "@/contracts/variants";

/** What a component declares about itself. Every field is optional; absence means "derive it". */
export type ComponentDeclaration = {
  status?: ComponentStatus;
  /**
   * Everything except `audit`, which is computed from `dimensions` by the manifest build —
   * there is deliberately no way to declare a component audited.
   */
  accessibility?: Partial<Omit<AccessibilityContract, "audit" | "dimensions">> & {
    /** Per-dimension audit result. Anything absent is `not-audited`. */
    dimensions?: Partial<Record<A11yDimension, A11yDimensionState>>;
  };
  /** Reviewed overrides for capabilities the generator could not settle from source. */
  capabilities?: Partial<ComponentCapabilities>;
  /** States the component supports but does not style with a detectable marker. */
  states?: readonly InteractionState[];
  /** The public API surface that cannot be read off the source. */
  api?: {
    /**
     * Variant names accepted as aliases of a canonical one, e.g. `{ danger: "destructive" }`.
     * Both names keep working; the canonical one is what new code should use.
     */
    variantAliases?: Readonly<Record<string, string>>;
    /**
     * Axes whose names are domain concepts rather than the shared vocabulary — `Typography`'s
     * variants are element names, `Container`'s sizes are content widths.
     */
    domainAxes?: readonly ("variant" | "size")[];
    /** The controlled-state triples this component supports. */
    controlled?: readonly ControlledStateContract[];
  };
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
  accordion: {
    accessibility: {
      required: true,
      pattern: "accordion",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "sequential", contained: false, restored: false },
    },
    api: { controlled: [{ value: "value", default: "defaultValue", change: "onValueChange" }] },
  },
  "action-bar": {
    accessibility: {
      required: true,
      pattern: "toolbar",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  alert: {
    accessibility: {
      required: true,
      pattern: "alert",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      liveRegion: "assertive",
    },
    api: { variantAliases: { danger: "destructive" } },
  },
  "alert-dialog": {
    accessibility: {
      required: true,
      pattern: "alertdialog",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "partial",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "shift+tab", "escape"],
      focus: { model: "sequential", contained: true, restored: true },
      exceptions: { focus: "Same `inert` limitation as Dialog." },
    },
    states: ["open"],
    api: { controlled: [{ value: "open", default: "defaultOpen", change: "onOpenChange" }] },
  },
  "angle-slider": { accessibility: { required: true, pattern: "slider" } },
  autocomplete: {
    accessibility: {
      required: true,
      pattern: "combobox",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "enter", "escape", "arrow-up", "arrow-down", "home", "end"],
      focus: { model: "active-descendant", contained: false, restored: false },
    },
  },
  breadcrumb: {
    accessibility: {
      required: true,
      pattern: "breadcrumb",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "enter"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  button: {
    accessibility: {
      required: true,
      pattern: "button",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["enter", "space", "tab"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  carousel: {
    accessibility: {
      required: true,
      pattern: "carousel",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  checkbox: {
    accessibility: {
      required: true,
      pattern: "checkbox",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["space", "tab"],
      focus: { model: "none", contained: false, restored: false },
    },
    api: {
      controlled: [{ value: "checked", default: "defaultChecked", change: "onCheckedChange" }],
    },
  },
  "checkbox-card": {
    accessibility: {
      required: true,
      pattern: "checkbox",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "space"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  "close-button": {
    accessibility: {
      required: true,
      pattern: "button",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["enter", "space", "tab"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  collapsible: {
    accessibility: {
      required: true,
      pattern: "disclosure",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "sequential", contained: false, restored: false },
    },
    states: ["open"],
    api: { controlled: [{ value: "open", default: "defaultOpen", change: "onOpenChange" }] },
  },
  combobox: { accessibility: { required: true, pattern: "combobox" } },
  "command-palette": {
    accessibility: { required: true, pattern: "combobox" },
    // Its requestAnimationFrame call moves focus, not pixels, so the scripted-motion signal is
    // a false positive; the dialog and list transitions it renders are CSS and are collapsed by
    // the base reduced-motion rule.
    capabilities: { reducedMotion: "supported" },
  },
  "context-menu": {
    accessibility: {
      required: true,
      pattern: "menu",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["enter", "space", "escape", "arrow-up", "arrow-down", "home", "end"],
      focus: { model: "roving", contained: true, restored: true },
    },
  },
  dialog: {
    accessibility: {
      required: true,
      pattern: "dialog",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "partial",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "shift+tab", "escape"],
      focus: { model: "sequential", contained: true, restored: true },
      exceptions: {
        focus:
          "Focus containment is enforced with `inert`, which jsdom does not implement, so the tests assert the mechanism is installed rather than observing containment. Browser-level verification is on the manual checklist.",
      },
    },
    states: ["open"],
    api: { controlled: [{ value: "open", default: "defaultOpen", change: "onOpenChange" }] },
  },
  drawer: {
    accessibility: {
      required: true,
      pattern: "dialog",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "partial",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "shift+tab", "escape"],
      focus: { model: "sequential", contained: true, restored: true },
      exceptions: {
        focus:
          "Focus containment is enforced with `inert`, which jsdom does not implement, so the tests assert the mechanism is installed rather than observing containment. Browser-level verification is on the manual checklist.",
      },
    },
    states: ["open"],
    api: { controlled: [{ value: "open", default: "defaultOpen", change: "onOpenChange" }] },
  },
  "dropdown-menu": {
    accessibility: {
      required: true,
      pattern: "menu-button",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["enter", "space", "escape", "arrow-up", "arrow-down", "home", "end"],
      focus: { model: "roving", contained: true, restored: true },
    },
    api: { controlled: [{ value: "open", default: "defaultOpen", change: "onOpenChange" }] },
  },
  feed: { accessibility: { required: true, pattern: "feed" } },
  "floating-window": { accessibility: { required: true, pattern: "dialog" } },
  "icon-button": {
    accessibility: {
      required: true,
      pattern: "button",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["enter", "space", "tab"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  listbox: {
    accessibility: {
      required: true,
      pattern: "listbox",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "arrow-up", "arrow-down", "home", "end", "enter", "type-ahead"],
      focus: { model: "active-descendant", contained: false, restored: false },
    },
    api: { controlled: [{ value: "value", default: "defaultValue", change: "onValueChange" }] },
  },
  menubar: {
    accessibility: {
      required: true,
      pattern: "menubar",
      dimensions: {
        semantic: "partial",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "pass",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: [
        "enter",
        "space",
        "escape",
        "arrow-up",
        "arrow-down",
        "arrow-left",
        "arrow-right",
        "home",
        "end",
      ],
      focus: { model: "roving", contained: true, restored: true },
      exceptions: {
        semantic:
          "Base UI renders its focus guards and aria-owns bridges as direct children of the role=menubar element, so while a menu is open the menubar owns non-menuitem children and axe's aria-required-children fails. A structural detail of the primitive with no supported workaround; asserted in composites.test.tsx so a Base UI fix surfaces.",
      },
    },
  },
  meter: {
    accessibility: {
      required: true,
      pattern: "meter",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "number-field": {
    accessibility: {
      required: true,
      pattern: "spinbutton",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "arrow-up", "arrow-down"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  popover: {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "escape"],
      focus: { model: "sequential", contained: false, restored: true },
    },
    states: ["open"],
    api: { controlled: [{ value: "open", default: "defaultOpen", change: "onOpenChange" }] },
  },
  "hover-card": {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "escape"],
      focus: { model: "sequential", contained: false, restored: true },
    },
    states: ["open"],
    api: { controlled: [{ value: "open", default: "defaultOpen", change: "onOpenChange" }] },
  },
  "radio-card": {
    accessibility: {
      required: true,
      pattern: "radio-group",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "space", "arrow-up", "arrow-down", "arrow-left", "arrow-right"],
      focus: { model: "roving", contained: false, restored: false },
    },
  },
  "radio-group": {
    accessibility: {
      required: true,
      pattern: "radio-group",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "space", "arrow-up", "arrow-down", "arrow-left", "arrow-right"],
      focus: { model: "roving", contained: false, restored: false },
    },
  },
  rating: {
    accessibility: {
      required: true,
      pattern: "slider",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "arrow-left", "arrow-right", "home", "end"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  "segmented-control": {
    accessibility: {
      required: true,
      pattern: "radio-group",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "pass",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "space", "arrow-left", "arrow-right"],
      focus: { model: "roving", contained: false, restored: false },
    },
    api: { controlled: [{ value: "value", default: "defaultValue", change: "onValueChange" }] },
  },
  select: {
    accessibility: {
      required: true,
      pattern: "combobox",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: [
        "tab",
        "enter",
        "space",
        "escape",
        "arrow-up",
        "arrow-down",
        "home",
        "end",
        "type-ahead",
      ],
      focus: { model: "roving", contained: true, restored: true },
    },
    api: { controlled: [{ value: "value", default: "defaultValue", change: "onValueChange" }] },
  },
  sheet: {
    accessibility: {
      required: true,
      pattern: "dialog",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "partial",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "shift+tab", "escape"],
      focus: { model: "sequential", contained: true, restored: true },
      exceptions: {
        focus:
          "Focus containment is enforced with `inert`, which jsdom does not implement, so the tests assert the mechanism is installed rather than observing containment. Browser-level verification is on the manual checklist.",
      },
    },
    states: ["open"],
    api: { controlled: [{ value: "open", default: "defaultOpen", change: "onOpenChange" }] },
  },
  slider: {
    accessibility: {
      required: true,
      pattern: "slider",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "partial",
        screenReader: "pass",
        rtl: "pass",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "arrow-up", "arrow-down", "arrow-left", "arrow-right", "home", "end"],
      focus: { model: "none", contained: false, restored: false },
      exceptions: {
        focus:
          "Base UI hides the thumb until it has measured the track; jsdom has no layout, so the thumb's range input stays out of the computed accessibility tree and focus cannot be observed. Verified structurally instead; browser-level check is on the manual checklist.",
      },
    },
  },
  switch: {
    accessibility: {
      required: true,
      pattern: "switch",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["space", "tab"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  table: { accessibility: { required: true, pattern: "table" } },
  tabs: {
    accessibility: {
      required: true,
      pattern: "tabs",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "pass",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "enter", "space", "arrow-left", "arrow-right", "home", "end"],
      focus: { model: "roving", contained: false, restored: false },
    },
    api: { controlled: [{ value: "value", default: "defaultValue", change: "onValueChange" }] },
  },
  toggle: {
    accessibility: {
      required: true,
      pattern: "button",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  toolbar: {
    accessibility: {
      required: true,
      pattern: "toolbar",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "pass",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "arrow-left", "arrow-right", "home", "end"],
      focus: { model: "roving", contained: false, restored: false },
    },
  },
  tooltip: {
    accessibility: {
      required: true,
      pattern: "tooltip",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "escape"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  tour: { accessibility: { required: true, pattern: "dialog" } },
  "tree-view": {
    accessibility: {
      required: true,
      pattern: "treeview",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "pass",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: [
        "tab",
        "enter",
        "arrow-up",
        "arrow-down",
        "arrow-left",
        "arrow-right",
        "home",
        "end",
      ],
      focus: { model: "roving", contained: false, restored: false },
    },
  },

  // ── native semantics, no APG pattern ────────────────────────────────────────────────
  input: {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  "native-select": {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "arrow-up", "arrow-down", "enter", "home", "end", "type-ahead"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  textarea: {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  label: {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
    },
  },
  "skip-nav": {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "enter"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  "visually-hidden": {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
    },
  },

  // ── reviewed and presentational ─────────────────────────────────────────────────────
  "aspect-ratio": {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
    },
  },
  avatar: {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  badge: {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  blockquote: {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  chip: {
    accessibility: { required: false, pattern: "none" },
    api: { controlled: [{ value: "value", default: "defaultValue", change: "onValueChange" }] },
  },
  container: {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
    },
    api: { domainAxes: ["size"] },
  },
  highlight: {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  kbd: {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  separator: {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  skeleton: {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  typography: {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
    api: { domainAxes: ["variant"] },
  },

  // ── APG patterns, reviewed in Phase 2 ───────────────────────────────────────────
  // Evidenced by the component's rendered role or the library it is built on.
  "access-review": { accessibility: { required: true, pattern: "table" } },
  "app-shell": { accessibility: { required: true, pattern: "landmarks" } },
  calendar: { accessibility: { required: true, pattern: "grid" } },
  clipboard: {
    accessibility: {
      required: true,
      pattern: "button",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  "data-state": {
    accessibility: {
      required: true,
      pattern: "alert",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "data-table": { accessibility: { required: true, pattern: "table" } },
  link: {
    accessibility: {
      required: true,
      pattern: "link",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "enter"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  "mention-input": { accessibility: { required: true, pattern: "combobox" } },
  "navigation-menu": { accessibility: { required: true, pattern: "disclosure" } },
  "notification-preference-matrix": { accessibility: { required: true, pattern: "table" } },
  resizable: { accessibility: { required: true, pattern: "window-splitter" } },
  "schedule-calendar": { accessibility: { required: true, pattern: "table" } },
  spoiler: {
    accessibility: {
      required: true,
      pattern: "disclosure",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "sequential", contained: false, restored: false },
    },
    api: {
      controlled: [{ value: "expanded", default: "defaultExpanded", change: "onExpandedChange" }],
    },
  },
  toast: { accessibility: { required: true, pattern: "alert" } },
  // ── accessibility contract, no APG pattern ──────────────────────────────────────
  // Labelling, native semantics or focus management that a change may not break.
  "audit-event": {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "availability-grid": { accessibility: { required: true, pattern: "none" } },
  banner: {
    accessibility: { required: true, pattern: "none" },
    api: { variantAliases: { danger: "destructive" } },
  },
  "button-group": { accessibility: { required: true, pattern: "none" } },
  callout: {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
    api: { variantAliases: { error: "destructive" } },
  },
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
  field: {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      liveRegion: "polite",
    },
  },
  "file-upload": { accessibility: { required: true, pattern: "none" } },
  "focus-trap": { accessibility: { required: true, pattern: "none" } },
  form: { accessibility: { required: true, pattern: "none" } },
  icon: { accessibility: { required: true, pattern: "none" } },
  "input-group": {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  "json-tree": { accessibility: { required: true, pattern: "none" } },
  "logo-uploader": { accessibility: { required: true, pattern: "none" } },
  "mask-input": { accessibility: { required: true, pattern: "none" } },
  notification: {
    accessibility: { required: true, pattern: "none" },
    api: { variantAliases: { error: "destructive" } },
  },
  "notification-center": { accessibility: { required: true, pattern: "none" } },
  "org-chart": { accessibility: { required: true, pattern: "none" } },
  "otp-input": {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "backspace", "arrow-left", "arrow-right"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  pagination: {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "sequential", contained: false, restored: false },
      liveRegion: "polite",
    },
  },
  "password-input": {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  "password-strength-meter": { accessibility: { required: true, pattern: "none" } },
  "presence-indicator": {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  progress: {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      liveRegion: "polite",
    },
  },
  "progress-circle": {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "qr-code": { accessibility: { required: true, pattern: "none" } },
  "reaction-bar": { accessibility: { required: true, pattern: "none" } },
  "rich-text-editor": { accessibility: { required: true, pattern: "none" } },
  "scroll-area": { accessibility: { required: true, pattern: "none" } },
  sidebar: { accessibility: { required: true, pattern: "none" } },
  spinner: {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  stepper: {
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "table-of-contents": { accessibility: { required: true, pattern: "none" } },
  "tag-input": { accessibility: { required: true, pattern: "none" } },
  "time-picker": { accessibility: { required: true, pattern: "none" } },
  "time-range-picker": { accessibility: { required: true, pattern: "none" } },
  timer: { accessibility: { required: true, pattern: "none" } },
  "timezone-picker": { accessibility: { required: true, pattern: "none" } },
  "toggle-tip": { accessibility: { required: true, pattern: "none" } },
  // ── reviewed and presentational ─────────────────────────────────────────────────
  // No interactive semantics; nothing for a change to break.
  card: {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "chart-presets": { accessibility: { required: false, pattern: "none" } },
  "comment-thread": { accessibility: { required: false, pattern: "none" } },
  "description-list": {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "empty-state": {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "file-card": {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "file-type-icon": {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "filter-bar": { accessibility: { required: false, pattern: "none" } },
  marquee: { accessibility: { required: false, pattern: "none" } },
  "master-detail": { accessibility: { required: false, pattern: "none" } },
  "number-formatter": {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
    },
  },
  "overflow-list": { accessibility: { required: false, pattern: "none" } },
  "page-header": {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  portal: { accessibility: { required: false, pattern: "none" } },
  "preview-card": { accessibility: { required: false, pattern: "none" } },
  "rolling-number": { accessibility: { required: false, pattern: "none" } },
  "security-item": {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  stat: {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "status-pill": {
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
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
