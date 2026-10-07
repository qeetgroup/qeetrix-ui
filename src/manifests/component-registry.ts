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
 *   4. **`status` is typed, not defaulted.** Every entry states its own maturity, and `stable`
 *      has to be earned: a unit suite, a test that runs axe, a reviewed ARIA pattern and an
 *      audited `semantic` dimension (checked by `check:contract` until 01dce7a, by review now).
 *      62 components are `beta`, most for want of that last one — see
 *      docs/governance/component-status.md.
 *   5. **`capabilities.density: "not-applicable"` is a declaration.** Source inspection can
 *      prove that a component reads a density metric; it cannot decide that density is
 *      irrelevant to one. So `not-applicable` and `unsupported` are declared here and nowhere
 *      else. After the modernisation pass the manifest reports 52 `supported` (derived from the
 *      source, or declared below where a wrapper gets density by composition), 50 `unsupported`
 *      (they hardcode a control height, a repeated-row rhythm, a cell padding or a field gap),
 *      39 `not-applicable` (they own none of those metrics), and 4 left `unknown` and
 *      deliberately **not** declared — a declaration wins over derivation, so writing `unknown`
 *      down here would mask the day one of them starts reading a metric. The same is true of a
 *      stale `unsupported`: when a component starts reading a density metric, delete its
 *      declaration and let the derivation report it (the integration pass removed 24).
 *   6. **A dimension is `pass` only if a test asserts it** — in the component's colocated suite.
 *      `not-audited` is where a claim goes when its proof does not exist yet; it is the
 *      backlog, not a verdict. (`check:a11y`, `check:contract` and the
 *      `density-applicability.json` reasons they read were removed from this checkout in
 *      01dce7a; until they return, this rule is enforced by review.)
 *
 * TypeScript is the first gate: an invalid status, category or pattern is a compile error.
 * There is no second gate since the contract check was removed in 01dce7a: the manifest build
 * reads entries by slug and silently ignores one whose component is gone, so delete an entry
 * together with its component.
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
import type { AxisPropName, AxisSourceRecord, ControlledStateContract } from "@/contracts/variants";

/**
 * What a component declares about itself.
 *
 * `status` is **required**. It used to be optional, defaulting to `stable` through
 * `REGISTRY_DEFAULTS`, which meant a component became a stability promise by being added to a
 * table — nobody ever typed the word. Maturity is a decision; the type now insists somebody
 * makes it. Everything else is optional, and absence means "derive it".
 */
export type ComponentDeclaration = {
  status: ComponentStatus;
  /**
   * One-sentence description, for a component whose doc comment cannot be read off a
   * declaration of the same name — a module of several exports (`Toast` is `Toaster` and
   * `toast()`), an alias or a re-export. Everything else derives it from its doc comment.
   */
  description?: string;
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
    /**
     * Where a public axis-shaped prop's values come from, when `cva` did not produce them.
     *
     * The manifest reads variants out of `cva()`, so a component that styles with
     * `data-[size=…]` utilities recorded `null` — indistinguishable from a component with no
     * size axis at all. Declaring the source here makes the two different facts different
     * data. Every axis prop the source declares needs a record here (review holds that since
     * the contract check was removed in 01dce7a).
     */
    axisSources?: Readonly<Partial<Record<AxisPropName, AxisSourceRecord>>>;
    /** The controlled-state triples this component supports. */
    controlled?: readonly ControlledStateContract[];
  };
  /** Required when `status` is `"deprecated"`. */
  deprecation?: DeprecationContract;
};

/**
 * Applied to every component before its own declaration.
 *
 * There is deliberately **no default status** any more. `status: "stable"` used to sit here as
 * the "Phase 1 baseline", which made every one of the 145 components a stability promise by
 * omission: 144 were labelled `stable` and not one of those labels was a decision anybody
 * recorded. `experimental` is the value here purely so the type is satisfiable — a component
 * that reaches the manifest on this value shows up as `experimental`, and review sends it back:
 * that is what "explicit at registration" means now that the `check:contract` failure is gone.
 *
 * @see docs/governance/component-status.md § Promotion evidence
 */
