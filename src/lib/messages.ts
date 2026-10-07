/**
 * The message catalogue: every English string this library puts in front of a user, in one
 * place, with a type that describes how to replace it.
 *
 * Direction and locale became runtime contracts in `src/lib/direction.ts` and
 * `src/lib/locale.ts`. This is the third one, and the one an application cannot work around:
 * a `dir` attribute can be set from outside, and a number can be reformatted, but an
 * `aria-label` compiled into a component is unreachable. A Hebrew or Tamil application using
 * `@qeetrix/ui` had a dismiss button that announced "Dismiss" and a pager that announced
 * "Next page", with no prop to change either.
 *
 * ## Shape
 *
 * One exported constant per component, grouped by the category it lives in, each one a plain
 * object of strings and functions. `QeetrixMessages` maps the catalogue key a component
 * resolves under to that group's type — it is the registry `MessagesProvider` is typed
 * against, and adding a group means adding a line to it.
 *
 * A single catalogue rather than defaults beside each component, for one reason: a translator
 * needs to be able to *enumerate* the strings. `QEETRIX_MESSAGES` is that enumeration, and
 * there is no way to produce it from thirty component modules without importing all thirty.
 * The cost is that a default lives a file away from the markup that renders it, which the
 * tests offset — every covered component asserts its rendered default against the catalogue
 * entry, so the two cannot drift silently.
 *
 * ## Interpolation is a function, never a template
 *
 * `"2 of 5"`, `"Uploading report.pdf"` and `"Select Ada Lovelace"` are declared as functions
 * of their parts, not as strings with placeholders. A translator has to be able to reorder
 * them — German puts the noun last, Japanese puts the verb last — and a `"{n} of {total}"`
 * string with a substitution routine is a worse version of the language's own template
 * literals. Numbers arrive pre-formatted (`Intl.NumberFormat`, via `@/lib/locale`) where the
 * component formats them, and the raw count arrives alongside where the plural depends on it.
 *
 * Nothing here imports React, so a build script or a `// @vitest-environment node` test can
 * read it. The React half — resolving a group against a provider and a prop — is
 * `useMessages` in `@/providers/messages-provider`.
 *
 * @see src/providers/messages-provider.tsx for the resolution order
 * @see docs/standards/rtl.md
 */

/**
 * A partial override of one message group.
 *
 * Every key optional, and `undefined` explicitly allowed, so
 * `messages={{ close: condition ? translated : undefined }}` falls back to the default
 * rather than blanking an accessible name.
 */
type MessageOverrides<Group> = { readonly [Key in keyof Group]?: Group[Key] | undefined };

/** Overrides for the group registered under catalogue key `Key`. The type component props use. */
type MessagesFor<Key extends keyof QeetrixMessages> = MessageOverrides<QeetrixMessages[Key]>;

/**
 * A whole-application translation: any subset of groups, each with any subset of its messages.
 * What `MessagesProvider` accepts.
 */
type MessageCatalogue = { readonly [Key in keyof QeetrixMessages]?: MessagesFor<Key> };

/* ── resolution ─────────────────────────────────────────────────────────────────────────────
 * Framework-free so the ordering can be tested without a renderer, and so a non-React caller
 * (a build script generating a translation stub) gets the same answers.
 */

/**
 * `defaults` with each override applied in turn, later arguments winning — the cascade order,
 * so a caller lists sources from least to most specific.
 *
 * Three properties matter, and each is load-bearing:
 *
 *   - `undefined` values are skipped, so a conditional override falls back instead of erasing.
 *   - keys absent from `defaults` are ignored, so a typo cannot smuggle a key into the group
 *     and `__proto__` cannot smuggle anything at all.
 *   - when nothing overrides, `defaults` is returned **by identity**. That is what keeps the
 *     un-translated case — the overwhelming majority of renders — free of a new object per
 *     render, and lets the result be used as a hook dependency.
 *
 * ```ts
 * resolveMessages(paginationMessages, { next: "Weiter" });        // one string translated
 * resolveMessages(paginationMessages, fromProvider, fromProp);    // prop wins
 * ```
 */
function resolveMessages<Group extends object>(
  defaults: Group,
  ...overrides: readonly (MessageOverrides<Group> | undefined)[]
): Group {
  let merged: Group | undefined;

  for (const override of overrides) {
    if (!override) continue;
    for (const key of Object.keys(override) as (keyof Group)[]) {
      const value = override[key];
      // A key the group does not declare is a mistake, not an extension: honouring it would
      // let `__proto__` or a renamed message through and the component would never read it.
      if (value === undefined || !Object.hasOwn(defaults, key)) continue;
      merged ??= { ...defaults };
      merged[key] = value as Group[keyof Group];
    }
  }

  return merged ?? defaults;
}

/**
 * Two catalogues merged group by group, `inner` winning within each group.
 *
 * Nested providers compose rather than replace: an inner provider that translates one
 * component's strings must not discard the outer one's translation of every other component.
 * Returns one of its arguments by identity when the other is empty, for the same reason
 * `resolveMessages` does.
 */
function mergeMessageCatalogues(
  outer: MessageCatalogue | null | undefined,
  inner: MessageCatalogue | null | undefined,
): MessageCatalogue {
  if (!outer) return inner ?? {};
  if (!inner) return outer;

  const merged: Record<string, object> = { ...outer };
  for (const key of Object.keys(inner)) {
    const outerGroup = (outer as Record<string, object | undefined>)[key];
    const innerGroup = (inner as Record<string, object | undefined>)[key];
    if (!innerGroup) continue;
    merged[key] = outerGroup ? { ...outerGroup, ...innerGroup } : innerGroup;
  }
  return merged as MessageCatalogue;
}

/* ── actions ────────────────────────────────────────────────────────────────────────────────── */

/** `ToggleTip` — the info affordance beside a label. */
const toggleTipMessages = {
  /** Accessible name of the trigger. */
  label: "More information",
};
type ToggleTipMessages = typeof toggleTipMessages;

/* ── data display ─────────────────────────────────────────────────────────────────────────── */

/** `Carousel` and its slides and arrows. */
const carouselMessages = {
  /** Accessible name of the carousel region, when the caller gives no `aria-label`. */
  label: "Carousel",
  /** Accessible name of the previous-slide button. */
  previousSlide: "Previous slide",
  /** Accessible name of the next-slide button. */
  nextSlide: "Next slide",
  /**
   * Accessible name of one slide. `position` is **1-based** — it is what the user hears, not
   * an array index.
   */
  slidePosition: (position: number, count: number) => `${position} of ${count}`,
  /** The region's `aria-roledescription`. */
  roleDescription: "carousel",
  /** Each slide's `aria-roledescription`. */
  slideRoleDescription: "slide",
};
type CarouselMessages = typeof carouselMessages;

