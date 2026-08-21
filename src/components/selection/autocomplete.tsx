"use client";

import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const POPUP_CLASS =
  "z-50 max-h-(--available-height) w-(--anchor-width) min-w-[12rem] origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-popover ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

const ITEM_CLASS =
  "relative flex w-full cursor-default items-center gap-1.5 rounded-md px-2 py-1.5 text-sm outline-hidden transition-colors select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium";

const INPUT_CLASS =
  "h-[var(--qx-density-control-height,2rem)] w-full min-w-0 rounded-lg border border-input bg-transparent py-1 ps-2.5 pe-8 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-disabled md:text-sm dark:bg-input/30";

interface AutocompleteProps {
  /** Advisory suggestion strings shown beneath the input. */
  items: readonly string[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Class applied to the text input. */
  className?: string;
  /** Class applied to the dropdown popup. */
  contentClassName?: string;
}

/**
 * Free-text input with advisory suggestions — APG Combobox, the "no required
 * selection" variant. Unlike `Combobox`, the typed value is always the submitted
 * value; suggestions never force a selection.
 */
function Autocomplete({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Type to search…",
  emptyMessage = "No suggestions.",
  disabled,
  id,
  name,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  className,
  contentClassName,
}: AutocompleteProps) {
  return (
    <AutocompletePrimitive.Root
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(next ?? "")}
      disabled={disabled}
      name={name}
    >
      <div data-slot="autocomplete" className="relative w-full">
        <AutocompletePrimitive.Input
          id={id}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          className={cn(INPUT_CLASS, className)}
        />
        <div className="absolute end-1 top-1/2 flex -translate-y-1/2 items-center">
          <AutocompletePrimitive.Clear
            aria-label="Clear"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="size-4" />
          </AutocompletePrimitive.Clear>
        </div>
      </div>
      <AutocompletePrimitive.Portal>
        <AutocompletePrimitive.Positioner sideOffset={4} className="z-50">
          <AutocompletePrimitive.Popup className={cn(POPUP_CLASS, contentClassName)}>
            <AutocompletePrimitive.Empty className="px-2 py-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </AutocompletePrimitive.Empty>
            <AutocompletePrimitive.List>
              {(item: string) => (
                <AutocompletePrimitive.Item key={item} value={item} className={ITEM_CLASS}>
                  {item}
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