export const REGISTRY_DEFAULTS = {
  status: "experimental",
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
    status: "stable",
    accessibility: {
      required: true,
      pattern: "accordion",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "not-audited",
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
    status: "stable",
    capabilities: { density: "unsupported" },
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
      // A real toolbar: one tab stop, the arrow keys move between actions and wrap.
      keyboard: ["tab", "enter", "space", "arrow-left", "arrow-right"],
      focus: { model: "roving", contained: false, restored: false },
    },
    api: {
      axisSources: {
        variant: {
          source: "forwarded",
          note: "ActionBarItem.variant is passed straight to Button's variant, so Button's cva is the definition: default | destructive | outline | ghost.",
        },
        size: {
          source: "forwarded",
          note: "ActionBarItem.size is passed straight to Button's size.",
        },
      },
    },
  },
  alert: {
    status: "stable",
    accessibility: {
      required: true,
      pattern: "alert",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
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
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "alertdialog",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-audited",
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
  "angle-slider": {
    status: "beta",
    capabilities: { density: "not-applicable" },
    accessibility: { required: true, pattern: "slider" },
    api: {
      axisSources: {
        size: {
          source: "measurement",
          note: "A pixel diameter for the dial, not a closed set of appearances.",
        },
      },
    },
  },
  autocomplete: {
    status: "stable",
    accessibility: {
      required: true,
      pattern: "combobox",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
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
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "breadcrumb",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-audited",
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
    status: "stable",
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
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "carousel",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        // Focus stays with the current indicator under the arrow keys and is rescued when the
        // focused slide leaves the view; carousel.test.tsx.
        focus: "pass",
        screenReader: "pass",
        // RTL-001: the arrow keys and Embla's own axis mirror, and five colocated tests drive
        // them from a provider, a `dir` attribute and an explicit option.
        rtl: "pass",
        // Embla's scroll duration collapses to zero under reduced motion (asserted).
        reducedMotion: "pass",
        // The controls and indicators now paint (and carry forced-colours rules), so these
        // apply; neither is asserted yet.
        forcedColors: "not-audited",
        contrast: "not-audited",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "sequential", contained: false, restored: false },
    },
    api: {
      axisSources: {
        orientation: {
          source: "layout",
          note: "Structural: sets Embla's scroll axis and swaps the inline/block spacing utilities. Not an appearance axis.",
        },
      },
    },
  },
  checkbox: {
    status: "stable",
    accessibility: {
      required: true,
      pattern: "checkbox",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "not-audited",
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
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "checkbox",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "not-audited",
        screenReader: "not-audited",
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
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "button",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-audited",
        focus: "not-audited",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["enter", "space", "tab"],
      focus: { model: "none", contained: false, restored: false },
    },
    api: {
      axisSources: {
        size: {
          source: "forwarded",
          note: "Passed straight to Button's size, restricted to the icon sizes: icon-xs | icon-sm | icon.",
        },
      },
    },
  },
  collapsible: {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: true,
      pattern: "disclosure",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "not-audited",
        screenReader: "pass",
        rtl: "not-applicable",
        // Collapsible now animates its panel (CSS), collapsed by the base reduced-motion rule.
        reducedMotion: "pass",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "sequential", contained: false, restored: false },
    },
    states: ["open"],
    api: { controlled: [{ value: "open", default: "defaultOpen", change: "onOpenChange" }] },
  },
  combobox: { status: "beta", accessibility: { required: true, pattern: "combobox" } },
  "command-palette": {
    status: "beta",
    accessibility: { required: true, pattern: "combobox" },
    // Its requestAnimationFrame call moves focus, not pixels, so the scripted-motion signal is
    // a false positive; the dialog and list transitions it renders are CSS and are collapsed by
    // the base reduced-motion rule.
    capabilities: { reducedMotion: "supported" },
  },
  "context-menu": {
    status: "stable",
    accessibility: {
      required: true,
      pattern: "menu",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["enter", "space", "escape", "arrow-up", "arrow-down", "home", "end"],
      focus: { model: "roving", contained: true, restored: true },
    },
    api: {
      axisSources: {
        variant: {
          source: "data-attribute",
          note: "ContextMenuItem writes data-variant and styles with data-[variant=destructive]: default | destructive.",
        },
      },
    },
  },
  dialog: {
    status: "stable",
    capabilities: { density: "unsupported" },
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
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "dialog",
      dimensions: {
        semantic: "not-audited",
        name: "not-audited",
        keyboard: "not-audited",
        focus: "not-audited",
        screenReader: "not-audited",
        rtl: "not-applicable",
        // Rebuilt on Base UI Drawer: its slide is a CSS transition, collapsed by the base
        // reduced-motion rule; the swipe follows the pointer and is not animation.
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
  "dropdown-menu": {
    status: "stable",
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
    api: {
      axisSources: {
        variant: {
          source: "data-attribute",
          note: "DropdownMenuItem writes data-variant and styles with data-[variant=destructive]: default | destructive.",
        },
      },
      controlled: [{ value: "open", default: "defaultOpen", change: "onOpenChange" }],
    },
  },
  feed: {
    status: "beta",
    accessibility: { required: true, pattern: "feed" },
    api: {
      axisSources: {
        variant: {
          source: "data-attribute",
          note: "Written to data-variant: card | list. The audit-event block's AuditLog forwards the same prop.",
        },
      },
    },
  },
  "floating-window": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "dialog",
      // WCAG 2.1.1: the title bar's move handle takes the arrow keys (Shift for larger steps), so
      // the panel moves without a pointer. Asserted in floating-window.test.tsx.
      dimensions: { name: "pass", keyboard: "pass" },
      keyboard: ["tab", "escape", "arrow-up", "arrow-down", "arrow-left", "arrow-right"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  "icon-button": {
    status: "stable",
    capabilities: { density: "supported" },
    accessibility: {
      required: true,
      pattern: "button",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-audited",
        focus: "not-audited",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["enter", "space", "tab"],
      focus: { model: "none", contained: false, restored: false },
    },
    api: {
      axisSources: {
        size: {
          source: "forwarded",
          note: "Passed straight to Button's size, restricted to the icon sizes: icon-xs | icon-sm | icon | icon-lg.",
        },
      },
    },
  },
  listbox: {
    status: "stable",
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
    status: "stable",
    accessibility: {
      required: true,
      pattern: "menubar",
      dimensions: {
        semantic: "partial",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "not-audited",
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
          'Base UI renders an aria-owns bridge span as a direct child of the role=menubar element while a menu is open, so the menubar owns a generic child and axe\'s aria-required-children fails. No supported workaround in @base-ui/react 1.7.0: Menu.Positioner throws without Menu.Portal, the bridge is only emitted for non-modal focus managers and Menu.Popup hard-codes modal: isContextMenu, and a role="none" wrapper does not help because axe recurses through presentational wrappers. Asserted in composites.test.tsx and subtracted from a whole-widget axe run in menubar.test.tsx, so a Base UI fix surfaces as a failure.',
      },
    },
    api: {
      axisSources: {
        variant: {
          source: "data-attribute",
          note: "MenubarItem writes data-variant and styles with data-[variant=destructive]: default | destructive.",
        },
      },
    },
  },
  meter: {
    status: "stable",
    capabilities: { density: "not-applicable" },
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
    status: "stable",
    accessibility: {
      required: true,
      pattern: "spinbutton",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "not-audited",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "arrow-up", "arrow-down"],
      exceptions: {
        semantic:
          'Base UI renders a text input with aria-roledescription ("Number field") rather than role=spinbutton; the spinbutton keyboard contract (ArrowUp/ArrowDown step) holds. The role description comes from the catalogue (numberField.roleDescription).',
      },
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  popover: {
    status: "stable",
    capabilities: { density: "unsupported" },
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
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
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
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "radio-group",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
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
    status: "stable",
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
    status: "stable",
    accessibility: {
      required: true,
      pattern: "slider",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "not-audited",
        screenReader: "pass",
        // RTL-001: a horizontal slider's inline arrow keys mirror, as the APG requires.
        rtl: "pass",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "arrow-left", "arrow-right", "home", "end"],
      focus: { model: "none", contained: false, restored: false },
    },
    api: {
      axisSources: {
        size: {
          source: "class-map",
          note: "Indexes the sizeClasses table to size the icon: sm | default | lg.",
        },
      },
    },
  },
  "segmented-control": {
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "radio-group",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
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
    status: "stable",
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
    api: {
      axisSources: {
        size: {
          source: "data-attribute",
          note: "SelectTrigger writes data-size and styles with data-[size=sm] utilities: default | sm.",
        },
      },
      controlled: [{ value: "value", default: "defaultValue", change: "onValueChange" }],
    },
  },
  sheet: {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "dialog",
      dimensions: {
        semantic: "not-audited",
        name: "not-audited",
        keyboard: "not-audited",
        focus: "not-audited",
        screenReader: "not-audited",
        // Logical sides (inline-start / inline-end) mirror under :dir(rtl); sheet.test.tsx.
        rtl: "pass",
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
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "slider",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "not-audited",
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
    status: "stable",
    accessibility: {
      required: true,
      pattern: "switch",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "not-audited",
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
      axisSources: {
        size: {
          source: "data-attribute",
          note: "Written to data-size and styled with data-[size=sm] utilities: default | sm.",
        },
      },
    },
  },
  table: { status: "beta", accessibility: { required: true, pattern: "table" } },
  tabs: {
    status: "stable",
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
    status: "stable",
    accessibility: {
      required: true,
      pattern: "button",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "not-audited",
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
    status: "stable",
    // Density by composition: items are buttonVariants, whose default size is the density-
    // resolved button height. Focus and disabled states come from the same recipe.
    capabilities: { density: "supported" },
    states: ["hover", "active", "focus-visible", "disabled"],
    accessibility: {
      required: true,
      pattern: "toolbar",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
        rtl: "pass",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "arrow-left", "arrow-right", "home", "end"],
      focus: { model: "roving", contained: false, restored: false },
    },
    api: {
      axisSources: {
        variant: {
          source: "forwarded",
          note: "Toolbar.variant (default | ghost) is a container data-attribute; ToolbarButton.variant and ToolbarLink are forwarded to Button's buttonVariants.",
        },
        size: {
          source: "forwarded",
          note: "ToolbarButton/ToolbarLink size is passed straight to buttonVariants: default | sm | icon | icon-sm and the rest of Button's scale.",
        },
      },
    },
  },
  tooltip: {
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "tooltip",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "escape"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  tour: {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "dialog",
      // AG-3 rebuilt Tour on the shared overlay machinery: it inerts the background, locks
      // scroll, contains focus and restores it. `keyboard` and `focus` are descriptive records
      // of what the component does, so they can be updated without an audit; the dimension
      // promotions AG-3 proposed are not applied, because the tests that would prove them assert
      // on Tour through `focus-trap` and the overlay manager rather than asserting Tour's own
      // keyboard or announcement behaviour. See docs/governance/accessibility-evidence.md.
      keyboard: ["tab", "shift+tab", "escape", "arrow-left", "arrow-right"],
      focus: { model: "sequential", contained: true, restored: true },
    },
    states: ["hover", "open"],
    api: { controlled: [{ value: "open", default: "defaultOpen", change: "onOpenChange" }] },
  },
  "tree-view": {
    status: "stable",
    accessibility: {
      required: true,
      pattern: "treeview",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        // RTL-001: expand/collapse is on the inline axis, so both keys swap under `dir="rtl"`.
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
        "asterisk",
        "type-ahead",
      ],
      focus: { model: "roving", contained: false, restored: false },
    },
  },

  // ── native semantics, no APG pattern ────────────────────────────────────────────────
  input: {
    status: "stable",
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
    status: "stable",
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-audited",
        focus: "not-audited",
        screenReader: "not-audited",
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
    status: "stable",
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
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
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
    },
  },
  "skip-nav": {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
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
    status: "stable",
    description: "Hides content visually while keeping it available to screen readers.",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
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
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
    },
  },
  avatar: {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        // The fallback is announced as the name, not as spelled-out initials; avatar.test.tsx.
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
    api: {
      axisSources: {
        size: {
          source: "data-attribute",
          note: "Written to data-size and styled with data-[size=…] utilities: xs | sm | default | lg | xl.",
        },
      },
    },
  },
  badge: {
    status: "stable",
    capabilities: { density: "not-applicable" },
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
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  chip: {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: false, pattern: "none" },
    api: { controlled: [{ value: "value", default: "defaultValue", change: "onValueChange" }] },
  },
  container: {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
    },
    api: { domainAxes: ["size"] },
  },
  highlight: {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
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
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  separator: {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  skeleton: {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  typography: {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
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
  "app-shell": {
    status: "beta",
    accessibility: { required: true, pattern: "landmarks" },
  },
  calendar: {
    status: "beta",
    // RTL-001: the inline arrow keys mirror under dir="rtl"; calendar.test.tsx.
    accessibility: { required: true, pattern: "grid", dimensions: { rtl: "pass" } },
  },
  clipboard: {
    status: "stable",
    description:
      "Copy to the clipboard: `CopyButton`, which confirms the copy, and the `useCopyToClipboard` hook.",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "button",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-audited",
        focus: "pass",
        screenReader: "not-audited",
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
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "alert",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "data-table": {
    status: "beta",
    accessibility: {
      required: true,
      pattern: "table",
      // Descriptive, not a conformance claim: these record which keys the component handles
      // and how focus moves, which is why they can be updated without an audit. Every
      // dimension stays `not-audited` — see AG-2's note in the changeset for DataTable.
      keyboard: ["tab", "enter", "space", "arrow-left", "arrow-right", "home", "end"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  link: {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: true,
      pattern: "link",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "enter"],
      focus: { model: "none", contained: false, restored: false },
    },
  },
  "mention-input": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      // Not the APG combobox: a multiline textbox (role=combobox would drop aria-multiline, and
      // ARIA forbids aria-expanded on a textbox) with aria-autocomplete=list, a role=listbox
      // popup and a polite status region for the suggestion count.
      pattern: "none",
    },
  },
  "navigation-menu": { status: "beta", accessibility: { required: true, pattern: "disclosure" } },
  resizable: {
    status: "beta",
    description:
      "Panels separated by draggable handles, built from `ResizablePanelGroup`, `ResizablePanel` and `ResizableHandle`.",
    capabilities: { density: "not-applicable" },
    accessibility: { required: true, pattern: "window-splitter" },
  },
  "schedule-calendar": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: true, pattern: "table" },
  },
  spoiler: {
    status: "stable",
    capabilities: { density: "not-applicable" },
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
  toast: {
    status: "beta",
    description:
      "Brief notifications: mount `Toaster` once and call `toast()` from anywhere; toasts stack, pause on hover and announce politely.",
    capabilities: { density: "unsupported" },
    accessibility: { required: true, pattern: "alert" },
  },
  // ── accessibility contract, no APG pattern ──────────────────────────────────────
  // Labelling, native semantics or focus management that a change may not break.
  // AG-7: now a real role="grid" with row/columnheader/rowheader/gridcell children and a roving
  // tab stop. The pattern is a description of what the component is, not an audit claim.
  "availability-grid": {
    status: "beta",
    accessibility: {
      required: true,
      pattern: "grid",
      // RTL-001: column navigation runs along the inline axis, so ArrowLeft advances a day
      // under `dir="rtl"` and clamps at the visual edge. Five colocated tests assert it.
      dimensions: { rtl: "pass" },
    },
  },
  banner: {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: true, pattern: "none" },
    api: { variantAliases: { danger: "destructive" } },
  },
  "button-group": {
    status: "beta",
    capabilities: { density: "not-applicable" },
    accessibility: { required: true, pattern: "none" },
    api: {
      axisSources: {
        orientation: {
          source: "layout",
          note: "Structural: horizontal or vertical stacking, written to data-orientation. Not an appearance axis.",
        },
      },
    },
  },
  callout: {
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
    api: { variantAliases: { error: "destructive" } },
  },
  chart: {
    status: "beta",
    description:
      "Chart containers built on Recharts and themed with the Qeetrix series colours, with `ChartDataTable` as the non-colour alternative every chart should offer.",
    capabilities: { density: "unsupported" },
    accessibility: { required: true, pattern: "none" },
  },
  "code-block": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: true, pattern: "none" },
  },
  "color-picker": {
    status: "beta",
    accessibility: {
      required: true,
      pattern: "none",
      // `screenReader` here is the invalid-state channel only — the hex input's `aria-invalid`
      // agreeing with both the parse and a Field error.
      dimensions: { semantic: "pass", name: "pass", screenReader: "pass" },
    },
  },
  "color-swatch": {
    status: "beta",
    capabilities: { density: "not-applicable" },
    accessibility: { required: true, pattern: "none" },
  },
  "copyable-secret": {
    status: "beta",
    accessibility: { required: true, pattern: "none" },
    api: {
      axisSources: {
        size: {
          source: "class-map",
          note: "Selects padding and text-size utilities in a conditional, and forwards a mapped value to Button: sm | md.",
        },
      },
    },
  },
  "country-picker": {
    status: "beta",
    // Density by composition: it renders NativeSelect by default and Combobox when searchable.
    capabilities: { density: "supported" },
    accessibility: { required: true, pattern: "none" },
    api: { controlled: [{ value: "value", default: "defaultValue", change: "onChange" }] },
  },
  "currency-input": {
    status: "beta",
    capabilities: { density: "supported" },
    accessibility: { required: true, pattern: "none" },
  },
  "date-picker": {
    status: "beta",
    accessibility: {
      required: true,
      pattern: "none",
      // The keyboard suite opens from the keyboard, moves by day, picks with Enter, closes on
      // Escape and asserts focus returns to the trigger.
      dimensions: { semantic: "pass", name: "pass", keyboard: "pass", focus: "pass" },
    },
  },
  "date-time-picker": {
    status: "beta",
    // Density by composition: its day grid is Calendar (cell = control height) and its time
    // columns are TimePicker, both density-resolved.
    capabilities: { density: "supported" },
    accessibility: { required: true, pattern: "none" },
  },
  "diff-viewer": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: true, pattern: "none" },
  },
  editable: {
    status: "beta",
    accessibility: {
      required: true,
      pattern: "none",
      // Committing or cancelling returns focus to the preview it was opened from.
      focus: { model: "sequential", contained: false, restored: true },
    },
  },
  field: {
    status: "stable",
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
    api: {
      axisSources: {
        variant: {
          source: "data-attribute",
          note: "FieldLegend writes data-variant and styles with data-[variant=label|legend]: legend | label.",
        },
      },
    },
  },
  "file-upload": {
    status: "beta",
    description:
      "Upload files by dropping or browsing: a `Dropzone`, with `FileList` and `FileUploadItem` to show each file's progress, status and errors.",
    accessibility: {
      required: true,
      pattern: "none",
      // The dropzone is a native-button-activated target (Enter/Space) and each row announces its
      // progress politely, named after the file; file-upload.test.tsx.
      dimensions: { name: "pass", keyboard: "pass", focus: "pass", screenReader: "pass" },
    },
  },
  "focus-trap": {
    status: "beta",
    capabilities: { density: "not-applicable" },
    accessibility: { required: true, pattern: "none" },
  },
  form: {
    status: "beta",
    accessibility: { required: true, pattern: "none" },
  },
  icon: {
    status: "beta",
    capabilities: { density: "not-applicable" },
    accessibility: { required: true, pattern: "none" },
    api: {
      axisSources: {
        size: {
          source: "measurement",
          note: "A pixel value, either a number or a key into the ICON_SIZE table that resolves to one.",
        },
      },
    },
  },
  "input-group": {
    status: "stable",
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-audited",
        focus: "pass",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab"],
      focus: { model: "sequential", contained: false, restored: false },
    },
    api: {
      axisSources: {
        variant: {
          source: "data-attribute",
          note: "InputGroupAddon writes data-variant: inline (on the field surface) | segment (a divided, tinted cell).",
        },
      },
    },
  },
  "json-tree": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      // One role=tree with a single tab stop and arrow-key navigation; json-tree.test.tsx.
      pattern: "treeview",
      dimensions: { semantic: "pass", keyboard: "pass" },
      keyboard: ["tab", "arrow-up", "arrow-down", "arrow-left", "arrow-right", "home", "end"],
      focus: { model: "roving", contained: false, restored: false },
    },
  },
  "mask-input": {
    status: "beta",
    capabilities: { density: "supported" },
    accessibility: { required: true, pattern: "none" },
  },
  notification: {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: true, pattern: "none" },
    api: { variantAliases: { error: "destructive" } },
  },
  "org-chart": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: true, pattern: "none" },
  },
  "otp-input": {
    status: "stable",
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
        // RTL-001 (revised): a code is a number, so under dir="rtl" the boxes keep left-to-right
        // digit order (the row is reversed, not given dir="ltr") and ArrowRight is always the next
        // digit — the keys follow what is on screen.
        rtl: "pass",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
      keyboard: ["tab", "backspace", "arrow-left", "arrow-right", "home", "end"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  pagination: {
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-audited",
        focus: "not-audited",
        screenReader: "pass",
        // RTL-001: every directional chevron mirrors, and the row counts follow the locale.
        rtl: "pass",
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
    status: "stable",
    capabilities: { density: "supported" },
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        // The reveal toggle keeps focus and is operable from the keyboard; asserted.
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "not-applicable",
        contrast: "not-applicable",
      },
      keyboard: ["tab", "enter", "space"],
      focus: { model: "sequential", contained: false, restored: false },
    },
  },
  "password-strength-meter": {
    status: "beta",
    capabilities: { density: "not-applicable" },
    accessibility: { required: true, pattern: "none", liveRegion: "polite" },
  },
  "presence-indicator": {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  progress: {
    status: "stable",
    capabilities: { density: "not-applicable" },
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
    status: "stable",
    capabilities: { density: "not-applicable" },
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
  "qr-code": {
    status: "beta",
    capabilities: { density: "not-applicable" },
    // The tile opts out of forced-colour remapping, so the code stays scannable; asserted.
    accessibility: { required: true, pattern: "none", dimensions: { forcedColors: "pass" } },
    api: {
      axisSources: {
        size: {
          source: "measurement",
          note: "The rendered edge length in pixels, passed to the QR encoder. Not a closed set.",
        },
      },
    },
  },
  "reaction-bar": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: true, pattern: "none" },
  },
  // AG-7: the formatting strip is a named role="toolbar" with one tab stop and arrow/Home/End
  // navigation. The editable region itself maps to no APG pattern; the toolbar is what changed.
  "rich-text-editor": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "toolbar",
      // API-003/A11Y: a named role="toolbar" with one tab stop, arrow/Home/End navigation, a
      // multiline textbox, Field label/description/error association, and arrow keys that mirror
      // under RTL — all asserted in the colocated suite.
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "pass",
        focus: "pass",
        screenReader: "pass",
        rtl: "pass",
      },
    },
    states: ["disabled", "read-only", "invalid"],
  },
  "scroll-area": {
    status: "beta",
    capabilities: { density: "not-applicable" },
    accessibility: { required: true, pattern: "none", dimensions: { forcedColors: "pass" } },
  },
  sidebar: {
    status: "beta",
    accessibility: {
      required: true,
      pattern: "none",
      // Direction (rail offset, mobile sheet side, portalled sheet dir) and the focus ring are
      // asserted in sidebar.test.tsx.
      dimensions: { rtl: "pass", focus: "pass" },
    },
  },
  spinner: {
    status: "stable",
    capabilities: { density: "not-applicable" },
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
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "pass",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
    api: {
      axisSources: {
        orientation: {
          source: "layout",
          note: "Structural: horizontal | vertical, written to data-orientation. Not an appearance axis.",
        },
      },
    },
  },
  "table-of-contents": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: true, pattern: "none" },
  },
  "tag-input": {
    status: "beta",
    accessibility: {
      required: true,
      pattern: "none",
      // Tags are a roving row: arrows move between them, Backspace/Delete remove one and move
      // focus to its neighbour, Home/End/Escape return to the draft, Enter adds. Additions and
      // removals are announced politely.
      keyboard: [
        "tab",
        "enter",
        "backspace",
        "delete",
        "arrow-left",
        "arrow-right",
        "home",
        "end",
        "escape",
      ],
      liveRegion: "polite",
    },
  },
  "time-picker": {
    status: "beta",
    // Density by composition: the default column height is the density-resolved field height
    // (`size="default"`); `sm` is the explicit 28px opt-out.
    capabilities: { density: "supported" },
    accessibility: {
      required: true,
      pattern: "none",
      dimensions: { semantic: "pass", name: "pass" },
    },
  },
  "time-range-picker": {
    status: "beta",
    // Density by composition: the range grid is Calendar, whose cell is the control height.
    capabilities: { density: "supported" },
    accessibility: { required: true, pattern: "none" },
  },
  timer: {
    status: "beta",
    capabilities: { density: "unsupported" },
    // Pause/resume/complete are announced politely; role=timer stays out of the live region.
    accessibility: { required: true, pattern: "none", liveRegion: "polite" },
  },
  "timezone-picker": {
    status: "beta",
    // Density by composition: it renders NativeSelect by default and Combobox when searchable.
    capabilities: { density: "supported" },
    accessibility: { required: true, pattern: "none" },
    api: { controlled: [{ value: "value", default: "defaultValue", change: "onChange" }] },
  },
  "toggle-tip": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: true, pattern: "none" },
  },
  // ── reviewed and presentational ─────────────────────────────────────────────────
  // No interactive semantics; nothing for a change to break.
  card: {
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
    api: {
      axisSources: {
        size: {
          source: "data-attribute",
          note: "Written to data-size and styled with data-[size=sm] utilities: default | sm.",
        },
      },
    },
  },
  "chart-presets": {
    status: "beta",
    description: "Ready-made area, bar, line and donut charts with Qeetrix defaults.",
    capabilities: { density: "not-applicable" },
    accessibility: { required: false, pattern: "none" },
    api: {
      axisSources: {
        tone: {
          source: "class-map",
          note: "Sparkline.tone selects a stroke colour from a map: default | positive | negative | neutral.",
        },
      },
    },
  },
  "description-list": {
    status: "stable",
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "empty-state": {
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
    // `variant` names a scenario (first-use, no-results, no-permission, error), not a look.
    api: { domainAxes: ["variant"] },
  },
  "file-card": {
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        // Applicable once the name opens the file (href → link, onOpen → button); both render
        // native, focusable elements, asserted in file-card.test.tsx.
        keyboard: "pass",
        focus: "pass",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "pass",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
    api: {
      axisSources: {
        size: {
          source: "not-an-axis",
          note: "The file's byte size, rendered as content. The name collides with the axis vocabulary; there is no size axis.",
        },
      },
    },
  },
  "file-type-icon": {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
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
  "filter-bar": {
    status: "beta",
    accessibility: { required: false, pattern: "none" },
  },
  marquee: {
    status: "beta",
    capabilities: { density: "not-applicable" },
    accessibility: { required: false, pattern: "none", dimensions: { reducedMotion: "pass" } },
  },
  "number-formatter": {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
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
  "overflow-list": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: false, pattern: "none" },
  },
  "page-header": {
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "pass",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  portal: {
    status: "beta",
    description:
      "Renders its children into `document.body` or another container, mounting on the client only, so overlays escape clipping and stacking contexts.",
    capabilities: { density: "not-applicable" },
    accessibility: { required: false, pattern: "none" },
  },
  "preview-card": {
    status: "beta",
    capabilities: { density: "unsupported" },
    accessibility: { required: false, pattern: "none" },
  },
  "rolling-number": {
    status: "beta",
    capabilities: { density: "not-applicable" },
    accessibility: { required: false, pattern: "none", dimensions: { reducedMotion: "pass" } },
  },
  stat: {
    status: "stable",
    capabilities: { density: "unsupported" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
  },
  "status-pill": {
    status: "stable",
    capabilities: { density: "not-applicable" },
    accessibility: {
      required: false,
      pattern: "none",
      dimensions: {
        semantic: "pass",
        name: "not-audited",
        keyboard: "not-applicable",
        focus: "not-applicable",
        screenReader: "not-audited",
        rtl: "not-applicable",
        reducedMotion: "not-applicable",
        forcedColors: "pass",
        contrast: "pass",
      },
    },
    api: {
      axisSources: {
        kind: {
          source: "forwarded",
          note: "Mapped through KIND_TO_BADGE onto Badge's variant, so Badge's cva is the definition. `kind` is also a VARIANT_GROUP_ALIASES synonym for `variant`.",
        },
      },
    },
  },
  "time-since": {
    status: "beta",
    capabilities: { density: "not-applicable" },
    accessibility: { required: false, pattern: "none" },
  },
  timeline: {
    status: "beta",
    accessibility: { required: false, pattern: "none" },
    api: {
      axisSources: {
        tone: {
          source: "data-attribute",
          note: "TimelineIndicator writes data-tone: neutral | brand | info | success | warning | destructive (danger is a legacy alias).",
        },
      },
    },
  },
  // ── deprecated ──────────────────────────────────────────────────────────────────────
  "pagination-bar": {
    status: "deprecated",
    description: "The former name of `Pagination`, kept as an alias.",
    capabilities: { density: "unsupported" },
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