/** `Chip` — the removable pill. */
const chipMessages = {
  /** Accessible name of the remove affordance. */
  remove: "Remove",
};
type ChipMessages = typeof chipMessages;

/** `CodeBlock` — the copy affordance. */
const codeBlockMessages = {
  /** Accessible name of the copy button at rest. */
  copy: "Copy code",
  /** Accessible name after a successful copy. */
  copied: "Copied",
};
type CodeBlockMessages = typeof codeBlockMessages;

/** `DataTable` — the toolbar, the row controls, the column menu and the pager. */
const dataTableMessages = {
  /** Accessible name of the global-search input. */
  search: "Search",
  /** Placeholder of the global-search input. */
  searchPlaceholder: "Search…",
  /** The control that clears every column filter. */
  resetFilters: "Reset",
  /** Accessible name of the density toggle while rows are compact. */
  comfortableRows: "Comfortable rows",
  /** Accessible name of the density toggle while rows are comfortable. */
  compactRows: "Compact rows",
  /** The CSV export control. */
  exportRows: "Export",
  /** The control that opens the column-visibility menu. */
  columns: "Columns",
  /** Heading inside the column-visibility menu. */
  toggleColumns: "Toggle columns",
  /** The selected-row count above the table. */
  selectedCount: (count: number) => `${count} selected`,
  /** The control that clears the row selection. */
  clearSelection: "Clear",
  /** Politely announced while `busy`. `""` opts out. */
  loading: "Loading rows",
  /** Heading of the built-in empty state. */
  emptyTitle: "No results",
  /** Body of the built-in empty state. */
  emptyDescription: "Try adjusting your search or filters.",
  /**
   * Accessible name of the header checkbox when the table is paginated — it selects the
   * current page only, and saying otherwise overstates it.
   */
  selectAllOnPage: "Select all rows on this page",
  /** Accessible name of the header checkbox when there is no pagination. */
  selectAll: "Select all rows",
  /** Accessible name of a row checkbox when `getRowLabel` did not name the row. */
  selectRow: "Select row",
  /** Accessible name of a row checkbox, naming the row. */
  selectNamedRow: (row: string) => `Select ${row}`,
  /** Accessible name of the expander on a collapsed, unnamed row. */
  expandRow: "Expand row",
  /** Accessible name of the expander on an expanded, unnamed row. */
  collapseRow: "Collapse row",
  /** Accessible name of the expander on a collapsed row, naming the row. */
  expandNamedRow: (row: string) => `Expand ${row}`,
  /** Accessible name of the expander on an expanded row, naming the row. */
  collapseNamedRow: (row: string) => `Collapse ${row}`,
  /** Accessible name of the column-resize separator. */
  resizeColumn: (column: string) => `Resize ${column} column`,
  /** `aria-valuetext` of the resize separator — a width, spoken. */
  columnWidth: (pixels: number) => `${pixels} pixels`,
  /** Accessible name of the per-column options menu. */
  columnOptions: (column: string) => `Column options for ${column}`,
  /** Pin the column to the inline start. */
  pinLeft: "Pin left",
  /** Pin the column to the inline end. */
  pinRight: "Pin right",
  /** Release a pinned column. */
  unpin: "Unpin",
  /** Shown in a faceted filter with nothing to offer. */
  noOptions: "No options",
  /** The control that clears one faceted filter. */
  clearFilter: "Clear",
  /** The pager's position readout. `page` is 1-based. */
  pageOf: (page: number, count: number) => `Page ${page} of ${count}`,
  /** The pager's step-back control. */
  previousPage: "Previous",
  /** The pager's advance control. */
  nextPage: "Next",
};
type DataTableMessages = typeof dataTableMessages;

/** `DiffViewer` — the two panes and the screen-reader prefixes on changed lines. */
const diffViewerMessages = {
  /** Accessible name of the "before" pane in split mode. */
  before: "Before version",
  /** Accessible name of the "after" pane in split mode. */
  after: "After version",
  /** Screen-reader prefix marking a removed line. */
  removed: "Removed:",
  /** Screen-reader prefix marking an added line. */
  added: "Added:",
};
type DiffViewerMessages = typeof diffViewerMessages;

/** `JsonTree`, `OrgChart`, `TreeView` — the disclosure toggle on a node. */
const disclosureMessages = {
  /** Accessible name of the toggle when the node is open. */
  collapse: "Collapse",
  /** Accessible name of the toggle when the node is closed. */
  expand: "Expand",
};
type DisclosureMessages = typeof disclosureMessages;

/** `PresenceIndicator` — the status dot. */
const presenceIndicatorMessages = {
  /**
   * Accessible name for a presence state. The default is the identity function — the English
   * name of the state is the state's own key — which is exactly the string a translation has
   * to replace.
   */
  status: (status: "online" | "away" | "busy" | "offline"): string => status,
};
type PresenceIndicatorMessages = typeof presenceIndicatorMessages;

/** `ReactionBar` — the emoji picker and the reaction counts. */
const reactionBarMessages = {
  /** Accessible name of the button that opens the emoji picker. */
  addReaction: "Add reaction",
  /** Accessible name of one existing reaction, e.g. a thumbs-up with a count of 3. */
  reactionCount: (emoji: string, count: number) => `${emoji} ${count}`,
  /** Accessible name of one option inside the picker. */
  react: (emoji: string) => `React ${emoji}`,
  /** Accessible name of the whole bar. */
  label: "Reactions",
  /**
   * Who reacted. `names` holds at most three people; `total` is the reaction count, so the
   * remainder can be summarised.
   */
  reactedBy: (names: string[], total: number) => {
    const rest = total - names.length;
    if (rest > 0) return `${names.join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}`;
    if (names.length <= 1) return names.join("");
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  },
};
type ReactionBarMessages = typeof reactionBarMessages;

/** `FileCard` — a file's card or row, with its transfer progress. */
const fileCardMessages = {
  /** Accessible name of the progress bar while the file uploads. */
  uploading: (name: string) => `Uploading ${name}`,
  /** Accessible name of the progress bar while the file downloads. */
  downloading: (name: string) => `Downloading ${name}`,
  /** Shown when `status="error"` and no `error` text is given. */
  failed: "Transfer failed.",
};
type FileCardMessages = typeof fileCardMessages;

