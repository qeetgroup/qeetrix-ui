"use client";

import { Meter as MeterPrimitive } from "@base-ui/react/meter";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { progressTrackVariants } from "@/components/Progress/progress";
import { cn } from "@/lib/utils";

/**
 * The fill colour carries the reading's meaning, so every intent is a ≥3:1 graphic against the
 * shared track: the Qeet indicator role by default, the solid status hues (700 light / 400 dark)
 * for thresholds. Colour is never the only channel — the formatted value is shown beside the
 * label and announced as the meter's value text.
 */
const meterIndicatorVariants = cva(
  "h-full rounded-full bg-(--meter-fill) transition-[width] duration-slow ease-standard forced-color-adjust-none forced-colors:[--meter-fill:Highlight]",
  {
    variants: {
      intent: {
        default: "[--meter-fill:var(--qx-component-progress-indicator)]",
        success: "[--meter-fill:var(--success)]",
        warning: "[--meter-fill:var(--warning)]",
        danger: "[--meter-fill:var(--destructive)]",
      },
    },
    defaultVariants: {
      intent: "default",
    },
  },
);

interface MeterProps
  extends MeterPrimitive.Root.Props,
    VariantProps<typeof meterIndicatorVariants>,
    VariantProps<typeof progressTrackVariants> {
  /** Caption shown above the track (inline-start side). */
  label?: React.ReactNode;
  /** Hide the formatted numeric value in the header row. */
  hideValue?: boolean;
}

/**
 * A quota / usage gauge — like Progress, but semantically a measurement within
 * a known range (storage used, seats consumed). Pass `format` for units, e.g.
 * `format={{ style: "percent" }}` or a byte format, and `intent` to colour it.
 */
function Meter({ className, intent, size, label, hideValue, ...props }: MeterProps) {
  const showHeader = label != null || !hideValue;
  return (
    <MeterPrimitive.Root
      data-slot="meter"
      data-intent={intent ?? "default"}
      className={cn("flex w-full flex-col gap-1.5", className)}
      {...props}
    >
      {showHeader && (
        <div data-slot="meter-header" className="flex items-center justify-between gap-2 text-sm">
          {label != null ? (
            <MeterPrimitive.Label data-slot="meter-label" className="font-medium text-foreground">
              {label}
            </MeterPrimitive.Label>
          ) : (
            <span />
          )}
          {!hideValue && (
            <MeterPrimitive.Value
              data-slot="meter-value"
              className="tabular-nums text-muted-foreground"
            />
          )}
        </div>
      )}
      <MeterPrimitive.Track data-slot="meter-track" className={progressTrackVariants({ size })}>
        <MeterPrimitive.Indicator
          data-slot="meter-indicator"
          className={cn(meterIndicatorVariants({ intent }))}
        />
      </MeterPrimitive.Track>
    </MeterPrimitive.Root>
  );
}

export type { MeterProps };
export { Meter, meterIndicatorVariants };
