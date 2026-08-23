"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { useControllableState } from "@/hooks/use-controllable-state";
import { cn } from "@/lib/utils";

const rootVariants = cva("relative inline-flex rounded-lg bg-muted p-1 text-muted-foreground", {
  variants: {
    size: {
      sm: "h-8 text-xs",
      md: "h-9 text-sm",
      lg: "h-10 text-sm",
    },
    fullWidth: { true: "flex w-full", false: "" },
    orientation: { horizontal: "flex-row", vertical: "flex-col" },
  },
  defaultVariants: { size: "md", fullWidth: false, orientation: "horizontal" },
});

interface SegmentedControlContextValue {
  value: string | undefined;
  setValue: (v: string) => void;
  disabled?: boolean;
  /** Shared radio-group name, so the segments form one native group. */
  name: string;
}

const SegmentedControlContext = React.createContext<SegmentedControlContextValue | null>(null);

interface SegmentedControlProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue">,
    VariantProps<typeof rootVariants> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

/**
 * Inline single-select control with an animated sliding indicator. Radio-group
 * semantics; arrow keys move between segments.
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
  children,
  ...props
}: SegmentedControlProps) {
  const [current, setValue] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: onValueChange as (next: string | undefined) => void,
  });
  const groupName = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = React.useState<React.CSSProperties>({ opacity: 0 });

  // Position the floating indicator under the active segment.
  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>(
      '[data-slot="segmented-control-item"][data-active]',
    );
    if (!active) {
      setIndicator({ opacity: 0 });
      return;
    }
    const vertical = orientation === "vertical";
    setIndicator({
      opacity: 1,
      transform: vertical
        ? `translateY(${active.offsetTop - root.clientTop}px)`
        : `translateX(${active.offsetLeft - root.clientLeft}px)`,
      width: vertical ? undefined : active.offsetWidth,
      height: vertical ? active.offsetHeight : undefined,
    });
  }, [orientation]);

  const ctx = React.useMemo(
    () => ({ value: current, setValue, disabled, name: groupName }),
    [current, setValue, disabled, groupName],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys =
      orientation === "vertical" ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];
    if (!keys.includes(e.key)) return;
    const radios = Array.from(
      e.currentTarget.querySelectorAll<HTMLInputElement>(
        'input[data-slot="segmented-control-input"]:not(:disabled)',
      ),
    );
    const idx = radios.findIndex((el) => el.checked);
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = radios[(idx + dir + radios.length) % radios.length];
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
        role="radiogroup"
        aria-orientation={orientation === "vertical" ? "vertical" : "horizontal"}
        onKeyDown={onKeyDown}
        className={cn(rootVariants({ size, fullWidth, orientation }), className)}
        {...props}
      >
        <span
          aria-hidden
          data-slot="segmented-control-indicator"
          className="absolute inset-y-1 inset-s-1 rounded-md bg-background shadow-sm ring-1 ring-foreground/5 transition-[transform,width,height] duration-200 ease-out motion-reduce:transition-none dark:bg-input/40"
          style={indicator}
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
        "relative z-10 inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 font-medium whitespace-nowrap transition-colors hover:text-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/disabled data-active:text-foreground data-disabled:pointer-events-none data-disabled:opacity-disabled",
        className,
      )}
    >
      <input
        type="radio"
        // Without a shared name the radios are not one native group: assistive technology
        // announces each as "1 of 1" and the browser enforces no single-selection.
        name={ctx?.name}
        data-slot="segmented-control-input"
        className="sr-only"
        checked={active}
        disabled={isDisabled}
        tabIndex={active ? 0 : -1}
        onChange={() => ctx?.setValue(value)}
        {...props}
      />
      {children}
    </label>
  );
}

export type { SegmentedControlItemProps, SegmentedControlProps };
export { SegmentedControl, SegmentedControlItem };