/** `QRCode` — the rendered code image. */
const qrCodeMessages = {
  /** Accessible name of the image, when no `aria-label` is given. */
  label: "QR code",
};
type QrCodeMessages = typeof qrCodeMessages;

/** `Spoiler` — the clamp toggle. */
const spoilerMessages = {
  /** The toggle while the content is clamped, when no `showLabel` is given. */
  show: "Show more",
  /** The toggle while the content is expanded, when no `hideLabel` is given. */
  hide: "Show less",
};
type SpoilerMessages = typeof spoilerMessages;

/** `JSONTree` — the collapsed-container summaries. */
const jsonTreeMessages = {
  /** A collapsed array: how many items it holds. */
  items: (count: number) => `${count} item${count === 1 ? "" : "s"}`,
  /** A collapsed object: how many keys it holds. */
  keys: (count: number) => `${count} key${count === 1 ? "" : "s"}`,
};
type JsonTreeMessages = typeof jsonTreeMessages;

/* ── feedback ─────────────────────────────────────────────────────────────────────────────── */

/** `Banner` — the app-wide announcement bar. */
const bannerMessages = {
  /** Accessible name of the dismiss button. */
  dismiss: "Dismiss",
};
type BannerMessages = typeof bannerMessages;

/** `Notification` — the inline notification card. */
const notificationMessages = {
  /** Accessible name of the close button. */
  dismiss: "Dismiss",
};
type NotificationMessages = typeof notificationMessages;

/** `Spinner` — the indeterminate busy indicator. */
const spinnerMessages = {
  /** Accessible name of the spinner. */
  label: "Loading",
};
type SpinnerMessages = typeof spinnerMessages;

/** `Toaster` — the transient toast. */
const toastMessages = {
  /** Accessible name of the close button. */
  close: "Close",
  /** Accessible name of the toast viewport (the F6 landing point). */
  viewport: "Notifications",
};
type ToastMessages = typeof toastMessages;

/** `Tour` — the guided-walkthrough popover. */
const tourMessages = {
  /** Accessible name of the button that ends the tour early. */
  dismiss: "Dismiss tour",
  /** The step-back action. */
  back: "Back",
  /** The step-forward action. */
  next: "Next",
  /** The step-forward action on the last step, which ends the tour. */
  done: "Done",
  /** The step counter. `position` is **1-based**. */
  progress: (position: number, count: number) => `${position} of ${count}`,
  /** The polite announcement when the tour moves to a step: its title and the counter. */
  stepStatus: (title: string, progress: string) => `${title}, ${progress}`,
};
type TourMessages = typeof tourMessages;

/** `DataState`. Server-safe: its `errorFallback` prop replaces the error view. */
const dataStateMessages = {
  /** Shown in the error state when the error carries no message of its own. */
  error: "Something went wrong while loading this data.",
};
type DataStateMessages = typeof dataStateMessages;

/* ── inputs ───────────────────────────────────────────────────────────────────────────────── */

/** `Editable` — the click-to-edit text field. */
const editableMessages = {
  /** Placeholder shown while the field is empty and at rest. */
  placeholder: "Click to edit",
};
type EditableMessages = typeof editableMessages;

/** `Dropzone`, `FileUploadItem` — the drop target, its rejections and one file's row. */
const fileUploadMessages = {
  /** The drop target's instruction when several files may be chosen. */
  dropMany: "Drop files here, or click to browse",
  /** The drop target's instruction when only one file may be chosen. */
  dropOne: "Drop a file here, or click to browse",
  /** The size hint under the instruction. `size` arrives already formatted for the locale. */
  maxSizeHint: (size: string) => `up to ${size}`,
  /** Rejection message for a file whose type `accept` excludes. */
  rejectedType: (name: string) => `${name}: file type not allowed.`,
  /** Rejection message for an oversized file. `limit` arrives already formatted. */
  rejectedSize: (name: string, limit: string) => `${name}: larger than ${limit}.`,
  /** Rejection message when a second file arrives at a single-file target. */
  rejectedCountOne: (name: string) => `${name}: only one file can be selected.`,
  /** Rejection message when a drop exceeds a multi-file limit. */
  rejectedCount: (name: string, limit: number) => `${name}: exceeds the ${limit}-file limit.`,
  /**
   * Politely-announced status of one row. `""` opts out of the announcement, which the
   * default does for a failure — the visible copy is already a `role="alert"`, and
   * announcing it twice is worse than not announcing it.
   *
   * Takes one object rather than positional arguments so it stays interchangeable with the
   * `statusLabel` prop it supersedes.
   */
  status: ({
    name,
    status,
    progress,
  }: {
    name: string;
    status: "pending" | "uploading" | "success" | "error";
    progress?: number;
  }): string => {
    switch (status) {
      case "uploading":
        return typeof progress === "number"
          ? `${name}: uploading, ${Math.round(progress)}%`
          : `${name}: uploading`;
      case "success":
        return `${name}: upload complete`;
      default:
        return "";
    }
  },
  /** Accessible name of the per-file progress bar. */
  uploading: (name: string) => `Uploading ${name}`,
  /** Accessible name of the per-file remove button. */
  remove: (name: string) => `Remove ${name}`,
  /** Accessible name of the per-file retry button, shown on a failed row. */
  retry: (name: string) => `Retry ${name}`,
  /** Accessible name of the per-file cancel button, shown while a row uploads. */
  cancel: (name: string) => `Cancel upload of ${name}`,
  /** Visible status of a finished row, beside its size. */
  uploaded: "Uploaded",
  /** Shown (and announced) on a failed row that was given no `error` text. */
  failed: "Upload failed.",
};
type FileUploadMessages = typeof fileUploadMessages;

/** `FormErrorSummary` — the heading above a list of submission errors. */
const formMessages = {
  /** Heading of the error summary. */
  errorSummaryTitle: "There is a problem",
};
type FormMessages = typeof formMessages;

/** `MentionInput` — the suggestion popover. */
const mentionInputMessages = {
  /** Accessible name of the suggestion listbox. */
  suggestions: "Mention suggestions",
  /** Politely-announced suggestion count. `""` opts out of the announcement. */
  suggestionCount: (count: number) =>
    count === 1 ? "1 suggestion available" : `${count} suggestions available`,
};
type MentionInputMessages = typeof mentionInputMessages;

