"use client";

import { CheckIcon } from "@qeetrix/icons/icons/check";
import { XIcon } from "@qeetrix/icons/icons/x";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { useControllableState } from "@/hooks/use-controllable-state";
import type { MessagesFor } from "@/lib/messages";
import { chipMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useDirectionalKeys } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

const chipVariants = cva(
  [
    "inline-flex items-center gap-1.5 rounded-full border font-ui font-medium whitespace-nowrap transition-colors duration-fast ease-standard outline-none focus-visible:focus-ring",
    "disabled:pointer-events-none disabled:opacity-disabled data-disabled:pointer-events-none data-disabled:opacity-disabled",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      size: {
        sm: "h-6 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        md: "h-7 px-3 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-8 px-3.5 text-sm [&_svg:not([class*='size-'])]:size-4",
      },
      selected: {
        // The Qeet selected vocabulary: a quiet brand tint, a ≥3:1 brand edge, graphite text —
        // and, rendered by Chip, a check glyph, so selection never rests on hue alone. The solid
        // Qeet fill this replaces made every active filter in a toolbar a primary button.
        true: "border-border-brand bg-brand-subtle text-foreground hover:bg-brand-subtle-hover active:bg-brand-subtle-active",
        false:
          "border-border bg-transparent text-foreground hover:bg-surface-interactive active:bg-surface-interactive-hover dark:border-border-strong",
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
  /** Accessible name for the group, e.g. "Status filter". */
  "aria-label"?: string;
  /** Id of the element naming the group. */
  "aria-labelledby"?: string;
}

function toArray(v: string | string[] | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

const RADIO_SELECTOR = '[data-slot="chip"][role="radio"]:not(:disabled)';

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/**
 * Groups chips into a single- or multi-select set (controlled or uncontrolled).
 *
 * Single-select is an APG radio group: one tab stop (the checked chip, or the first one), and
 * the arrow keys move and select along the inline axis — mirrored under RTL — with Home/End
 * for the ends. Multi-select chips are independent toggle buttons, each its own tab stop.
 */
function ChipGroup({
  value,
  defaultValue,
  onValueChange,
  multiple = false,
  disabled,
  size = "md",
  className,
  children,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: ChipGroupProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const { logical } = useDirectionalKeys(rootRef);

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

  // Roving tab stop for the radio form. The chips do not know their own index, so the group
  // settles it after each commit: the checked radio is the stop, else the first enabled one.
  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || multiple) return;
    const radios = Array.from(root.querySelectorAll<HTMLElement>(RADIO_SELECTOR));
    const stop = radios.find((r) => r.getAttribute("aria-checked") === "true") ?? radios[0];
    for (const radio of radios) radio.tabIndex = radio === stop ? 0 : -1;
  }, [current, multiple, children]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (multiple || !(event.target instanceof HTMLElement)) return;
    if (event.target.getAttribute("role") !== "radio") return;
    const radios = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(RADIO_SELECTOR));
    const index = radios.indexOf(event.target);
    if (index === -1) return;
    const intent = logical(event.key);
    let next: number | undefined;
    if (intent === "inline-end" || intent === "block-end") next = (index + 1) % radios.length;
    else if (intent === "inline-start" || intent === "block-start")
      next = (index - 1 + radios.length) % radios.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = radios.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    radios[next]?.focus();
    radios[next]?.click();
  }

  return (
    <ChipGroupContext.Provider value={ctx}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useAriaPropsSupportedByRole: the role is group or radiogroup, chosen at runtime, which the rules cannot see; the handler is the radiogroup's arrow-key contract. */}
      <div
        ref={rootRef}
        data-slot="chip-group"
        role={multiple ? "group" : "radiogroup"}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-disabled={disabled || undefined}
        onKeyDown={handleKeyDown}
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
  /**
   * Leading icon. A selected chip without one shows a check mark, so the selected state has a
   * non-colour cue; a chip with its own icon keeps it and relies on the brand edge and tint.
   */
  icon?: React.ReactNode;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"chip">;
}

/**
 * A selectable pill for filters and choices. In a `ChipGroup`, chips are a single choice, or
 * several with `multiple`; a selected chip shows a check mark, so the state never relies on
 * colour alone.
 */
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

  const leading =
    icon ?? (selectable && isSelected ? <CheckIcon aria-hidden data-slot="chip-check" /> : null);

  // Removable chips render as a static pill wrapper with discrete buttons inside
  // (a toggle button and the remove button) — avoids nesting interactive elements.
  if (onRemove) {
    return (
      <span
        data-slot="chip"
        data-selected={isSelected || undefined}
        data-disabled={isDisabled || undefined}
        className={cn(
          chipVariants({ size: resolvedSize, selected: isSelected }),
          "pe-1",
          !selectable && "hover:bg-transparent active:bg-transparent",
          className,
        )}
      >
        {selectable ? (
          <button
            type="button"
            data-slot="chip-label"
            disabled={isDisabled}
            onClick={handleClick}
            className="-ms-0.5 inline-flex items-center gap-1.5 rounded-full outline-none focus-visible:focus-ring"
            {...labelRole}
            {...props}
          >
            {leading}
            {children}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {leading}
            {children}
          </span>
        )}
        <button
          type="button"
          data-slot="chip-remove"
          aria-label={messages.remove}
          disabled={isDisabled}
          onClick={onRemove}
          // 16px glyph, 24px target: the pseudo-element extends the hit area to WCAG 2.5.8's
          // minimum without growing the chip.
          className="relative ms-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-fast ease-standard after:absolute after:-inset-1 hover:bg-foreground/10 hover:text-foreground focus-visible:focus-ring"
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
        className={cn(
          chipVariants({ size: resolvedSize, selected: isSelected }),
          "hover:bg-transparent active:bg-transparent",
          className,
        )}
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
      {leading}
      {children}
    </button>
  );
}

export type { ChipGroupProps, ChipProps };
export { Chip, ChipGroup, chipVariants };
