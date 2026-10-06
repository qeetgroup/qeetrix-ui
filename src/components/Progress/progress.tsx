"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Track thickness. Shared with Meter so a bar and a gauge of the same size line up. The scale is
 * `sm | md | lg`, as ProgressCircle's: a fixed step, not density-resolved (component-api.md §
 * The size scale — `default` is reserved for density-resolved sizes).
 * Forced-colors mode drops background colours, so the track gets a system-colour edge there.
 */
const progressTrackVariants = cva(
  "relative w-full overflow-hidden rounded-full bg-(--qx-component-progress-track) forced-colors:border forced-colors:border-[CanvasText]",
  {
    variants: {
      size: {
        sm: "h-1",
        md: "h-2",
        lg: "h-3",
      },
    },
    defaultVariants: { size: "md" },
  },
);

/**
 * The fill. Determinate: its width is the value, eased with the slow motion role.
 *
 * Indeterminate is a 40% segment travelling along the inline axis (mirrored under RTL). The
 * previous full-width pulse was indistinguishable from a complete bar — and under reduced motion,
 * where the pulse stops, it *was* a complete bar. The reduced-motion form here is a static
 * hatched fill instead: busy, not done.
 */
const progressIndicatorClassName = cn(
  // One fill variable for every state, so forced-colors mode can repoint it once.
  "[--progress-fill:var(--qx-component-progress-indicator)] forced-colors:[--progress-fill:Highlight] forced-color-adjust-none",
  "h-full rounded-full bg-(--progress-fill) transition-[width] duration-slow ease-standard",
  // Indeterminate, at rest (and under reduced motion): a full-width hatch.
  "data-indeterminate:w-full data-indeterminate:bg-transparent data-indeterminate:bg-[repeating-linear-gradient(-45deg,var(--progress-fill)_0_4px,transparent_4px_8px)]",
  // Indeterminate with motion: a solid segment sweeping start → end.
  "motion-safe:data-indeterminate:w-2/5 motion-safe:data-indeterminate:bg-(--progress-fill) motion-safe:data-indeterminate:bg-none",
  "motion-safe:data-indeterminate:translate-x-[250%] motion-safe:rtl:data-indeterminate:-translate-x-[250%]",
  // Linear, per the motion standard's progress role: an eased sweep decelerates into the end of
  // the track and spends the last third of every cycle as a sliver there, which reads as stuck.
  "motion-safe:data-indeterminate:animate-in motion-safe:data-indeterminate:slide-in-from-start-[350%] motion-safe:data-indeterminate:repeat-infinite motion-safe:data-indeterminate:animation-duration-[1400ms] motion-safe:data-indeterminate:ease-(--qx-motion-easing-linear)",
);

interface ProgressProps
  extends ProgressPrimitive.Root.Props,
    VariantProps<typeof progressTrackVariants> {
  /**
   * Visible caption above the track. It also names the progressbar, so `aria-label` is not
   * needed when a label is given. Omit for a bare bar.
   */
  label?: React.ReactNode;
  /** With a `label`, hide the formatted value shown opposite it. */
  hideValue?: boolean;
}

/**
 * Task progress (`role="progressbar"`). Pass `value={null}` while the total is unknown.
 * Name it with `label` or `aria-label`.
 */
function Progress({ className, size, label, hideValue, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-size={size ?? "md"}
      className={cn("relative flex w-full flex-col gap-1.5", className)}
      {...props}
    >
      {label != null && (
        <div
          data-slot="progress-header"
          className="flex items-center justify-between gap-2 text-sm"
        >
          <ProgressPrimitive.Label
            data-slot="progress-label"
            className="font-medium text-foreground"
          >
            {label}
          </ProgressPrimitive.Label>
          {!hideValue && (
            <ProgressPrimitive.Value
              data-slot="progress-value"
              className="tabular-nums text-muted-foreground"
            />
          )}
        </div>
      )}
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className={progressTrackVariants({ size })}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={progressIndicatorClassName}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export type { ProgressProps };
export { Progress, progressTrackVariants };
