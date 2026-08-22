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

/** `AuditEvent` — the expandable sections of one audit record. */
const auditEventMessages = {
  /** Summary text of the collapsed details disclosure. */
  details: "Event details",
  /** Accessible name of the metadata section. */
  metadata: "Metadata",
  /** Accessible name of the field-diff section. */
  changes: "Changes",
  /** Accessible name of the raw-payload section. */
  raw: "Raw event",
};
type AuditEventMessages = typeof auditEventMessages;

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

/** `CommentThread` — the reply composer. */
const commentThreadMessages = {
  /** Accessible name of the composer textarea. */
  label: "Comment",
  /** Placeholder while composing a top-level comment. */
  placeholder: "Add a comment…",
  /** Placeholder while composing a reply. */
  replyPlaceholder: "Write a reply…",
  /** The composer's submit button, for a top-level comment and for a reply alike. */
  submit: "Comment",
  /** The control that opens a reply composer under an existing comment. */
  reply: "Reply",
};
type CommentThreadMessages = typeof commentThreadMessages;

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
};
type ReactionBarMessages = typeof reactionBarMessages;

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

/** `NotificationCenter` — the bell, the inbox and its tabs. */
const notificationCenterMessages = {
  /**
   * Accessible name of the bell trigger. `unreadCount` is `0` when everything has been read,
   * which is the case the default renders without a count.
   */
  trigger: (unreadCount: number) => `Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`,
  /** Visible heading of the inbox popover. */
  heading: "Notifications",
  /** Accessible name of the notification feed. */
  feed: "Notifications",
  /** The mark-everything-read action. */
  markAllRead: "Mark all read",
  /** Label of the "everything" tab. */
  allTab: "All",
  /** Label of the unread tab. `count` is `0` when there is nothing unread. */
  unreadTab: (count: number) => `Unread${count > 0 ? ` (${count})` : ""}`,
  /** Accessible name of the dot marking an item as unread. */
  unread: "Unread",
  /** Accessible name of the per-item dismiss button. */
  dismiss: "Dismiss",
  /** Shown when the list is empty. */
  empty: "You're all caught up.",
};
type NotificationCenterMessages = typeof notificationCenterMessages;

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
};
type ToastMessages = typeof toastMessages;

/** `Tour` — the guided-walkthrough popover. */
const tourMessages = {
  /** Accessible name of the button that ends the tour early. */
  dismiss: "Dismiss tour",
  /** The step-back action. */
  back: "Back",
};
type TourMessages = typeof tourMessages;

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
};
type FileUploadMessages = typeof fileUploadMessages;

/** `FormErrorSummary` — the heading above a list of submission errors. */
const formMessages = {
  /** Heading of the error summary. */
  errorSummaryTitle: "There is a problem",
};
type FormMessages = typeof formMessages;

/** `LogoUploader` — the drop target, the preview, the URL fallback and its errors. */
const logoUploaderMessages = {
  /** Accessible name of the file input. */
  file: "Upload a logo file",
  /** Accessible name of the URL input. */
  url: "Logo URL",
  /** Placeholder of the URL input. */
  urlPlaceholder: "…or paste a logo URL",
  /** Instruction on the empty drop target. */
  dropZone: "Drop a logo here",
  /** Format and size hint under the instruction. */
  formatHint: (maxSizeMB: number) => `PNG, JPG, SVG, or WEBP up to ${maxSizeMB} MB`,
  /** `alt` text of the preview image. */
  previewAlt: "Logo preview",
  /** Heading of the filled state. */
  logoSet: "Logo set",
  /** Stands in for the source when the value is an inline data URL. */
  uploadedFile: "Uploaded file (preview)",
  /** The control that picks a different file. */
  replace: "Replace",
  /** The control that clears the current logo. */
  remove: "Remove",
  /** Error shown when the chosen file's type is not accepted. */
  rejectedType: "That file type isn't allowed here.",
  /** Error shown when the chosen file is too large. */
  rejectedSize: (maxSizeMB: number) => `File is larger than ${maxSizeMB} MB.`,
  /** Error shown when the file could not be read at all. */
  readError: "Couldn't read that file.",
  /** Error shown when the preview image failed to load. */
  renderError: "Couldn't render that source as an image.",
  /** Error shown when a pasted URL is not a source this component will render. */
  unusableSource: "That source can't be used as an image.",
};
type LogoUploaderMessages = typeof logoUploaderMessages;

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
};
type RichTextEditorMessages = typeof richTextEditorMessages;

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
};
type ComboboxMessages = typeof comboboxMessages;

/** `NotificationPreferenceMatrix` — the channel/category grid. */
const notificationPreferenceMatrixMessages = {
  /** Caption of the preference table. */
  caption: "Notification preferences by channel",
  /** Header of the leading category column. */
  categoryHeader: "Notification",
  /** Accessible name of one checkbox, naming the category and the channel it belongs to. */
  cell: (category: string, channel: string) => `${category} via ${channel}`,
};
type NotificationPreferenceMatrixMessages = typeof notificationPreferenceMatrixMessages;

/* ── surfaces ─────────────────────────────────────────────────────────────────────────────── */

