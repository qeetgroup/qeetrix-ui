import { cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const progressCircleVariants = cva("relative inline-flex items-center justify-center", {
  variants: {
    size: {
      sm: "",
      md: "",
      lg: "",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

type NamedSize = "sm" | "md" | "lg";

const SIZE_MAP = {
  sm: { px: 40, sw: 5, showLabelDefault: false },
  md: { px: 60, sw: 7, showLabelDefault: true },
  lg: { px: 80, sw: 9, showLabelDefault: true },
} satisfies Record<NamedSize, { px: number; sw: number; showLabelDefault: boolean }>;

interface ProgressCircleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100; clamped automatically. */
  value: number;
  /** Named size token or raw pixel size. Defaults to "md" (60 px). */
  size?: NamedSize | number;
  /** Ring stroke width in px. Defaults: sm → 5, md → 7, lg → 9. */
  strokeWidth?: number;
  /** Show numeric % in the centre. Defaults false for sm, true for md/lg. */
  showLabel?: boolean;
  /** Custom centre content; overrides showLabel percentage. */
  label?: React.ReactNode;
}

function ProgressCircle({
  value,
  size = "md",
  strokeWidth,
  showLabel,
  label,
  className,
  "aria-label": ariaLabel,
  ...props
}: ProgressCircleProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const sizeNum = typeof size === "string" ? SIZE_MAP[size].px : size;
  const sw = strokeWidth ?? (typeof size === "string" ? SIZE_MAP[size].sw : 7);
  const effectiveShowLabel =
    showLabel ?? (typeof size === "string" ? SIZE_MAP[size].showLabelDefault : true);
  const sizeVariant = typeof size === "string" ? size : undefined;

  const radius = (sizeNum - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div
      data-slot="progress-circle"
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel ?? `${clampedValue}%`}
      style={{ width: sizeNum, height: sizeNum }}
      className={cn(progressCircleVariants({ size: sizeVariant }), className)}
      {...props}
    >
      <svg width={sizeNum} height={sizeNum} className="-rotate-90" aria-hidden="true">
        {/* Track */}
        <circle
          cx={sizeNum / 2}
          cy={sizeNum / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={sw}
          className="text-muted/30"
        />
        {/* Fill */}
        <circle
          cx={sizeNum / 2}
          cy={sizeNum / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={sw}
          className="text-primary transition-all duration-500"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {(label !== undefined || effectiveShowLabel) && (
        <span
          data-slot="progress-circle-label"
          className="absolute text-xs font-semibold tabular-nums"
        >
          {label ?? `${clampedValue}%`}
        </span>
      )}
    </div>
  );
}

export type { ProgressCircleProps };
export { ProgressCircle, progressCircleVariants };
