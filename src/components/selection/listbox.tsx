"use client";

import { CheckIcon } from "lucide-react";
import * as React from "react";
import { useControllableState } from "@/hooks/use-controllable-state";
import { cn } from "@/lib/utils";

interface ListboxOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface ListboxProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: ListboxOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  "aria-label"?: string;
}

function toArray(v: string | string[] | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Standalone listbox primitive (APG Listbox) — single or multi-select with
 * roving `aria-activedescendant`. Exposes the `role=listbox`/`role=option`
 * structure that `Select`/`Combobox` keep internal.
 *
 * Option IDs are positional, not value-derived: an option value containing a
 * space would otherwise produce an `aria-activedescendant` with two IDREFs, and
 * one containing a quote would produce an unqueryable ID.
 *
 * The active option is reconciled against the current options on every render,
 * so filtering the list can never leave `aria-activedescendant` pointing at an
 * element that no longer exists.
 */
function Listbox({
  options,
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  className,
  "aria-label": ariaLabel,
  ...props
}: ListboxProps) {
  // As with Chip: an array internally, a single value on the callback when not multi-select.
  const [selected, setSelection] = useControllableState<string[]>({
    value: value === undefined ? undefined : toArray(value),
    defaultValue: () => toArray(defaultValue),
    onChange: (next) => onValueChange?.(multiple ? next : (next[0] ?? "")),
  });
  const enabled = React.useMemo(() => options.filter((o) => !o.disabled), [options]);
  const [requestedActive, setActiveValue] = React.useState<string | null>(
    enabled[0]?.value ?? null,
  );
  const baseId = React.useId();
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const scrollOnNextPaint = React.useRef(false);

  // Derived, never stored: if the requested option has been filtered out or
  // disabled, the first enabled option becomes active instead.
  const activeValue =
    requestedActive !== null && enabled.some((o) => o.value === requestedActive)
      ? requestedActive
      : (enabled[0]?.value ?? null);
  const activeIndex = activeValue === null ? -1 : options.findIndex((o) => o.value === activeValue);
  const activeId = activeIndex >= 0 ? `${baseId}-option-${activeIndex}` : undefined;

  const setActive = (value: string | null) => {
    // Only interaction scrolls. Mount and re-render must not hijack the scroll
    // position of the page or of a parent scroller.
    scrollOnNextPaint.current = true;
    setActiveValue(value);
  };

  React.useEffect(() => {
    if (!scrollOnNextPaint.current) return;
    scrollOnNextPaint.current = false;
    if (!activeId) return;
    const node = listRef.current?.querySelector(`[id="${activeId}"]`);
    // `block: "nearest"` keeps the option visible without recentring the list.
    (node as HTMLElement | null)?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);

  const commit = (next: string[]) => setSelection(next);
  const toggle = (val: string) => {
    if (multiple) {
      const set = new Set(selected);
      if (set.has(val)) set.delete(val);
      else set.add(val);
      commit(Array.from(set));
    } else {
      commit([val]);
    }
  };
  const move = (dir: 1 | -1) => {
    if (enabled.length === 0) return;
    const idx = enabled.findIndex((o) => o.value === activeValue);
    const next = enabled[(idx + dir + enabled.length) % enabled.length];
    if (next) setActive(next.value);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        setActive(enabled[0]?.value ?? null);
        break;
      case "End":
        e.preventDefault();
        setActive(enabled[enabled.length - 1]?.value ?? null);
        break;
      case "Enter":
      case " ":
        if (activeValue) {
          e.preventDefault();
          toggle(activeValue);
        }
        break;
    }
  };

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-multiselectable={multiple || undefined}
      aria-label={ariaLabel}
      aria-activedescendant={activeId}
      tabIndex={0}
      data-slot="listbox"
      onKeyDown={onKeyDown}
      className={cn(
        "max-h-64 overflow-auto rounded-lg border border-input bg-popover p-1 text-sm text-popover-foreground shadow-rest outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
        className,
      )}
      {...props}
    >
      {options.map((o, index) => {
        const isSel = selected.includes(o.value);
        const isActive = activeValue === o.value;
        return (
          <button
            key={o.value}
            type="button"
            id={`${baseId}-option-${index}`}
            role="option"
            tabIndex={-1}
            aria-selected={isSel}
            aria-disabled={o.disabled || undefined}
            data-active={isActive || undefined}
            data-value={o.value}
            onClick={() => {
              if (o.disabled) return;
              setActive(o.value);
              toggle(o.value);
            }}
            className={cn(
              "flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-start outline-hidden transition-colors select-none",
              isActive && "bg-accent text-accent-foreground",
              o.disabled && "pointer-events-none opacity-disabled",
            )}
          >
            <span className="flex size-4 items-center justify-center">
              {isSel && <CheckIcon aria-hidden className="size-4" />}
            </span>
            <span className="flex-1 truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export type { ListboxOption, ListboxProps };
export { Listbox };