/** `NumberField` — the stepper buttons. */
const numberFieldMessages = {
  /** Accessible name of the decrement button. */
  decrease: "Decrease",
  /** Accessible name of the increment button. */
  increase: "Increase",
  /**
   * The input's `aria-roledescription`. Base UI renders a text input, not role=spinbutton, and
   * names its role with this.
   */
  roleDescription: "Number field",
};
type NumberFieldMessages = typeof numberFieldMessages;

/** `OTPInput` — the one-time-code slots. */
const otpInputMessages = {
  /** Accessible name of the group, when no `Field` label and no `aria-label` name it. */
  label: "One-time code",
  /** Accessible name of one slot. `position` is 1-based. */
  digit: (position: number, count: number) => `Digit ${position} of ${count}`,
};
type OtpInputMessages = typeof otpInputMessages;

/** `PasswordInput` — the reveal toggle. */
const passwordInputMessages = {
  /** Accessible name of the toggle while the password is hidden. */
  show: "Show password",
  /** Accessible name of the toggle while the password is visible. */
  hide: "Hide password",
};
type PasswordInputMessages = typeof passwordInputMessages;

/** `RichTextEditor` — the formatting toolbar. */
const richTextEditorMessages = {
  /** Accessible name of the toolbar. */
  toolbar: "Formatting",
  /** Toolbar control: bold. */
  bold: "Bold",
  /** Toolbar control: italic. */
  italic: "Italic",
  /** Toolbar control: strikethrough. */
  strike: "Strikethrough",
  /** Toolbar control: inline code. */
  code: "Inline code",
  /** Toolbar control: level-1 heading. */
  heading1: "Heading 1",
  /** Toolbar control: level-2 heading. */
  heading2: "Heading 2",
  /** Toolbar control: level-3 heading. */
  heading3: "Heading 3",
  /** Toolbar control: bulleted list. */
  bulletList: "Bullet list",
  /** Toolbar control: numbered list. */
  orderedList: "Numbered list",
  /** Toolbar control: block quote. */
  quote: "Quote",
  /** Toolbar control: code block. */
  codeBlock: "Code block",
  /** Toolbar control that opens the link bar. */
  link: "Link",
  /** Toolbar action: undo. */
  undo: "Undo",
  /** Toolbar action: redo. */
  redo: "Redo",
  /** Accessible name of the editing surface, when no label or `aria-label` names it. */
  surface: "Rich text editor",
  /** Accessible name of the link-editing row. */
  linkBar: "Edit link",
  /** Accessible name of the link address input. */
  linkUrl: "Link address",
  /** Placeholder of the link address input. */
  linkPlaceholder: "https://",
  /** Commits the link. */
  linkApply: "Apply",
  /** Removes the link under the caret. */
  linkRemove: "Remove link",
  /** Closes the link bar without changing anything. */
  linkCancel: "Cancel",
  /** Shown when the address is not an allowed link. */
  linkInvalid: "Enter a web address, an email address or a phone link.",
};
type RichTextEditorMessages = typeof richTextEditorMessages;

/** `TagInput` — free-form chips in a field. */
const tagInputMessages = {
  /** Accessible name of a tag's remove button. */
  remove: (tag: string) => `Remove ${tag}`,
  /** Announced politely when a tag is added. `""` opts out. */
  added: (tag: string) => `${tag} added`,
  /** Announced politely when a tag is removed. `""` opts out. */
  removed: (tag: string) => `${tag} removed`,
};
type TagInputMessages = typeof tagInputMessages;

/** `Label` / `FieldLabel` — the optional marker. Server-safe: read from here, not a provider. */
const labelMessages = {
  /** Rendered after the label when `optional` is `true`. Pass a node to `optional` to translate. */
  optional: "(optional)",
};
type LabelMessages = typeof labelMessages;

/** `PasswordStrengthMeter`. Server-safe: its `labels` / `statusPrefix` props translate it. */
const passwordStrengthMeterMessages = {
  /** The visually hidden prefix of the announced status. `""` announces the label alone. */
  statusPrefix: "Password strength:",
  /** The label for each score, 0 (empty) to 4. */
  labels: ["", "Weak", "Fair", "Good", "Strong"] as [string, string, string, string, string],
};
type PasswordStrengthMeterMessages = typeof passwordStrengthMeterMessages;

/* ── layout ───────────────────────────────────────────────────────────────────────────────── */

/** `ActionBar` — the bulk-selection toolbar. */
const actionBarMessages = {
  /** Accessible name of the toolbar itself. */
  label: "Selection actions",
  /** The selection-count pill. */
  selectionCount: (count: number) => `${count} selected`,
  /** Accessible name of the clear-selection button. */
  clearSelection: "Clear selection",
};
type ActionBarMessages = typeof actionBarMessages;

/** `FilterBar` — the query builder. */
const filterBarMessages = {
  /** The control that opens the builder. */
  addFilter: "Add filter",
  /** Accessible name of the free-text value input. */
  value: "Filter value",
  /** Placeholder of the field selector. */
  fieldPlaceholder: "Field…",
  /** Placeholder of the operator selector. */
  operatorPlaceholder: "Operator…",
  /** Placeholder of the value input. */
  valuePlaceholder: "Value…",
  /** The action that commits a draft filter. */
  add: "Add",
  /** The action that abandons a draft filter. */
  cancel: "Cancel",
  /** The action that removes every filter. */
  clearAll: "Clear all",
  /** Accessible name of the whole bar. */
  label: "Filters",
  /** Accessible name of the search input. */
  search: "Search",
  /** Placeholder of the search input. */
  searchPlaceholder: "Search…",
  /** Label of the builder's field selector. */
  fieldLabel: "Field",
  /** Label of the builder's operator selector. */
  operatorLabel: "Operator",
  /** Label of the builder's value input. */
  valueLabel: "Value",
  /** Title of the builder when adding. */
  addTitle: "Add filter",
  /** Title of the builder when editing an existing filter. */
  editTitle: "Edit filter",
  /** Commit button of the builder when editing. */
  apply: "Apply",
  /** Accessible name of a filter's remove button. */
  removeFilter: (label: string) => `Remove filter ${label}`,
  /** Announced politely when the set of filters changes. */
  appliedCount: (count: number) =>
    count === 0 ? "No filters applied" : `${count} ${count === 1 ? "filter" : "filters"} applied`,
  /** The collapsed-overflow trigger, visible ("+2") with this as its accessible name. */
  moreFilters: (count: number) => `${count} more ${count === 1 ? "filter" : "filters"}`,
  /** The saved-views trigger when no view is active. */
  views: "Views",
  /** Heading inside the saved-views menu. */
  savedViews: "Saved views",
  /** Menu item that asks the caller to save the current filters as a view. */
  saveView: "Save current view…",
  /** Read after the active view's name once the filters have drifted from it. */
  modified: "modified",
  /**
   * A filter chip's text, and the subject of its remove button's name. A function of its parts
   * so a translation can reorder field, operator and value.
   */
  chipLabel: (field: string, operator: string, value: string) => `${field} ${operator} ${value}`,
};
type FilterBarMessages = typeof filterBarMessages;

