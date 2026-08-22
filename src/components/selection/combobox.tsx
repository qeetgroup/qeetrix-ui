"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface ComboboxOption {
  label: string;
  value: string;
  disabled?: boolean;
}

const POPUP_CLASS =
  "z-50 max-h-(--available-height) w-(--anchor-width) min-w-[12rem] origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-popover ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

const ITEM_CLASS =
  "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 ps-2 pe-8 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium data-disabled:pointer-events-none data-disabled:opacity-disabled";

const INPUT_CLASS =
  "h-[var(--qx-density-control-height,2rem)] w-full min-w-0 rounded-lg border border-input bg-transparent py-1 ps-2.5 pe-14 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-disabled aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30";

/** Portal + positioned popup + filtered item list — shared by Combobox and MultiSelect. */
function ComboboxListPopup({
  emptyMessage,
  className,
}: {
  emptyMessage: string;
  className?: string;
}) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner sideOffset={4} className="z-50">
        <ComboboxPrimitive.Popup className={cn(POPUP_CLASS, className)}>
          <ComboboxPrimitive.Empty className="px-2 py-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List>
            {(item: ComboboxOption) => (
              <ComboboxPrimitive.Item
                key={item.value}
                value={item}
                disabled={item.disabled}
                className={ITEM_CLASS}
              >
                <ComboboxPrimitive.ItemIndicator className="absolute end-2 flex size-4 items-center justify-center">
                  <CheckIcon className="size-4" />
                </ComboboxPrimitive.ItemIndicator>
                <span className="flex-1 truncate">{item.label}</span>
              </ComboboxPrimitive.Item>
            )}
          </ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

interface ComboboxProps {
  items: ComboboxOption[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  /** Class applied to the text input. */
  className?: string;
  /** Class applied to the dropdown popup. */
  contentClassName?: string;
}

/** Single-select autocomplete: type to filter, click/Enter to choose. */
function Combobox({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  emptyMessage,
  disabled,
  id,
  name,
  className,
  contentClassName,
}: ComboboxProps) {
  const selected = value === undefined ? undefined : (items.find((i) => i.value === value) ?? null);
  const selectedDefault =
    defaultValue == null ? undefined : items.find((i) => i.value === defaultValue);

  return (
    <ComboboxPrimitive.Root<ComboboxOption, false>
      items={items}
      value={selected}
      defaultValue={selectedDefault}
      onValueChange={(item) => onValueChange?.(item ? item.value : null)}
      disabled={disabled}
      name={name}
    >
      <div data-slot="combobox" className="relative w-full">
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder ?? "Select…"}
          className={cn(INPUT_CLASS, className)}
        />
        <div className="absolute end-1 top-1/2 flex -translate-y-1/2 items-center">
          <ComboboxPrimitive.Clear
            aria-label="Clear selection"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="size-4" />
          </ComboboxPrimitive.Clear>
          <ComboboxPrimitive.Trigger
            aria-label="Open"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronsUpDownIcon className="size-4" />
          </ComboboxPrimitive.Trigger>
        </div>
      </div>
      <ComboboxListPopup
        emptyMessage={emptyMessage ?? "No results."}
        className={contentClassName}
      />
    </ComboboxPrimitive.Root>
  );
}

interface MultiSelectProps {
  items: ComboboxOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  /** Class applied to the chips container. */
  className?: string;
  /** Class applied to the dropdown popup. */
  contentClassName?: string;
}

/** Multi-select / tag input: selected values render as removable chips. */
function MultiSelect({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  emptyMessage,
  disabled,
  id,
  name,
  className,
  contentClassName,
}: MultiSelectProps) {
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
      disabled={disabled}
      name={name}
    >
      <div data-slot="multi-select" className="relative w-full">
        <ComboboxPrimitive.Chips
          className={cn(
            "flex min-h-[var(--qx-density-control-height,2rem)] w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent p-1 ps-1.5 pe-8 text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:text-sm dark:bg-input/30",
            className,
          )}
        >
          <ComboboxPrimitive.Value>
            {(selectedItems: ComboboxOption[]) =>
              selectedItems.map((item) => (
                <ComboboxPrimitive.Chip
                  key={item.value}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {item.label}
                  <ComboboxPrimitive.ChipRemove
                    aria-label={`Remove ${item.label}`}
                    className="flex items-center rounded-sm text-secondary-foreground/70 transition-colors hover:text-secondary-foreground"
                  >
                    <XIcon className="size-3" />
                  </ComboboxPrimitive.ChipRemove>
                </ComboboxPrimitive.Chip>
              ))
            }
          </ComboboxPrimitive.Value>
          <ComboboxPrimitive.Input
            id={id}
            placeholder={placeholder ?? "Select…"}
            className="h-6 min-w-16 flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground"
          />
        </ComboboxPrimitive.Chips>
        <div className="absolute end-1 top-1.5 flex items-center">
          <ComboboxPrimitive.Trigger
            aria-label="Open"
            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronsUpDownIcon className="size-4" />
          </ComboboxPrimitive.Trigger>
        </div>
      </div>
      <ComboboxListPopup
        emptyMessage={emptyMessage ?? "No results."}
        className={contentClassName}
      />
    </ComboboxPrimitive.Root>
  );
}

export type { ComboboxOption, ComboboxProps, MultiSelectProps };
export { Combobox, MultiSelect };
