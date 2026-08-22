"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import * as React from "react";
import { useControllableState } from "@/hooks/use-controllable-state";
import type { MessagesFor } from "@/lib/messages";
import { chipMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-disabled",
  {
    variants: {
      size: {
        sm: "h-6 px-2.5 text-xs",
        md: "h-7 px-3 text-sm",
        lg: "h-8 px-3.5 text-sm",
      },
      selected: {
        true: "border-transparent bg-primary text-primary-foreground shadow-xs",
        false:
          "border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
      },
    },
    defaultVariants: { size: "md", selected: false },
  },
);

type ChipSize = NonNullable<VariantProps<typeof chipVariants>["size"]>;

interface ChipGroupContextValue {
  value: string[];
  multiple: boolean;
  disabled?: boolean;
  size: ChipSize;
  toggle: (value: string) => void;
}

const ChipGroupContext = React.createContext<ChipGroupContextValue | null>(null);

interface ChipGroupProps {
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  /** Multi-select (checkbox semantics). Default false = single-select (radio). */
  multiple?: boolean;
  disabled?: boolean;
  size?: ChipSize;
  className?: string;
  children?: React.ReactNode;
}

function toArray(v: string | string[] | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Groups chips into a single- or multi-select set (controlled or uncontrolled). */
function ChipGroup({
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  disabled,
  size = "md",
  className,
  children,
}: ChipGroupProps) {
  // State is always an array internally; the public callback reports a single value in
  // single-select mode, which is why onChange is adapted rather than passed straight through.
  const [current, setSelection] = useControllableState<string[]>({
    value: value === undefined ? undefined : toArray(value),
    defaultValue: () => toArray(defaultValue),
    onChange: (next) => onValueChange?.(multiple ? next : (next[0] ?? "")),
  });

  const toggle = React.useCallback(
    (next: string) => {
      const set = new Set(current);
      if (multiple) {
        if (set.has(next)) set.delete(next);
        else set.add(next);
      } else {
        set.clear();
        set.add(next);
      }
      setSelection(Array.from(set));
    },
    [current, multiple, setSelection],
  );

  const ctx = React.useMemo<ChipGroupContextValue>(
    () => ({ value: current, multiple, disabled, size, toggle }),
    [current, multiple, disabled, size, toggle],
  );

  return (
    <ChipGroupContext.Provider value={ctx}>
      <div
        data-slot="chip-group"
        role={multiple ? "group" : "radiogroup"}
        className={cn("flex flex-wrap items-center gap-2", className)}
      >
        {children}
      </div>
    </ChipGroupContext.Provider>
  );
}

interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value">,
    VariantProps<typeof chipVariants> {
  /** Identifies the chip within a `ChipGroup`. */
  value?: string;
  /** Controlled selected state for a standalone chip. */
  selected?: boolean;
  /** Renders a remove (×) affordance and fires this on activation. */
  onRemove?: () => void;
  icon?: React.ReactNode;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"chip">;
}

function Chip({
  className,
  size,
  selected,
  value,
  onRemove,
  icon,
  messages: messageOverrides,
  children,
  disabled,
  onClick,
  ...props
}: ChipProps) {
  const messages = useMessages("chip", chipMessages, messageOverrides);
  const group = React.useContext(ChipGroupContext);
  const inGroup = group != null && value != null;
  const isSelected = inGroup ? group.value.includes(value) : !!selected;
  const isDisabled = disabled || (inGroup ? group.disabled : false);
  const resolvedSize = size ?? group?.size ?? "md";
  const selectable = inGroup || selected !== undefined || onClick != null;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (inGroup && value != null) group.toggle(value);
  };

  const labelRole = inGroup
    ? group.multiple
      ? { "aria-pressed": isSelected }
      : { role: "radio", "aria-checked": isSelected }
    : selectable
      ? { "aria-pressed": isSelected }
      : {};

  // Removable chips render as a static pill wrapper with discrete buttons inside
  // (a toggle button and the remove button) — avoids nesting interactive elements.
  if (onRemove) {
    return (
      <span
        data-slot="chip"
        data-selected={isSelected || undefined}
        className={cn(
          chipVariants({ size: resolvedSize, selected: isSelected }),
          "pe-1",
          className,
        )}
      >
        {selectable ? (
          <button
            type="button"
            data-slot="chip-label"
            disabled={isDisabled}
            onClick={handleClick}
            className="-ms-0.5 inline-flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            {...labelRole}
            {...props}
          >
            {icon}
            {children}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {icon}
            {children}
          </span>
        )}
        <button
          type="button"
          data-slot="chip-remove"
          aria-label={messages.remove}
          disabled={isDisabled}
          onClick={onRemove}
          className="ms-0.5 inline-flex size-4 items-center justify-center rounded-full text-current/70 transition-colors hover:bg-foreground/10 hover:text-current focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <XIcon aria-hidden className="size-3" />
        </button>
      </span>
    );
  }

  if (!selectable) {
    return (
      <span
        data-slot="chip"
        className={cn(chipVariants({ size: resolvedSize, selected: isSelected }), className)}
      >
        {icon}
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      data-slot="chip"
      data-selected={isSelected || undefined}
      disabled={isDisabled}
      onClick={handleClick}
      className={cn(chipVariants({ size: resolvedSize, selected: isSelected }), className)}
      {...labelRole}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export type { ChipGroupProps, ChipProps };
export { Chip, ChipGroup, chipVariants };
