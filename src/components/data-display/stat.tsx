import { cva, type VariantProps } from "class-variance-authority";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

type StatTrend = "up" | "down" | "neutral";

const statDeltaVariants = cva("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", {
  variants: {
    trend: {
      up: "text-success",
      down: "text-destructive",
      neutral: "text-muted-foreground",
    },
  },
  defaultVariants: {
    trend: "neutral",
  },
});

interface StatProps extends React.ComponentProps<"div">, VariantProps<typeof statDeltaVariants> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Change indicator (e.g. "+12%"); coloured + arrowed by `trend`. */
  delta?: React.ReactNode;
  /** Leading icon shown top-right. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Supporting line under the value (e.g. "vs. last 30 days"). */
  hint?: React.ReactNode;
}

/**
 * Stat (a.k.a. metric card) is the KPI tile for dashboards: a label, a large
 * value, an optional trend-coloured delta, and an optional hint — styled to
 * match Card so it sits cleanly in a grid of tiles.
 */
function Stat({
  className,
  label,
  value,
  delta,
  trend = "neutral",
  icon: Icon,
  hint,
  ...props
}: StatProps) {
  const TrendIcon =
    trend === "up" ? ArrowUpRightIcon : trend === "down" ? ArrowDownRightIcon : null;
  return (
    <div
      data-slot="stat"
      className={cn(
        "flex flex-col gap-1.5 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span data-slot="stat-label" className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          data-slot="stat-value"
          className="font-heading text-2xl font-semibold tracking-tight tabular-nums text-foreground"
        >
          {value}
        </span>
        {delta != null && (
          <span data-slot="stat-delta" className={cn(statDeltaVariants({ trend }))}>
            {TrendIcon && <TrendIcon aria-hidden className="size-3.5" />}
            {delta}
          </span>
        )}
      </div>
      {hint && (
        <p data-slot="stat-hint" className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export type { StatProps, StatTrend };
export { Stat, statDeltaVariants };
