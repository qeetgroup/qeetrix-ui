"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { useControllableState } from "@/hooks/use-controllable-state";
import { cn } from "@/lib/utils";
import { useDirectionalKeys } from "@/providers/direction-provider";

/**
 * `useLayoutEffect` on the client, `useEffect` on the server, which has no layout to measure and
 * warns if asked to.
 */
const useIsomorphicLayoutEffect =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;

// The track is a sunken well with an inset hairline (a dark well on a dark canvas needs an edge);
// the selected segment is the Qeet selected vocabulary — the brand-subtle tint with a
// border-brand hairline, as on a pressed Toggle — riding on it. The track's 2px inset and the
// segment's radius are concentric with the outer corner. Disabled, the whole control fades once.
const rootVariants = cva(
  "relative inline-flex rounded-(--qx-corner-control) bg-surface-sunken p-0.5 text-muted-foreground inset-ring inset-ring-border-subtle aria-disabled:opacity-disabled",
  {
    variants: {
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-sm",
      },
      fullWidth: { true: "flex w-full", false: "" },
      orientation: { horizontal: "flex-row", vertical: "flex-col" },
    },
    defaultVariants: { size: "md", fullWidth: false, orientation: "horizontal" },
  },
);

// Heights live on the segments, not the track, so a vertical control stacks full-height
// segments instead of squeezing them into one row's height. Track = segment + 4px:
// 32 / 36 / 40px, as before.
const itemVariants = cva(
  [
    "relative z-10 inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap select-none",
    "transition-colors duration-fast ease-standard hover:text-foreground",
    // The radio is visually hidden, so the segment draws its focus.
    "has-[:focus-visible]:focus-ring",
    // Forced colours: the selected segment takes the system selection (forced-colors-selected,
    // the library recipe) over the Highlight indicator; the rest keep the forced CanvasText.
    "data-[active]:text-foreground data-[active]:forced-colors-selected",
    "data-disabled:cursor-default data-disabled:hover:text-muted-foreground",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      size: {
        sm: "h-7 px-2.5",
        md: "h-8 px-3",
        lg: "h-9 px-3.5",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type SegmentedControlSize = NonNullable<VariantProps<typeof rootVariants>["size"]>;

interface SegmentedControlContextValue {
  value: string | undefined;
  setValue: (v: string) => void;
  disabled?: boolean;
  /** Shared radio-group name, so the segments form one native group. */
  name: string;
  size: SegmentedControlSize;
  vertical: boolean;
}

const SegmentedControlContext = React.createContext<SegmentedControlContextValue | null>(null);

interface SegmentedControlProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue">,
    VariantProps<typeof rootVariants> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  /**
   * Form field name. The segments are native radios, so inside a `<form>` the selected
   * segment's `value` submits under this name. Defaults to a generated name.
   */
  name?: string;
}

interface IndicatorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const sameRect = (a: IndicatorRect | null, b: IndicatorRect | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height);

/**
 * Inline single-select control with an animated sliding indicator. Radio-group
 * semantics; arrow keys move between segments.
 *
 * Keyboard: the selected segment is the one tab stop. The arrow keys along the control's axis
 * move and select — mirrored under RTL for a horizontal control, so the key that points at the
 * next segment reaches it — and wrap at the ends; disabled segments are skipped.
 *
 * The indicator follows the selection, re-measures when the control or a segment resizes (a
 * full-width control in a resizing panel, a translated label), and is positioned from each
 * segment's physical offset, so it lands correctly under `dir="rtl"`. It slides only after its
 * first placement, and the document-wide reduced-motion rule collapses the slide.
 */
function SegmentedControl({
  className,
  size,
  fullWidth,
  orientation = "horizontal",
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  children,
  onKeyDown,
  ...props
}: SegmentedControlProps) {
  const [current, setValue] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: onValueChange as (next: string | undefined) => void,
  });
  const generatedName = React.useId();
  const groupName = name ?? generatedName;
  const resolvedSize: SegmentedControlSize = size ?? "md";
  const vertical = orientation === "vertical";
  const rootRef = React.useRef<HTMLDivElement>(null);
  const { arrowKeys } = useDirectionalKeys(rootRef, vertical ? "vertical" : "horizontal");
  const [indicator, setIndicator] = React.useState<IndicatorRect | null>(null);
  // Off for the first placement, so the indicator appears under the selection instead of
  // sliding in from the start edge.
  const [animate, setAnimate] = React.useState(false);

  const measure = React.useCallback(() => {
    const root = rootRef.current;
    const active = root?.querySelector<HTMLElement>(
      '[data-slot="segmented-control-item"][data-active]',
    );
    // offsetLeft/offsetTop are physical and relative to the track's padding edge — the same
    // origin as the indicator's `left: 0; top: 0` — so the arithmetic needs no direction.
    const next = active
      ? {
          x: active.offsetLeft,
          y: active.offsetTop,
          width: active.offsetWidth,
          height: active.offsetHeight,
        }
      : null;
    setIndicator((prev) => (sameRect(prev, next) ? prev : next));
  }, []);

  // Re-place after every render — a selection, an orientation or size change, new labels. The
  // measurement is a handful of offset reads and only sets state when the rectangle moved.
  // (The original ran on mount only, so the indicator stayed on the first selection.)
  useIsomorphicLayoutEffect(() => {
    measure();
  });

  // …and whenever the track changes size without a render: a full-width control in a resizing
  // panel, a web-font swap.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(root);
    return () => observer.disconnect();
  }, [measure]);

  React.useEffect(() => {
    if (indicator && !animate) setAnimate(true);
  }, [indicator, animate]);

  const ctx = React.useMemo(
    () => ({ value: current, setValue, disabled, name: groupName, size: resolvedSize, vertical }),
    [current, setValue, disabled, groupName, resolvedSize, vertical],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const dir = e.key === arrowKeys.next ? 1 : e.key === arrowKeys.previous ? -1 : 0;
    if (dir === 0) return;
    const radios = Array.from(
      e.currentTarget.querySelectorAll<HTMLInputElement>(
        'input[data-slot="segmented-control-input"]:not(:disabled)',
      ),
    );
    if (radios.length === 0) return;
    const idx = radios.findIndex((el) => el.checked);
    const from = idx === -1 ? (dir === 1 ? -1 : 0) : idx;
    const next = radios[(from + dir + radios.length) % radios.length];
    if (next) {
      e.preventDefault();
      next.focus();
      next.click();
    }
  };

  return (
    <SegmentedControlContext.Provider value={ctx}>
      <div
        ref={rootRef}
        data-slot="segmented-control"
        data-size={resolvedSize}
        data-orientation={orientation}
        role="radiogroup"
        aria-orientation={vertical ? "vertical" : "horizontal"}
        aria-disabled={disabled || undefined}
        onKeyDown={handleKeyDown}
        className={cn(rootVariants({ size, fullWidth, orientation }), className)}
        {...props}
      >
        <span
          aria-hidden
          data-slot="segmented-control-indicator"
          data-animate={animate || undefined}
          className={cn(
            "pointer-events-none absolute rounded-md border border-border-brand bg-brand-subtle shadow-xs",
            "data-animate:transition-[transform,width,height] data-animate:duration-normal data-animate:ease-standard motion-reduce:transition-none",
            "forced-colors:border-[Highlight] forced-colors:bg-[Highlight]",
          )}
          style={
            indicator
              ? {
                  // Physical on purpose: see `measure`.
                  left: 0,
                  top: 0,
                  width: indicator.width,
                  height: indicator.height,
                  transform: `translate(${indicator.x}px, ${indicator.y}px)`,
                }
              : { left: 0, top: 0, opacity: 0 }
          }
        />
        {children}
      </div>
    </SegmentedControlContext.Provider>
  );
}