/** `OverflowList` — the "+n" affordance. */
const overflowListMessages = {
  /** Accessible name of the overflow trigger. */
  showMore: (hiddenCount: number) => `Show ${hiddenCount} more`,
};
type OverflowListMessages = typeof overflowListMessages;

/* ── navigation ───────────────────────────────────────────────────────────────────────────── */

/** `Breadcrumb` — the trail and its ellipsis. */
const breadcrumbMessages = {
  /**
   * Accessible name of the breadcrumb navigation landmark. Lower-case in English on purpose:
   * it is the shadcn/ui default and the value every existing test queries by.
   */
  label: "breadcrumb",
  /** Screen-reader text behind the collapsed-items ellipsis. */
  more: "More",
};
type BreadcrumbMessages = typeof breadcrumbMessages;

/** `CommandPalette` — the ⌘K launcher. */
const commandPaletteMessages = {
  /** Accessible name of the palette dialog. */
  label: "Command palette",
  /** Placeholder and accessible name of the query input. */
  placeholder: "Search…",
  /** Accessible name of the results list. */
  results: "Results",
  /** Shown when nothing matches the query. */
  empty: "No matches",
  /**
   * Politely-announced result count. `""` opts out of the announcement; the default names
   * the empty case rather than announcing "0 results".
   */
  resultCount: (count: number) => {
    if (count === 0) return "No results";
    return count === 1 ? "1 result" : `${count} results`;
  },
  /** Footer hint beside the ↑ ↓ keycaps. */
  navigateHint: "navigate",
  /** Footer hint beside the ↵ keycap. */
  selectHint: "select",
  /** Footer hint beside the Escape keycap. */
  closeHint: "close",
  /** The Escape keycap's legend. */
  escapeKey: "esc",
};
type CommandPaletteMessages = typeof commandPaletteMessages;

/** `Pagination` — the cursor-pagination footer. */
const paginationMessages = {
  /** Accessible name of the pagination landmark. */
  label: "Pagination",
  /** Accessible name of the jump-to-first control. */
  firstPage: "First page",
  /** Accessible name of the step-back control. */
  previousPage: "Previous page",
  /** Accessible name of the advance control. */
  nextPage: "Next page",
  /** Visible text of the jump-to-first control. */
  first: "First",
  /** Visible text of the step-back control. Abbreviated in English to fit the control. */
  previous: "Prev",
  /** Visible text of the advance control. */
  next: "Next",
  /**
   * The footer label when the total is known. Both counts arrive already formatted for the
   * locale, so a translator must not reformat them.
   */
  showingOfTotal: (shown: string, total: string) => `Showing ${shown} of ${total}`,
  /**
   * The footer label when only a page size is known. `count` is the raw number alongside the
   * formatted `rows`, because the plural form depends on it and the formatted string cannot
   * be parsed back.
   */
  rowsOnPage: (rows: string, count: number) =>
    `${rows} ${count === 1 ? "row" : "rows"} on this page`,
  /** The footer label when neither a total nor a page size is known. */
  rows: (rows: string) => `${rows} rows`,
};
type PaginationMessages = typeof paginationMessages;

/** `Sidebar` — the collapsible application shell rail. */
const sidebarMessages = {
  /** Accessible name of the collapse/expand trigger, and its tooltip. */
  toggle: "Toggle Sidebar",
  /** Accessible name of the mobile sidebar dialog. */
  mobileTitle: "Sidebar",
  /** Description of the mobile sidebar dialog, for assistive technology. */
  mobileDescription: "Displays the mobile sidebar.",
};
type SidebarMessages = typeof sidebarMessages;

/** `TableOfContents` — the in-page outline. */
const tableOfContentsMessages = {
  /** Accessible name of the outline navigation landmark. */
  label: "Table of contents",
};
type TableOfContentsMessages = typeof tableOfContentsMessages;

/** `Stepper` — the visually hidden status of each step. */
const stepperMessages = {
  /** Appended to a step before `activeStep`. */
  complete: "Completed",
  /** Appended to a step marked `invalid`. */
  invalid: "Has errors",
};
type StepperMessages = typeof stepperMessages;

/** `Link` — the screen-reader note on a link that opens a new tab. */
const linkMessages = {
  /** Appended (visually hidden) to an `external` link, when no `externalLabel` is given. */
  opensInNewTab: "(opens in a new tab)",
};
type LinkMessages = typeof linkMessages;

/** `SkipNav` — the skip link. */
const skipNavMessages = {
  /** The link's text, when no `children` are given. */
  label: "Skip to main content",
};
type SkipNavMessages = typeof skipNavMessages;

/* ── selection ────────────────────────────────────────────────────────────────────────────── */

/** `Autocomplete` — the type-ahead field. */
const autocompleteMessages = {
  /** Placeholder of the query input. */
  placeholder: "Type to search…",
  /** Shown when nothing matches the query. */
  empty: "No suggestions.",
  /** Accessible name of the clear button. */
  clear: "Clear",
};
type AutocompleteMessages = typeof autocompleteMessages;

/** `AvailabilityGrid` — the day/time selection grid. */
const availabilityGridMessages = {
  /** Accessible name of the grid. */
  label: "Availability",
  /** Screen-reader header of the leading time column. */
  timeColumnHeader: "Time",
  /**
   * Accessible name of one slot, which has no visible text of its own — only a colour. Both
   * axes arrive as the caller wrote them, already in the caller's language.
   */
  slot: (day: string, time: string) => `${day} ${time}`,
};
type AvailabilityGridMessages = typeof availabilityGridMessages;