/** `Dialog`, `Sheet`, `FloatingWindow` — the close affordance every overlay has. */
const overlayMessages = {
  /** Accessible name of the close button. */
  close: "Close",
};
type OverlayMessages = typeof overlayMessages;

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
  auditEvent: AuditEventMessages;
  autocomplete: AutocompleteMessages;
  availabilityGrid: AvailabilityGridMessages;
  banner: BannerMessages;
  breadcrumb: BreadcrumbMessages;
  carousel: CarouselMessages;
  chip: ChipMessages;
  clipboard: ClipboardMessages;
  codeBlock: CodeBlockMessages;
  combobox: ComboboxMessages;
  commandPalette: CommandPaletteMessages;
  commentThread: CommentThreadMessages;
  copyableSecret: CopyableSecretMessages;
  dataTable: DataTableMessages;
  diffViewer: DiffViewerMessages;
  disclosure: DisclosureMessages;
  editable: EditableMessages;
  fileUpload: FileUploadMessages;
  filterBar: FilterBarMessages;
  form: FormMessages;
  logoUploader: LogoUploaderMessages;
  mentionInput: MentionInputMessages;
  notification: NotificationMessages;
  notificationCenter: NotificationCenterMessages;
  notificationPreferenceMatrix: NotificationPreferenceMatrixMessages;
  numberField: NumberFieldMessages;
  otpInput: OtpInputMessages;
  overflowList: OverflowListMessages;
  overlay: OverlayMessages;
  pagination: PaginationMessages;
  passwordInput: PasswordInputMessages;
  presenceIndicator: PresenceIndicatorMessages;
  reactionBar: ReactionBarMessages;
  richTextEditor: RichTextEditorMessages;
  sidebar: SidebarMessages;
  spinner: SpinnerMessages;
  tableOfContents: TableOfContentsMessages;
  timer: TimerMessages;
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
  auditEvent: auditEventMessages,
  autocomplete: autocompleteMessages,
  availabilityGrid: availabilityGridMessages,
  banner: bannerMessages,
  breadcrumb: breadcrumbMessages,
  carousel: carouselMessages,
  chip: chipMessages,
  clipboard: clipboardMessages,
  codeBlock: codeBlockMessages,
  combobox: comboboxMessages,
  commandPalette: commandPaletteMessages,
  commentThread: commentThreadMessages,
  copyableSecret: copyableSecretMessages,
  dataTable: dataTableMessages,
  diffViewer: diffViewerMessages,
  disclosure: disclosureMessages,
  editable: editableMessages,
  fileUpload: fileUploadMessages,
  filterBar: filterBarMessages,
  form: formMessages,
  logoUploader: logoUploaderMessages,
  mentionInput: mentionInputMessages,
  notification: notificationMessages,
  notificationCenter: notificationCenterMessages,
  notificationPreferenceMatrix: notificationPreferenceMatrixMessages,
  numberField: numberFieldMessages,
  otpInput: otpInputMessages,
  overflowList: overflowListMessages,
  overlay: overlayMessages,
  pagination: paginationMessages,
  passwordInput: passwordInputMessages,
  presenceIndicator: presenceIndicatorMessages,
  reactionBar: reactionBarMessages,
  richTextEditor: richTextEditorMessages,
  sidebar: sidebarMessages,
  spinner: spinnerMessages,
  tableOfContents: tableOfContentsMessages,
  timer: timerMessages,
  toast: toastMessages,
  toggleTip: toggleTipMessages,
  tour: tourMessages,
};

export type {
  // Per-group types, for a consumer building a translation one component at a time.
  ActionBarMessages,
  AuditEventMessages,
  AutocompleteMessages,
  AvailabilityGridMessages,
  BannerMessages,
  BreadcrumbMessages,
  CarouselMessages,
  ChipMessages,
  ClipboardMessages,
  CodeBlockMessages,
  ComboboxMessages,
  CommandPaletteMessages,
  CommentThreadMessages,
  CopyableSecretMessages,
  DataTableMessages,
  DiffViewerMessages,
  DisclosureMessages,
  EditableMessages,
  FileUploadMessages,
  FilterBarMessages,
  FormMessages,
  LogoUploaderMessages,
  MentionInputMessages,
  MessageCatalogue,
  MessageOverrides,
  MessagesFor,
  NotificationCenterMessages,
  NotificationMessages,
  NotificationPreferenceMatrixMessages,
  NumberFieldMessages,
  OtpInputMessages,
  OverflowListMessages,
  OverlayMessages,
  PaginationMessages,
  PasswordInputMessages,
  PresenceIndicatorMessages,
  QeetrixMessages,
  ReactionBarMessages,
  RichTextEditorMessages,
  SidebarMessages,
  SpinnerMessages,
  TableOfContentsMessages,
  TimerMessages,
  ToastMessages,
  ToggleTipMessages,
  TourMessages,
};
export {
  actionBarMessages,
  auditEventMessages,
  autocompleteMessages,
  availabilityGridMessages,
  bannerMessages,
  breadcrumbMessages,
  carouselMessages,
  chipMessages,
  clipboardMessages,
  codeBlockMessages,
  comboboxMessages,
  commandPaletteMessages,
  commentThreadMessages,
  copyableSecretMessages,
  dataTableMessages,
  diffViewerMessages,
  disclosureMessages,
  editableMessages,
  fileUploadMessages,
  filterBarMessages,
  formMessages,
  logoUploaderMessages,
  mentionInputMessages,
  mergeMessageCatalogues,
  notificationCenterMessages,
  notificationMessages,
  notificationPreferenceMatrixMessages,
  numberFieldMessages,
  otpInputMessages,
  overflowListMessages,
  overlayMessages,
  paginationMessages,
  passwordInputMessages,
  presenceIndicatorMessages,
  QEETRIX_MESSAGES,
  reactionBarMessages,
  resolveMessages,
  richTextEditorMessages,
  sidebarMessages,
  spinnerMessages,
  tableOfContentsMessages,
  timerMessages,
  toastMessages,
  toggleTipMessages,
  tourMessages,
};
