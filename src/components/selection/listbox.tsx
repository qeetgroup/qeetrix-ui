"use client";

import { CheckIcon } from "lucide-react";
import * as React from "react";

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
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState<string[]>(() => toArray(defaultValue));
  const selected = isControlled ? toArray(value) : internal;
  const enabled = React.useMemo(() => options.filter((o) => !o.disabled), [options]);
  const [activeValue, setActiveValue] = React.useState<string | null>(enabled[0]?.value ?? null);
  const baseId = React.useId();

  const commit = (next: string[]) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(multiple ? next : (next[0] ?? ""));
  };
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
    if (next) setActiveValue(next.value);
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
        setActiveValue(enabled[0]?.value ?? null);
        break;
      case "End":
        e.preventDefault();
        setActiveValue(enabled[enabled.length - 1]?.value ?? null);
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
      role="listbox"
      aria-multiselectable={multiple || undefined}
      aria-label={ariaLabel}
      aria-activedescendant={activeValue ? `${baseId}-${activeValue}` : undefined}
      tabIndex={0}
      data-slot="listbox"
      onKeyDown={onKeyDown}
      className={cn(
        "max-h-64 overflow-auto rounded-lg border border-input bg-popover p-1 text-sm text-popover-foreground shadow-rest outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
        className,
      )}
      {...props}
    >
      {options.map((o) => {
        const isSel = selected.includes(o.value);
        const isActive = activeValue === o.value;
        return (
          <button
            key={o.value}
            type="button"
            id={`${baseId}-${o.value}`}
            role="option"
            tabIndex={-1}
            aria-selected={isSel}
            aria-disabled={o.disabled || undefined}
            data-active={isActive || undefined}
            onClick={() => {
              if (o.disabled) return;
              setActiveValue(o.value);
              toggle(o.value);
            }}
            className={cn(
              "flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-start outline-hidden transition-colors select-none",
              isActive && "bg-accent text-accent-foreground",
              o.disabled && "pointer-events-none opacity-disabled",
            )}
          >
            <span className="flex size-4 items-center justify-center">
              {isSel && <CheckIcon className="size-4" />}
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