/** `Combobox` and `MultiSelect` — the single- and multi-select fields. */
const comboboxMessages = {
  /** Placeholder of the text input. */
  placeholder: "Select…",
  /** Shown when nothing matches what has been typed. */
  empty: "No results.",
  /** Accessible name of the clear-selection button. */
  clearSelection: "Clear selection",
  /** Accessible name of the disclosure button. */
  open: "Open",
  /** Accessible name of one selected item's remove affordance. */
  removeItem: (label: string) => `Remove ${label}`,
  /** The note at the foot of a list cut short by `limit`, when no `limitMessage` is given. */
  limit: "Keep typing to narrow the results.",
};
type ComboboxMessages = typeof comboboxMessages;

/** `Rating` — the star control and its read-only display. */
const ratingMessages = {
  /** The value as `aria-valuetext`: `value` out of `max`. */
  valueText: (value: number, max: number) => `${value} of ${max}`,
  /** Accessible name when neither a label nor `aria-label` names it, built on `valueText`. */
  label: (valueText: string) => `Rating: ${valueText}`,
};
type RatingMessages = typeof ratingMessages;

/** `ColorPicker` and `ColorSwatchGroup`. */
const colorPickerMessages = {
  /** Accessible name of the swatch button that opens the picker. */
  open: "Open colour picker",
  /** Accessible name of the hex input, when no label or `ariaLabel` names it. */
  hex: "Hex colour",
  /** Accessible name of one preset swatch. */
  setColor: (hex: string) => `Set colour ${hex}`,
  /** Accessible name of a swatch group, when no `aria-label` is given. */
  swatches: "Color swatches",
};
type ColorPickerMessages = typeof colorPickerMessages;

/** `CountryPicker`. */
const countryPickerMessages = {
  /** The empty choice, when no `placeholder` is given. */
  placeholder: "Select country",
  /** Accessible name, when no label or `ariaLabel` names it. */
  label: "Country",
};
type CountryPickerMessages = typeof countryPickerMessages;

/** `TimezonePicker`. */
const timezonePickerMessages = {
  /** The empty choice, when no `placeholder` is given. */
  placeholder: "Select timezone",
  /** Accessible name, when no label or `ariaLabel` names it. */
  label: "Timezone",
  /** A native option: the zone's name and its current offset, so a translation can reorder them. */
  option: (zone: string, offset: string) => `${zone} (${offset})`,
};
type TimezonePickerMessages = typeof timezonePickerMessages;

/** `AngleSlider` — the dial. */
const angleSliderMessages = {
  /** Accessible name, when no `aria-label` or `aria-labelledby` is given. */
  label: "Angle",
  /** `aria-valuetext`, when no `getAriaValueText` is given. */
  valueText: (angle: number) => `${angle}°`,
};
type AngleSliderMessages = typeof angleSliderMessages;

/** `DatePicker`, `DateRangePicker` and `DateTimePicker` — triggers, popovers and the Clear action. */
const datePickerMessages = {
  /** The popover's Clear action (`clearable`). */
  clear: "Clear",
  /** DatePicker's trigger while empty, when no `placeholder` is given. */
  placeholder: "Pick a date",
  /** Accessible name of DatePicker's popover. */
  dialog: "Choose a date",
  /** DateRangePicker's trigger while empty, when no `placeholder` is given. */
  rangePlaceholder: "Pick a date range",
  /** Accessible name of DateRangePicker's popover. */
  rangeDialog: "Choose a date range",
  /** DateTimePicker's trigger while empty, when no `placeholder` is given. */
  dateTimePlaceholder: "Pick date & time",
  /** Accessible name of DateTimePicker's popover. */
  dateTimeDialog: "Choose a date and time",
};
type DatePickerMessages = typeof datePickerMessages;

/** `TimePicker` — the hour, minute, second and period columns. */
const timePickerMessages = {
  /** Accessible name of the group, when no label or `aria-label` names it. */
  label: "Time",
  /** Accessible name of the hours column. */
  hours: "Hours",
  /** The hours column's placeholder. */
  hoursPlaceholder: "HH",
  /** Accessible name of the minutes column. */
  minutes: "Minutes",
  /** The minutes column's placeholder. */
  minutesPlaceholder: "MM",
  /** Accessible name of the seconds column. */
  seconds: "Seconds",
  /** The seconds column's placeholder. */
  secondsPlaceholder: "SS",
  /** Accessible name of the 12-hour period column. */
  period: "AM or PM",
  /** The morning period's visible text (the submitted value stays `AM`). */
  am: "AM",
  /** The afternoon period's visible text (the submitted value stays `PM`). */
  pm: "PM",
};
type TimePickerMessages = typeof timePickerMessages;

/** `TimeRangePicker` — the preset list, the custom range and the trigger. */
const timeRangePickerMessages = {
  /** The visible name of a preset range. */
  preset: (preset: "1h" | "24h" | "7d" | "30d" | "90d") =>
    ({
      "1h": "Last hour",
      "24h": "Last 24 hours",
      "7d": "Last 7 days",
      "30d": "Last 30 days",
      "90d": "Last 90 days",
    })[preset],
  /** The trigger while nothing is selected. */
  selectRange: "Select range",
  /** The trigger's accessible name when an `aria-label` is given: that name, then the range. */
  triggerLabel: (label: string, value: string) => `${label}, ${value}`,
  /** Accessible name of the popover. */
  dialog: "Choose a time range",
  /** Heading of the custom-range calendar. */
  customRange: "Custom range",
};
type TimeRangePickerMessages = typeof timeRangePickerMessages;

/** `Calendar` — day names and the navigation DayPicker would otherwise label in English. */
const calendarMessages = {
  /**
   * A day button's accessible name, from its formatted date (in the calendar's locale). Used
   * when a string `locale` (or a DirectionProvider locale) formats the grid; a DayPicker locale
   * object brings its own.
   */
  day: (date: string, state: { today?: boolean; selected?: boolean }) => {
    let label = date;
    if (state.today) label = `Today, ${label}`;
    if (state.selected) label = `${label}, selected`;
    return label;
  },
  /** Appended to a day that exists but is taken (`unavailable`). */
  unavailable: (label: string) => `${label}, unavailable`,
  /** Accessible name of the next-month button. */
  nextMonth: "Go to the Next Month",
  /** Accessible name of the previous-month button. */
  previousMonth: "Go to the Previous Month",
  /** Accessible name of the month dropdown. */
  monthDropdown: "Choose the Month",
  /** Accessible name of the year dropdown. */
  yearDropdown: "Choose the Year",
  /** Accessible name of a week-number cell. */
  weekNumber: (week: number) => `Week ${week}`,
  /** Accessible name of the week-number column header. */
  weekNumberHeader: "Week Number",
};
type CalendarMessages = typeof calendarMessages;