interface SegmentedControlItemProps
  extends Omit<React.ComponentProps<"input">, "value" | "type" | "checked" | "onChange"> {
  value: string;
}

function SegmentedControlItem({
  className,
  value,
  disabled,
  children,
  ...props
}: SegmentedControlItemProps) {
  const ctx = React.useContext(SegmentedControlContext);
  const active = ctx?.value === value;
  const isDisabled = disabled || ctx?.disabled;

  // A visually-hidden native radio provides real radiogroup semantics, focus,
  // and checked state; the surrounding label carries the segment styling and
  // the geometry the sliding indicator measures.
  return (
    <label
      data-slot="segmented-control-item"
      data-active={active || undefined}
      data-disabled={isDisabled || undefined}
      className={cn(
        itemVariants({ size: ctx?.size ?? "md" }),
        // `flex-1` shares a horizontal track evenly; in a column its 0% basis would override
        // the segment height, so a vertical control's segments keep their own.
        ctx?.vertical && "flex-none",
        // A single disabled segment fades; a disabled control fades once, at the track.
        isDisabled && !ctx?.disabled && "opacity-disabled",
        className,
      )}
    >
      <input
        type="radio"
        // Without a shared name the radios are not one native group: assistive technology
        // announces each as "1 of 1" and the browser enforces no single-selection.
        name={ctx?.name}
        value={value}
        data-slot="segmented-control-input"
        className="sr-only"
        checked={active}
        disabled={isDisabled}
        // The selected segment is the tab stop. With nothing selected yet, defer to the native
        // radio group, which makes the first segment the stop — forcing -1 everywhere (as this
        // used to) left an unselected control unreachable from the keyboard.
        tabIndex={ctx?.value === undefined ? undefined : active ? 0 : -1}
        onChange={() => ctx?.setValue(value)}
        {...props}
      />
      {children}
    </label>
  );
}

export type { SegmentedControlItemProps, SegmentedControlProps };
export { SegmentedControl, SegmentedControlItem };
