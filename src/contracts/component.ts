/**
 * The Qeetrix component contract.
 *
 * Every component in the library is described by a `ComponentContract`. The contract is
 * the *governance* view of a component — not its props. It answers the questions a
 * consumer, a reviewer or a release gate needs to ask without reading the source:
 * how stable is it, what does it support, what is it tested for, is it going away.
 *
 * Two rules keep this file honest:
 *
 *   1. **Vocabularies are values, types are derived.** Each closed set is declared once as
 *      an `as const` array and the union type is derived from it, so the runtime list and
 *      the compile-time type can never disagree. Build scripts and check scripts read the
 *      same arrays statically (scripts/lib/ts-literals.mjs), so there is exactly one
 *      source of truth for every enum in the system.
 *   2. **Unknown is a value, not a guess.** Anything the library cannot currently prove
 *      about a component is recorded as `"unknown"` / `null`, never as `false`. A missing
 *      fact and a negative fact are different things, and only the first one is a backlog
 *      item.
 *
 * @see docs/governance/component-status.md — what each status means
 * @see docs/standards/component-manifest.md — how the contract reaches component-manifest.json
 */

import type { AccessibilityContract } from "./accessibility";
import type { ComponentLayer } from "./layers";
import type { InteractionState } from "./states";
import type { VariantContract } from "./variants";

/**
 * Component maturity. Governs what a change to the component is allowed to do.
 * See docs/governance/component-status.md.
 */
export const COMPONENT_STATUSES = ["experimental", "beta", "stable", "deprecated"] as const;
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

/**
 * How well a component supports a cross-cutting capability.
 *
 * - `supported`      — the capability is implemented and covered.
 * - `unsupported`    — reviewed, and deliberately not supported.
 * - `not-applicable` — the capability cannot apply (a component with no motion cannot
 *                      "respect reduced motion").
 * - `unknown`        — not reviewed yet. This is a backlog item, not a "no".
 */
export const SUPPORT_LEVELS = ["supported", "unsupported", "not-applicable", "unknown"] as const;
export type SupportLevel = (typeof SUPPORT_LEVELS)[number];

/**
 * Where the module sits relative to the server/client boundary.
 *
 * - `server-safe`     — no `"use client"` directive; renders in a server component.
 * - `client-boundary` — declares `"use client"`; still server-renders, but opens a client
 *                       boundary for its consumers.
 */
export const SSR_SUPPORT_LEVELS = ["server-safe", "client-boundary", "unknown"] as const;
export type SsrSupport = (typeof SSR_SUPPORT_LEVELS)[number];

/**
 * The component families under `src/components/`. Kept in lockstep with
 * scripts/config/component-map.json by scripts/check/component-contract.mjs.
 */
export const COMPONENT_CATEGORIES = [
  "Accordion",
  "AccessReview",
  "ActionBar",
  "Alert",
  "AppShell",
  "AspectRatio",
  "AuditEvent",
  "AvailabilityGrid",
  "Avatar",
  "Badge",
  "Blockquote",
  "Breadcrumb",
  "Button",
  "Calendar",
  "Card",
  "Carousel",
  "Chart",
  "Checkbox",
  "Clipboard",
  "CodeBlock",
  "ColorPicker",
  "Combobox",
  "CommandPalette",
  "CommentThread",
  "Container",
  "CountryPicker",
  "CurrencyInput",
  "DataTable",
  "DatePicker",
  "DescriptionList",
  "Dialog",
  "DiffViewer",
  "Drawer",
  "DropdownMenu",
  "Editable",
  "EmptyState",
  "Feed",
  "FileCard",
  "FileUpload",
  "FilterBar",
  "FloatingWindow",
  "FocusTrap",
  "Form",
  "Highlight",
  "Icon",
  "Input",
  "JsonTree",
  "Kbd",
  "Label",
  "Link",
  "Listbox",
  "Marquee",
  "MaskInput",
  "MasterDetail",
  "MentionInput",
  "NavigationMenu",
  "Notification",
  "NotificationPreferenceMatrix",
  "NumberField",
  "NumberFormatter",
  "OTPInput",
  "OrgChart",
  "OverflowList",
  "PageHeader",
  "Pagination",
  "PasswordInput",
  "Popover",
  "Portal",
  "PresenceIndicator",
  "Progress",
  "QRCode",
  "RadioGroup",
  "Rating",
  "ReactionBar",
  "Resizable",
  "RichTextEditor",
  "RollingNumber",
  "ScrollArea",
  "SecurityItem",
  "Select",
  "Separator",
  "Sidebar",
  "SkipNav",
  "Slider",
  "Spinner",
  "Spoiler",
  "Stat",
  "Stepper",
  "Switch",
  "Table",
  "TableOfContents",
  "TagInput",
  "Tabs",
  "TimeSince",
  "TimezonePicker",
  "Timer",
  "Toast",
  "Toolbar",
  "Tooltip",
  "Tour",
  "TreeView",
  "Typography",
  "VisuallyHidden",
] as const;
export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number];

/** The cross-cutting capabilities every Qeetrix component is measured against. */
export type ComponentCapabilities = {
  /** Direction-agnostic layout — logical properties rather than physical ones. */
  rtl: SupportLevel;
  /** Themable through semantic tokens in both `:root` and `.dark`. */
  darkMode: SupportLevel;
  /** Honours the density scale exposed by `DensityProvider`. */
  density: SupportLevel;
  /** Server-render / client-boundary posture. */
  ssr: SsrSupport;
  /** Degrades motion when the user asks for less of it. */
  reducedMotion: SupportLevel;
};

/**
 * Which automated gates actually cover this component. Every field is derived from the
 * repository — none of it is self-reported.
 */
export type TestingContract = {
  /** A colocated `__tests__/<slug>.test.tsx` exists. */
  unit: boolean;
  /** That test runs `axe`, or the component is in the global a11y harness. */
  accessibility: boolean;
  /** That test drives the component with user-event / fireEvent. */
  interaction: boolean;
  /** A story exists in the qeetrix-story workshop. */
  visual: boolean;
  /** The component is exercised by src/__tests__/hydration.test.tsx. */
  hydration: boolean;
};

/**
 * Why a component is deprecated and what to do about it.
 * `removeIn` stays `null` until a removal is actually announced — see
 * docs/governance/deprecations.md.
 */
export type DeprecationContract = {
  /** Version the deprecation was announced in. */
  since: string;
  /** Why it is deprecated, in one sentence. */
  reason: string;
  /** The component to use instead, or `null` when there is no direct replacement. */
  replacement: string | null;
  /** One-line migration guidance, or a link to it. */
  migration: string | null;
  /** Version the removal is scheduled for. `null` = not announced. */
  removeIn: string | null;
};

/**
 * The complete governance record for one component. This is the shape that
 * `component-manifest.json` carries per entry, and the shape validation is written
 * against.
 */
export type ComponentContract = {
  /** PascalCase display name, e.g. `AlertDialog`. */
  name: string;
  /** kebab-case module name, e.g. `alert-dialog`. Unique across the library. */
  slug: string;
  category: ComponentCategory;
  layer: ComponentLayer;
  status: ComponentStatus;
  capabilities: ComponentCapabilities;
  /** Interaction states the component styles. Empty means "none detected". */
  states: readonly InteractionState[];
  api: VariantContract;
  accessibility: AccessibilityContract;
  testing: TestingContract;
  /** Present only when `status` is `"deprecated"`. */
  deprecation: DeprecationContract | null;
};