/** `ScheduleCalendar` — the toolbar, the view switch and the empty states. */
const scheduleCalendarMessages = {
  /** The time of an all-day event. */
  allDay: "All day",
  /** Accessible name of the step-back button. */
  previous: "Previous",
  /** The jump-to-today button. */
  today: "Today",
  /** Accessible name of the step-forward button. */
  next: "Next",
  /** Accessible name of the view switch. */
  view: "Calendar view",
  /** The day view option. */
  day: "Day",
  /** The week view option. */
  week: "Week",
  /** The month view option. */
  month: "Month",
  /** The agenda when the period has no events. */
  emptyPeriod: "No events in this period.",
  /** Accessible name of the month grid. */
  monthGrid: (title: string) => `Month of ${title}`,
  /** Screen-reader text of a month cell with no events. */
  noEvents: "No events",
  /** The day view when the day has no events. */
  emptyDay: "No events.",
};
type ScheduleCalendarMessages = typeof scheduleCalendarMessages;

/* ── surfaces ─────────────────────────────────────────────────────────────────────────────── */

/** `Dialog`, `Sheet`, `FloatingWindow` — the close affordance every overlay has. */
const overlayMessages = {
  /** Accessible name of the close button. */
  close: "Close",
};
type OverlayMessages = typeof overlayMessages;

/** `FloatingWindow` — the keyboard move handle in its title bar (WCAG 2.1.1). */
const floatingWindowMessages = {
  /** Accessible name of the move handle. */
  move: "Move window",
  /** The handle's description: how to move the window from the keyboard. */
  moveHint: "Use the arrow keys to move the window. Hold Shift to move it further.",
};
type FloatingWindowMessages = typeof floatingWindowMessages;

/* ── utility ──────────────────────────────────────────────────────────────────────────────── */

/** `Clipboard` — the copy-to-clipboard button. */
const clipboardMessages = {
  /** Visible label at rest. */
  copy: "Copy",
  /** Visible label after a successful copy. Exclamatory in English. */
  copied: "Copied!",
};
type ClipboardMessages = typeof clipboardMessages;

/** `CopyableSecret` — the masked-value field. */
const copyableSecretMessages = {
  /** Accessible name of the copy button at rest. */
  copy: "Copy",
  /** Accessible name after a successful copy. */
  copied: "Copied",
  /** Stands in for the value's name when the caller gives none. */
  secret: "secret",
};
type CopyableSecretMessages = typeof copyableSecretMessages;

/** `Timer` — the countdown/stopwatch readout and its controls. */
const timerMessages = {
  /** Accessible name while counting down. */
  countdown: "Countdown timer",
  /** Accessible name while counting up. */
  stopwatch: "Stopwatch",
  /** The control that starts a stopped timer. */
  start: "Start",
  /** The control that pauses a running timer. */
  pause: "Pause",
  /** The reset action. */
  reset: "Reset",
  /** The control that continues a paused timer. */
  resume: "Resume",
  /** Announced when the controls start or resume the timer. */
  running: "Timer running",
  /** Announced when the controls pause the timer, with the time it stopped at. */
  paused: (time: string) => `Timer paused at ${time}`,
  /** Announced when a countdown reaches zero. */
  completed: "Time is up",
};
type TimerMessages = typeof timerMessages;

/* ── the registry ─────────────────────────────────────────────────────────────────────────── */

/**
 * Every message group, keyed by the catalogue key its component resolves under.
 *
 * Adding a group is two lines — the constant above and an entry here — and the entry is what
 * makes `<MessagesProvider messages={{ … }}>` accept it and `useMessages` type-check against
 * it. Several keys are shared on purpose: `disclosure` names the expand/collapse pair for
 * every tree-shaped component, and `overlay` the close button every dismissible surface has,
 * because a translation of "Collapse" that differed between `JsonTree` and `OrgChart` would
 * be a bug rather than a feature.
 */
interface QeetrixMessages {
  actionBar: ActionBarMessages;
  angleSlider: AngleSliderMessages;
  autocomplete: AutocompleteMessages;
  availabilityGrid: AvailabilityGridMessages;
  banner: BannerMessages;
  breadcrumb: BreadcrumbMessages;
  calendar: CalendarMessages;
  carousel: CarouselMessages;
  chip: ChipMessages;
  clipboard: ClipboardMessages;
  codeBlock: CodeBlockMessages;
  colorPicker: ColorPickerMessages;
  combobox: ComboboxMessages;
  commandPalette: CommandPaletteMessages;
  copyableSecret: CopyableSecretMessages;
  countryPicker: CountryPickerMessages;
  dataState: DataStateMessages;
  dataTable: DataTableMessages;
  datePicker: DatePickerMessages;
  diffViewer: DiffViewerMessages;
  disclosure: DisclosureMessages;
  editable: EditableMessages;
  fileCard: FileCardMessages;
  fileUpload: FileUploadMessages;
  filterBar: FilterBarMessages;
  floatingWindow: FloatingWindowMessages;
  form: FormMessages;
  jsonTree: JsonTreeMessages;
  label: LabelMessages;
  link: LinkMessages;
  mentionInput: MentionInputMessages;
  notification: NotificationMessages;
  numberField: NumberFieldMessages;
  otpInput: OtpInputMessages;
  overflowList: OverflowListMessages;
  overlay: OverlayMessages;
  pagination: PaginationMessages;
  passwordInput: PasswordInputMessages;
  passwordStrengthMeter: PasswordStrengthMeterMessages;
  presenceIndicator: PresenceIndicatorMessages;
  qrCode: QrCodeMessages;
  rating: RatingMessages;
  reactionBar: ReactionBarMessages;
  richTextEditor: RichTextEditorMessages;
  scheduleCalendar: ScheduleCalendarMessages;
  sidebar: SidebarMessages;
  skipNav: SkipNavMessages;
  spinner: SpinnerMessages;
  spoiler: SpoilerMessages;
  stepper: StepperMessages;
  tableOfContents: TableOfContentsMessages;
  tagInput: TagInputMessages;
  timePicker: TimePickerMessages;
  timeRangePicker: TimeRangePickerMessages;
  timer: TimerMessages;
  timezonePicker: TimezonePickerMessages;
  toast: ToastMessages;
  toggleTip: ToggleTipMessages;
  tour: TourMessages;
}

