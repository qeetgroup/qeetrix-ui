"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon } from "@qeetrix/icons/icons/check";
import { ChevronDownIcon } from "@qeetrix/icons/icons/chevron-down";
import { LoaderCircleIcon } from "@qeetrix/icons/icons/loader-circle";
import { XIcon } from "@qeetrix/icons/icons/x";
import * as React from "react";

import { useFieldControl } from "@/components/Input/field";
import {
  fieldAction,
  fieldGroupInput,
  fieldGroupSurface,
  fieldSurface,
  fieldText,
} from "@/internal/field-styles";
import type { MessagesFor } from "@/lib/messages";
import { comboboxMessages, spinnerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

interface ComboboxOption {
  label: string;
  value: string;
  disabled?: boolean;
  /** Secondary text under the label — a region, a role, a time-zone name. Matched by search. */
  description?: string;
  /** Short text at the inline end — a code, an offset, a count. Matched by search. */
  detail?: string;
  /** Extra search terms that are never displayed — aliases, codes, names in another language. */
  keywords?: readonly string[];
}

/**
 * The field: Input's own recipe (`fieldSurface` from `field-styles`) — fill, ≥3:1 boundary,
 * hover, focus, invalid, warning/success from the enclosing `Field`, dashed read-only, disabled —
 * so a combobox lines up with a text field and a select. While the popup is open the boundary
 * holds its hover edge, as `fieldTrigger` does. 16px text below `md` stops iOS zooming on focus;
 * a long selected label truncates.
 */
const INPUT_CLASS = cn(
  fieldSurface,
  fieldText,
  "h-(--qx-component-input-height) truncate py-1 ps-2.5",
  "data-popup-open:[--field-edge:var(--qx-component-input-border-hover)]",
  "read-only:cursor-default",
);

/**
 * The inline-end lane: the field's icon actions are sized from the field height (`fieldAction`:
 * never under 24px, larger at comfortable density), so the text's end padding is reserved from
 * the same measure rather than a fixed `pe-14`.
 */
const ACTION_LANE = "[--combobox-action:max(1.5rem,calc(var(--qx-component-input-height)-0.5rem))]";
const laneEnd = (actions: number) =>
  actions === 3
    ? "pe-[calc(var(--combobox-action)*3+0.375rem)]"
    : actions === 2
      ? "pe-[calc(var(--combobox-action)*2+0.375rem)]"
      : "pe-[calc(var(--combobox-action)+0.375rem)]";

/** An icon button inside the field's inline-end lane (clear, open): Input's `fieldAction`. */
const FIELD_BUTTON_CLASS = cn(fieldAction, "group/field-button");

/** The busy indicator in the lane, the same size as an action. */
const SPINNER_SLOT_CLASS = "flex size-(--combobox-action) shrink-0 items-center justify-center";

/** The popup: the overlay surface and elevation, capped so a long list never fills the screen. */
const POPUP_CLASS = cn(
  "z-(--qx-z-popover) max-h-[min(var(--available-height),22rem)] w-(--anchor-width) min-w-48 max-w-(--available-width) origin-(--transform-origin) overflow-y-auto overscroll-contain",
  // The anchored-overlay recipe menus and popovers share: a real border (forced colours strip
  // shadows, and an edgeless popup is Canvas on Canvas), the overlay surface and elevation, and
  // the same short enter/exit.
  "rounded-(--qx-corner-overlay) border border-border bg-popover bg-clip-padding p-1 text-popover-foreground shadow-popover",
  "duration-fast ease-enter data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit",
);

/**
 * One option — the Qeet selected vocabulary shared with `Select` and `Listbox`. DOM focus stays
 * in the input (`aria-activedescendant`), so pointer hover and keyboard highlight are kept apart
 * (`highlightItemOnHover={false}` on the root): hover is the neutral fill, the keyboard
 * highlight adds an inset ring, and the selected option takes the `brand-subtle` tint plus a
 * `text-brand` check. Rows follow density, grow to 44px on coarse pointers, and wrap long labels.
 *
 * `data-[selected]:` is deliberate: shadcn's `data-selected` variant matches only
 * `[data-selected="true"]`, and Base UI writes a bare `data-selected=""`.
 */
const ITEM_CLASS = cn(
  "relative flex min-h-[calc(var(--qx-control-height)-0.25rem)] w-full cursor-default items-center gap-2 rounded-md py-1 ps-2 pe-8 text-sm text-foreground outline-none select-none pointer-coarse:min-h-11",
  "hover:bg-accent data-highlighted:bg-accent data-highlighted:focus-ring-inset",
  "data-[selected]:bg-brand-subtle data-[selected]:hover:bg-brand-subtle-hover data-[selected]:data-highlighted:bg-brand-subtle-hover",
  "data-disabled:pointer-events-none data-disabled:opacity-disabled",
  "data-highlighted:forced-colors-selected",
);

/** A status line inside the popup (loading, "keep typing"). Padding lives inside the live region. */
const POPUP_NOTE_CLASS =
  "flex items-center justify-center gap-2 px-2 py-3 text-sm text-muted-foreground";

/** The option row's content: label, optional description, optional inline-end detail. */
const ComboboxOptionItem = React.memo(function ComboboxOptionItem({
  item,
  index,
}: {
  item: ComboboxOption;
  index: number;
}) {
  return (
    <ComboboxPrimitive.Item
      value={item}
      index={index}
      disabled={item.disabled}
      data-slot="combobox-item"
      className={ITEM_CLASS}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="wrap-break-word">{item.label}</span>
        {item.description ? (
          <span className="text-xs text-muted-foreground wrap-break-word">{item.description}</span>
        ) : null}
      </span>
      {item.detail ? (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{item.detail}</span>
      ) : null}
      <ComboboxPrimitive.ItemIndicator className="absolute inset-e-2 flex size-4 items-center justify-center text-brand forced-colors:text-inherit">
        <CheckIcon aria-hidden strokeWidth={2.5} className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
});

/** Shown when `limit` has cut the matches, so a long list never looks complete when it is not. */
function ComboboxLimitNote({ limit, message }: { limit: number; message: string }) {
  const filtered = ComboboxPrimitive.useFilteredItems<ComboboxOption>();
  if (filtered.length < limit) return null;
  return <div className={POPUP_NOTE_CLASS}>{message}</div>;
}

interface ComboboxListPopupProps {
  emptyMessage: string;
  className?: string;
  loading?: boolean;
  loadingMessage: string;
  limit?: number;
  limitMessage: string;
  /**
   * What the popup is positioned against. Base UI anchors to an InputGroup or the input; a
   * MultiSelect's field is the chips box around its input, so it passes that.
   */
  anchor?: React.RefObject<HTMLElement | null>;
}

/** Portal + positioned popup + filtered item list — shared by Combobox and MultiSelect. */
function ComboboxListPopup({
  emptyMessage,
  className,
  loading,
  loadingMessage,
  limit,
  limitMessage,
  anchor,
}: ComboboxListPopupProps) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner anchor={anchor} sideOffset={4} className="z-(--qx-z-popover)">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          aria-busy={loading || undefined}
          className={cn(POPUP_CLASS, className)}
        >
          {/* Always mounted, so a change is announced; the padding lives on the child. */}
          <ComboboxPrimitive.Status data-slot="combobox-status">
            {loading ? (
              <div className={POPUP_NOTE_CLASS}>
                <LoaderCircleIcon aria-hidden className="size-4 animate-spin" />
                {loadingMessage}
              </div>
            ) : null}
          </ComboboxPrimitive.Status>
          <ComboboxPrimitive.Empty data-slot="combobox-empty">
            {loading ? null : <div className={cn(POPUP_NOTE_CLASS, "py-6")}>{emptyMessage}</div>}
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List data-slot="combobox-list">
            {(item: ComboboxOption, index: number) => (
              <ComboboxOptionItem key={item.value} item={item} index={index} />
            )}
          </ComboboxPrimitive.List>
          {limit !== undefined && !loading ? (
            <ComboboxLimitNote limit={limit} message={limitMessage} />
          ) : null}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

/**
 * Search across label, description, detail and keywords, with Base UI's collator: case-, accent-
 * and punctuation-insensitive in the given locale, so "cote" finds "Côte d'Ivoire".
 */
function useOptionFilter(
  filter: ((option: ComboboxOption, query: string) => boolean) | null | undefined,
  locale: string | undefined,
) {
  const collator = ComboboxPrimitive.useFilter({ locale });
  return React.useMemo(() => {
    if (filter === null) return null;
    if (filter) return (item: ComboboxOption, query: string) => filter(item, query);
    return (item: ComboboxOption, query: string) => {
      if (collator.contains(item.label, query)) return true;
      if (item.description && collator.contains(item.description, query)) return true;
      if (item.detail && collator.contains(item.detail, query)) return true;
      return item.keywords?.some((k) => collator.contains(k, query)) ?? false;
    };
  }, [filter, collator]);
}

/** Behaviour and naming shared by `Combobox` and `MultiSelect`. */
interface ComboboxSharedProps {
  items: ComboboxOption[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  /** Keeps the field focusable and its value readable while ignoring changes. */
  readOnly?: boolean;
  /**
   * Marks the field required. Advisory, as for every composite (see `field.tsx`): the submitted
   * value travels in a hidden input, which the browser does not validate. Pair with `FieldError`.
   */
  required?: boolean;
  id?: string;
  name?: string;
  /** Associate the submitted value with a form it is not nested inside, by form `id`. */
  form?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  /**
   * The options are being fetched. Shows a spinner in the field, announces `loadingMessage`
   * politely, marks the popup `aria-busy`, and holds back the empty message.
   */
  loading?: boolean;
  /** Shown and announced while `loading`. Defaults to the Spinner label in the message catalogue. */
  loadingMessage?: string;
  /** The typed query, controlled. Pair with `filter={null}` and `loading` for server-side search. */
  inputValue?: string;
  /** Fires as the query changes — the hook for fetching remote results. */
  onInputValueChange?: (query: string) => void;
  /**
   * How an option matches the query. Defaults to a collator search over label, description,
   * detail and keywords. `null` turns client filtering off: `items` are already the results.
   */
  filter?: ((option: ComboboxOption, query: string) => boolean) | null;
  /**
   * Render at most this many matches. For long lists: typing narrows them, and a note in the
   * popup says so when the cap is reached, so a truncated list never looks complete.
   */
  limit?: number;
  /** The note shown when `limit` cuts the list. */
  limitMessage?: string;
  /** Locale for matching. Defaults to the runtime locale. */
  locale?: string;
  /** Highlight the first match while typing, so Enter picks it without an arrow key. */
  autoHighlight?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"combobox">;
  /** Class applied to the dropdown popup. */
  contentClassName?: string;
}

interface ComboboxProps extends ComboboxSharedProps {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Class applied to the text input. */
  className?: string;
}

/**
 * Single-select with type-to-filter: APG Combobox, list autocomplete. Type to narrow, arrows to
 * move, Enter to choose, Escape to close and restore the selection's label.
 *
 * Built for long, enterprise lists: search covers labels, descriptions, details and hidden
 * keywords; `limit` caps what renders; `loading`, `inputValue`/`onInputValueChange` and
 * `filter={null}` cover server-side search; options are memoised so typing stays fast.
 *
 * Implements the composite-field contract (see `field.tsx`): inside a `Field` the input takes
 * the label, description, error and invalid state, and `name` submits the option's `value`.
 */
function Combobox({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  emptyMessage,
  disabled,
  readOnly,
  required,
  id,
  name,
  form,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  loading,
  loadingMessage,
  inputValue,
  onInputValueChange,
  filter,
  limit,
  limitMessage,
  locale,
  autoHighlight,
  messages: messageOverrides,
  className,
  contentClassName,
}: ComboboxProps) {
  const messages = useMessages("combobox", comboboxMessages, messageOverrides);
  const spinner = useMessages("spinner", spinnerMessages);
  const optionFilter = useOptionFilter(filter, locale);
  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    "aria-invalid": ariaInvalid,
  });
  const selected = value === undefined ? undefined : (items.find((i) => i.value === value) ?? null);
  const selectedDefault =
    defaultValue == null ? undefined : items.find((i) => i.value === defaultValue);

  return (
    <ComboboxPrimitive.Root<ComboboxOption, false>
      items={items}
      value={selected}
      defaultValue={selectedDefault}
      onValueChange={(item) => onValueChange?.(item ? item.value : null)}
      inputValue={inputValue}
      onInputValueChange={onInputValueChange ? (query) => onInputValueChange(query) : undefined}
      filter={optionFilter}
      limit={limit}
      locale={locale}
      autoHighlight={autoHighlight}
      highlightItemOnHover={false}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      name={name}
      form={form}
    >
      <div
        data-slot="combobox"
        data-loading={loading || undefined}
        className={cn("relative w-full min-w-0", ACTION_LANE)}
      >
        <ComboboxPrimitive.Input
          id={field.id}
          placeholder={placeholder ?? messages.placeholder}
          aria-label={field["aria-labelledby"] ? undefined : ariaLabel}
          aria-labelledby={field["aria-labelledby"]}
          aria-describedby={field["aria-describedby"]}
          aria-errormessage={field["aria-errormessage"]}
          aria-invalid={field["aria-invalid"]}
          aria-required={required || undefined}
          className={cn(INPUT_CLASS, laneEnd(loading ? 3 : 2), className)}
        />
        <div className="absolute inset-e-1 top-1/2 flex -translate-y-1/2 items-center">
          {loading ? (
            <span data-slot="combobox-spinner" className={SPINNER_SLOT_CLASS}>
              <LoaderCircleIcon aria-hidden className="size-4 animate-spin text-muted-foreground" />
            </span>
          ) : null}
          <ComboboxPrimitive.Clear
            aria-label={messages.clearSelection}
            className={FIELD_BUTTON_CLASS}
          >
            <XIcon aria-hidden className="size-4" />
          </ComboboxPrimitive.Clear>
          <ComboboxPrimitive.Trigger aria-label={messages.open} className={FIELD_BUTTON_CLASS}>
            <ChevronDownIcon
              aria-hidden
              className="size-4 transition-transform duration-fast ease-standard group-data-popup-open/field-button:rotate-180"
            />
          </ComboboxPrimitive.Trigger>
        </div>
      </div>
      <ComboboxListPopup
        emptyMessage={emptyMessage ?? messages.empty}
        className={contentClassName}
        loading={loading}
        loadingMessage={loadingMessage ?? spinner.label}
        limit={limit}
        limitMessage={limitMessage ?? messages.limit}
      />
    </ComboboxPrimitive.Root>
  );
}

interface MultiSelectProps extends ComboboxSharedProps {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Class applied to the chips container. */
  className?: string;
}

/**
 * Multi-select / tag input: selected values render as removable chips inside the field, and stay
 * checked (tint + check) in the list. Backspace in an empty query removes the last chip; the
 * arrow keys move between chips. Same search, limits and loading as `Combobox`.
 */
function MultiSelect({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  emptyMessage,
  disabled,
  readOnly,
  required,
  id,
  name,
  form,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  loading,
  loadingMessage,
  inputValue,
  onInputValueChange,
  filter,
  limit,
  limitMessage,
  locale,
  autoHighlight,
  messages: messageOverrides,
  className,
  contentClassName,
}: MultiSelectProps) {
  const messages = useMessages("combobox", comboboxMessages, messageOverrides);
  const chipsRef = React.useRef<HTMLDivElement>(null);
  const spinner = useMessages("spinner", spinnerMessages);
  const optionFilter = useOptionFilter(filter, locale);
  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    "aria-invalid": ariaInvalid,
  });
  const selected = value === undefined ? undefined : items.filter((i) => value.includes(i.value));
  const selectedDefault =
    defaultValue === undefined ? undefined : items.filter((i) => defaultValue.includes(i.value));

  return (
    <ComboboxPrimitive.Root<ComboboxOption, true>
      multiple
      items={items}
      value={selected}
      defaultValue={selectedDefault}
      onValueChange={(next) => onValueChange?.((next ?? []).map((i) => i.value))}
      inputValue={inputValue}
      onInputValueChange={onInputValueChange ? (query) => onInputValueChange(query) : undefined}
      filter={optionFilter}
      limit={limit}
      locale={locale}
      autoHighlight={autoHighlight}
      highlightItemOnHover={false}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      name={name}
      form={form}
    >
      <div
        data-slot="multi-select"
        data-loading={loading || undefined}
        className={cn("relative w-full min-w-0", ACTION_LANE)}
      >
        <ComboboxPrimitive.Chips
          ref={chipsRef}
          data-slot="multi-select-field"
          // The chips container owns the field chrome on the inner input's behalf, reading its
          // state through :has() — so a chip's remove button never rings or fades the field.
          className={cn(
            fieldGroupSurface,
            fieldText,
            "flex min-h-(--qx-component-input-height) flex-wrap items-center gap-1 p-1 ps-1.5",
            laneEnd(loading ? 2 : 1),
            "has-[input[data-popup-open]]:[--field-edge:var(--qx-component-input-border-hover)]",
            className,
          )}
        >
          <ComboboxPrimitive.Value>
            {(selectedItems: ComboboxOption[]) =>
              selectedItems.map((item) => (
                <ComboboxPrimitive.Chip
                  key={item.value}
                  data-slot="multi-select-chip"
                  // Base UI writes aria-readonly on the chip while the field is read-only, which
                  // ARIA does not allow on a generic element (axe: aria-allowed-attr). The field's
                  // input carries the read-only state.
                  render={({ "aria-readonly": _readOnly, ...chipProps }) => <div {...chipProps} />}
                  className="inline-flex h-[calc(var(--qx-component-input-height)-0.625rem)] max-w-full min-w-0 items-center gap-1 rounded-md border border-border bg-secondary ps-1.5 pe-1 text-xs font-medium text-secondary-foreground outline-none data-highlighted:focus-ring-inset"
                >
                  <span className="truncate">{item.label}</span>
                  <ComboboxPrimitive.ChipRemove
                    aria-label={messages.removeItem(item.label)}
                    className="flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors duration-fast hover:bg-accent hover:text-foreground focus-visible:focus-ring"
                  >
                    <XIcon aria-hidden className="size-3" />
                  </ComboboxPrimitive.ChipRemove>
                </ComboboxPrimitive.Chip>
              ))
            }
          </ComboboxPrimitive.Value>
          <ComboboxPrimitive.Input
            id={field.id}
            placeholder={placeholder ?? messages.placeholder}
            aria-label={field["aria-labelledby"] ? undefined : ariaLabel}
            aria-labelledby={field["aria-labelledby"]}
            aria-describedby={field["aria-describedby"]}
            aria-errormessage={field["aria-errormessage"]}
            aria-invalid={field["aria-invalid"]}
            aria-required={required || undefined}
            // One row of chips is exactly the field height at every density: the field's height
            // less its 4px padding and 1px borders.
            className={cn(
              fieldGroupInput,
              "h-[calc(var(--qx-component-input-height)-0.625rem)] min-w-16 px-1",
            )}
          />
        </ComboboxPrimitive.Chips>
        <div className="absolute inset-e-1 top-[calc((var(--qx-component-input-height)-var(--combobox-action))/2)] flex items-center">
          {loading ? (
            <span data-slot="combobox-spinner" className={SPINNER_SLOT_CLASS}>
              <LoaderCircleIcon aria-hidden className="size-4 animate-spin text-muted-foreground" />
            </span>
          ) : null}
          <ComboboxPrimitive.Trigger aria-label={messages.open} className={FIELD_BUTTON_CLASS}>
            <ChevronDownIcon
              aria-hidden
              className="size-4 transition-transform duration-fast ease-standard group-data-popup-open/field-button:rotate-180"
            />
          </ComboboxPrimitive.Trigger>
        </div>
      </div>
      <ComboboxListPopup
        emptyMessage={emptyMessage ?? messages.empty}
        className={contentClassName}
        loading={loading}
        loadingMessage={loadingMessage ?? spinner.label}
        limit={limit}
        limitMessage={limitMessage ?? messages.limit}
        anchor={chipsRef}
      />
    </ComboboxPrimitive.Root>
  );
}

export type { ComboboxOption, ComboboxProps, MultiSelectProps };
export { Combobox, MultiSelect };
