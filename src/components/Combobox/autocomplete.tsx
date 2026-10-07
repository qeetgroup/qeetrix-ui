"use client";

import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { LoaderCircleIcon } from "@qeetrix/icons/icons/loader-circle";
import { XIcon } from "@qeetrix/icons/icons/x";
import type * as React from "react";

import { useFieldControl } from "@/components/Input/field";
import { fieldAction, fieldSurface, fieldText } from "@/internal/field-styles";
import type { MessagesFor } from "@/lib/messages";
import { autocompleteMessages, spinnerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/** The popup — identical to `Combobox`'s: overlay surface and elevation, height-capped. */
const POPUP_CLASS = cn(
  "z-(--qx-z-popover) max-h-[min(var(--available-height),22rem)] w-(--anchor-width) min-w-48 max-w-(--available-width) origin-(--transform-origin) overflow-y-auto overscroll-contain",
  // The anchored-overlay recipe menus and popovers share: a real border (forced colours strip
  // shadows, and an edgeless popup is Canvas on Canvas), the overlay surface and elevation, and
  // the same short enter/exit.
  "rounded-(--qx-corner-overlay) border border-border bg-popover bg-clip-padding p-1 text-popover-foreground shadow-popover",
  "duration-fast ease-enter data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit",
);

/**
 * A suggestion. There is no selected state — the typed text is the value — so a suggestion has
 * only the pointer fill and the keyboard highlight (fill + inset ring), as in `Combobox`.
 */
const ITEM_CLASS = cn(
  "relative flex min-h-[calc(var(--qx-control-height)-0.25rem)] w-full cursor-default items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground outline-none select-none pointer-coarse:min-h-11",
  "hover:bg-accent data-highlighted:bg-accent data-highlighted:focus-ring-inset",
  "data-highlighted:forced-colors-selected",
);

/** The field: Input's own recipe (`fieldSurface`), as in `Combobox`. */
const INPUT_CLASS = cn(
  fieldSurface,
  fieldText,
  "h-(--qx-component-input-height) truncate py-1 ps-2.5",
  "data-popup-open:[--field-edge:var(--qx-component-input-border-hover)]",
  "read-only:cursor-default",
);

/** The inline-end lane, sized from the field height like `fieldAction` itself. */
const ACTION_LANE =
  "[--autocomplete-action:max(1.5rem,calc(var(--qx-component-input-height)-0.5rem))]";

const POPUP_NOTE_CLASS =
  "flex items-center justify-center gap-2 px-2 py-3 text-sm text-muted-foreground";

interface AutocompleteProps {
  /** Advisory suggestion strings shown beneath the input. */
  items: readonly string[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  /** Keeps the field focusable and its value readable while ignoring changes. */
  readOnly?: boolean;
  /** Marks the text input `required` — browser-enforced, because the input is the form control. */
  required?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  /**
   * Suggestions are being fetched. Shows a spinner in the field, announces `loadingMessage`
   * politely and holds back the empty message.
   */
  loading?: boolean;
  /** Shown and announced while `loading`. Defaults to the Spinner label in the message catalogue. */
  loadingMessage?: string;
  /** Render at most this many suggestions. */
  limit?: number;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"autocomplete">;
  /** Class applied to the text input. */
  className?: string;
  /** Class applied to the dropdown popup. */
  contentClassName?: string;
}

/**
 * Free-text input with advisory suggestions — APG Combobox, the "no required
 * selection" variant. Unlike `Combobox`, the typed value is always the submitted
 * value; suggestions never force a selection.
 *
 * Inside a `Field` the input takes the label, description, error and invalid state.
 */
function Autocomplete({
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
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
  loading,
  loadingMessage,
  limit,
  messages: messageOverrides,
  className,
  contentClassName,
}: AutocompleteProps) {
  const messages = useMessages("autocomplete", autocompleteMessages, messageOverrides);
  const spinner = useMessages("spinner", spinnerMessages);
  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    "aria-invalid": ariaInvalid,
  });
  return (
    <AutocompletePrimitive.Root
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(next ?? "")}
      limit={limit}
      highlightItemOnHover={false}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      name={name}
    >
      <div
        data-slot="autocomplete"
        data-loading={loading || undefined}
        className={cn("relative w-full min-w-0", ACTION_LANE)}
      >
        <AutocompletePrimitive.Input
          id={field.id}
          placeholder={placeholder ?? messages.placeholder}
          aria-label={field["aria-labelledby"] ? undefined : ariaLabel}
          aria-labelledby={field["aria-labelledby"]}
          aria-describedby={field["aria-describedby"]}
          aria-errormessage={field["aria-errormessage"]}
          aria-invalid={field["aria-invalid"]}
          className={cn(
            INPUT_CLASS,
            loading
              ? "pe-[calc(var(--autocomplete-action)*2+0.375rem)]"
              : "pe-[calc(var(--autocomplete-action)+0.375rem)]",
            className,
          )}
        />
        <div className="absolute inset-e-1 top-1/2 flex -translate-y-1/2 items-center">
          {loading ? (
            <span
              data-slot="autocomplete-spinner"
              className="flex size-(--autocomplete-action) shrink-0 items-center justify-center"
            >
              <LoaderCircleIcon aria-hidden className="size-4 animate-spin text-muted-foreground" />
            </span>
          ) : null}
          <AutocompletePrimitive.Clear aria-label={messages.clear} className={fieldAction}>
            <XIcon aria-hidden className="size-4" />
          </AutocompletePrimitive.Clear>
        </div>
      </div>
      <AutocompletePrimitive.Portal>
        <AutocompletePrimitive.Positioner sideOffset={4} className="z-(--qx-z-popover)">
          <AutocompletePrimitive.Popup
            data-slot="autocomplete-content"
            aria-busy={loading || undefined}
            className={cn(POPUP_CLASS, contentClassName)}
          >
            <AutocompletePrimitive.Status data-slot="autocomplete-status">
              {loading ? (
                <div className={POPUP_NOTE_CLASS}>
                  <LoaderCircleIcon aria-hidden className="size-4 animate-spin" />
                  {loadingMessage ?? spinner.label}
                </div>
              ) : null}
            </AutocompletePrimitive.Status>
            <AutocompletePrimitive.Empty data-slot="autocomplete-empty">
              {loading ? null : (
                <div className={cn(POPUP_NOTE_CLASS, "py-6")}>{emptyMessage ?? messages.empty}</div>
              )}
            </AutocompletePrimitive.Empty>
            <AutocompletePrimitive.List>
              {(item: string) => (
                <AutocompletePrimitive.Item key={item} value={item} className={ITEM_CLASS}>
                  <span className="min-w-0 flex-1 wrap-break-word">{item}</span>
                </AutocompletePrimitive.Item>
              )}
            </AutocompletePrimitive.List>
          </AutocompletePrimitive.Popup>
        </AutocompletePrimitive.Positioner>
      </AutocompletePrimitive.Portal>
    </AutocompletePrimitive.Root>
  );
}

export type { AutocompleteProps };
export { Autocomplete };