/**
 * The whole catalogue as one object — the English source text, and the thing to hand a
 * translator or diff a translation against.
 *
 * Components never read this: each imports its own group directly, so a bundler drops the
 * groups an application does not use. This aggregate exists for the translation workflow and
 * for the tests that assert a rendered default against its catalogue entry.
 *
 * Not frozen, deliberately. `Object.freeze` at module scope is a call a bundler is entitled
 * to treat as a side effect, which would pin every group into every bundle. Treat it as
 * read-only; mutating it mutates the defaults of every component in the process.
 */
const QEETRIX_MESSAGES: QeetrixMessages = {
  actionBar: actionBarMessages,
  angleSlider: angleSliderMessages,
  autocomplete: autocompleteMessages,
  availabilityGrid: availabilityGridMessages,
  banner: bannerMessages,
  breadcrumb: breadcrumbMessages,
  calendar: calendarMessages,
  carousel: carouselMessages,
  chip: chipMessages,
  clipboard: clipboardMessages,
  codeBlock: codeBlockMessages,
  colorPicker: colorPickerMessages,
  combobox: comboboxMessages,
  commandPalette: commandPaletteMessages,
  copyableSecret: copyableSecretMessages,
  countryPicker: countryPickerMessages,
  dataState: dataStateMessages,
  dataTable: dataTableMessages,
  datePicker: datePickerMessages,
  diffViewer: diffViewerMessages,
  disclosure: disclosureMessages,
  editable: editableMessages,
  fileCard: fileCardMessages,
  fileUpload: fileUploadMessages,
  filterBar: filterBarMessages,
  floatingWindow: floatingWindowMessages,
  form: formMessages,
  jsonTree: jsonTreeMessages,
  label: labelMessages,
  link: linkMessages,
  mentionInput: mentionInputMessages,
  notification: notificationMessages,
  numberField: numberFieldMessages,
  otpInput: otpInputMessages,
  overflowList: overflowListMessages,
  overlay: overlayMessages,
  pagination: paginationMessages,
  passwordInput: passwordInputMessages,
  passwordStrengthMeter: passwordStrengthMeterMessages,
  presenceIndicator: presenceIndicatorMessages,
  qrCode: qrCodeMessages,
  rating: ratingMessages,
  reactionBar: reactionBarMessages,
  richTextEditor: richTextEditorMessages,
  scheduleCalendar: scheduleCalendarMessages,
  sidebar: sidebarMessages,
  skipNav: skipNavMessages,
  spinner: spinnerMessages,
  spoiler: spoilerMessages,
  stepper: stepperMessages,
  tableOfContents: tableOfContentsMessages,
  tagInput: tagInputMessages,
  timePicker: timePickerMessages,
  timeRangePicker: timeRangePickerMessages,
  timer: timerMessages,
  timezonePicker: timezonePickerMessages,
  toast: toastMessages,
  toggleTip: toggleTipMessages,
  tour: tourMessages,
};

export type {
  // Per-group types, for a consumer building a translation one component at a time.
  ActionBarMessages,
  AngleSliderMessages,
  AutocompleteMessages,
  AvailabilityGridMessages,
  BannerMessages,
  BreadcrumbMessages,
  CalendarMessages,
  CarouselMessages,
  ChipMessages,
  ClipboardMessages,
  CodeBlockMessages,
  ColorPickerMessages,
  ComboboxMessages,
  CommandPaletteMessages,
  CopyableSecretMessages,
  CountryPickerMessages,
  DataStateMessages,
  DataTableMessages,
  DatePickerMessages,
  DiffViewerMessages,
  DisclosureMessages,
  EditableMessages,
  FileCardMessages,
  FileUploadMessages,
  FilterBarMessages,
  FloatingWindowMessages,
  FormMessages,
  JsonTreeMessages,
  LabelMessages,
  LinkMessages,
  MentionInputMessages,
  MessageCatalogue,
  MessageOverrides,
  MessagesFor,
  NotificationMessages,
  NumberFieldMessages,
  OtpInputMessages,
  OverflowListMessages,
  OverlayMessages,
  PaginationMessages,
  PasswordInputMessages,
  PasswordStrengthMeterMessages,
  PresenceIndicatorMessages,
  QeetrixMessages,
  QrCodeMessages,
  RatingMessages,
  ReactionBarMessages,
  RichTextEditorMessages,
  ScheduleCalendarMessages,
  SidebarMessages,
  SkipNavMessages,
  SpinnerMessages,
  SpoilerMessages,
  StepperMessages,
  TableOfContentsMessages,
  TagInputMessages,
  TimePickerMessages,
  TimeRangePickerMessages,
  TimerMessages,
  TimezonePickerMessages,
  ToastMessages,
  ToggleTipMessages,
  TourMessages,
};
export {
  actionBarMessages,
  angleSliderMessages,
  autocompleteMessages,
  availabilityGridMessages,
  bannerMessages,
  breadcrumbMessages,
  calendarMessages,
  carouselMessages,
  chipMessages,
  clipboardMessages,
  codeBlockMessages,
  colorPickerMessages,
  comboboxMessages,
  commandPaletteMessages,
  copyableSecretMessages,
  countryPickerMessages,
  dataStateMessages,
  dataTableMessages,
  datePickerMessages,
  diffViewerMessages,
  disclosureMessages,
  editableMessages,
  fileCardMessages,
  fileUploadMessages,
  filterBarMessages,
  floatingWindowMessages,
  formMessages,
  jsonTreeMessages,
  labelMessages,
  linkMessages,
  mentionInputMessages,
  mergeMessageCatalogues,
  notificationMessages,
  numberFieldMessages,
  otpInputMessages,
  overflowListMessages,
  overlayMessages,
  paginationMessages,
  passwordInputMessages,
  passwordStrengthMeterMessages,
  presenceIndicatorMessages,
  QEETRIX_MESSAGES,
  qrCodeMessages,
  ratingMessages,
  reactionBarMessages,
  resolveMessages,
  richTextEditorMessages,
  scheduleCalendarMessages,
  sidebarMessages,
  skipNavMessages,
  spinnerMessages,
  spoilerMessages,
  stepperMessages,
  tableOfContentsMessages,
  tagInputMessages,
  timePickerMessages,
  timeRangePickerMessages,
  timerMessages,
  timezonePickerMessages,
  toastMessages,
  toggleTipMessages,
  tourMessages,
};
