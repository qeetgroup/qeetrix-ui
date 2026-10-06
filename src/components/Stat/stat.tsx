import { cva, type VariantProps } from "class-variance-authority";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import * as React from "react";

import { Skeleton } from "@/components/Spinner/skeleton";
import { cn } from "@/lib/utils";

type StatTrend = "up" | "down" | "neutral";
type StatTone = "positive" | "negative" | "neutral";

/*
 * Delta colour is the *meaning* of a change, which is not always its direction: churn, latency
 * and error rate going up are bad news. `trend` says which way the number moved (the arrow);
 * `tone` says whether that is good (the colour). Without a `tone`, up reads positive and down
 * negative, which is what the component always did.
 *
 * Colours are the status *text* roles (≥4.5:1 on every surface in both themes), never the status
 * fills — and never colour alone: the arrow and the sign carry the direction too.
 */
const statDeltaVariants = cva(
  "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums [&_svg]:shrink-0",
  {
    variants: {
      trend: {
        up: "text-success-text",
        down: "text-destructive-text",
        neutral: "text-muted-foreground",
      },
      tone: {
        positive: "text-success-text",
        negative: "text-destructive-text",
        neutral: "text-muted-foreground",
      },
    },
    defaultVariants: {
      trend: "neutral",
    },
  },
);

const statVariants = cva(
  "flex min-w-0 flex-col rounded-xl border border-border bg-surface text-card-foreground shadow-rest",
  {
    variants: {
      size: {
        sm: "gap-1 p-3",
        default: "gap-1.5 p-4",
        lg: "gap-2 p-5",
      },
    },
    defaultVariants: { size: "default" },
  },
);

const STAT_VALUE_SIZE = {
  sm: "text-xl",
  default: "text-2xl",
  lg: "text-[1.875rem]",
} as const;

interface StatProps
  extends React.ComponentProps<"div">,
    Pick<VariantProps<typeof statDeltaVariants>, "trend">,
    VariantProps<typeof statVariants> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Change indicator (e.g. "+12%"); arrowed by `trend`, coloured by `tone`. */
  delta?: React.ReactNode;
  /**
   * Whether the change is good news, which sets the delta's colour. Defaults from `trend` — up is
   * positive, down negative. Set it when up is bad (error rate, latency, churn) or down is good.
   */
  tone?: StatTone;
  /** Leading icon shown top-right. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Supporting line under the value (e.g. "vs. last 30 days"). */
  hint?: React.ReactNode;
  /**
   * The value is still being fetched. The label stays, so the tile keeps its place and its name;
   * the value, delta and hint become placeholders and the tile reports `aria-busy`.
   */
  loading?: boolean;
}

/**
 * Stat (a.k.a. metric card) is the KPI tile for dashboards: a label, a large value, an optional
 * trend delta, an optional hint, and an optional footer (`children`) for a `Sparkline` or a link.
 * Styled to match Card so it sits cleanly in a grid of tiles.
 *
 * The tile is a named group — its label names it — so a screen reader moving through a dashboard
 * hears "Monthly recurring revenue, group" before the figures that belong to it.
 */
function Stat({
  className,
  label,
  value,
  delta,
  trend,
  tone,
  icon: Icon,
  hint,
  size = "default",
  loading = false,
  children,
  ...props
}: StatProps) {
  const labelId = React.useId();
  // An explicit "neutral" draws a level dash, so "no change" is not told by colour alone. With no
  // trend at all the delta is just a note ("12 new") and gets no glyph — a dash there would read
  // as a minus sign.
  const TrendIcon =
    trend === "up"
      ? ArrowUpRightIcon
      : trend === "down"
        ? ArrowDownRightIcon
        : trend === "neutral"
          ? MinusIcon
          : null;
  const resolvedSize = size ?? "default";
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" names a KPI tile; <fieldset> would add form semantics.
    <div
      data-slot="stat"
      data-size={resolvedSize}
      role="group"
      aria-labelledby={labelId}
      aria-busy={loading || undefined}
      className={cn(statVariants({ size: resolvedSize }), className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          id={labelId}
          data-slot="stat-label"
          className="min-w-0 text-sm font-medium text-muted-foreground"
        >
          {label}
        </span>
        {Icon && <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
      </div>
      {loading ? (
        <div data-slot="stat-placeholder" aria-hidden className="flex flex-col gap-2 py-1">
          <Skeleton className="h-6 w-2/5 rounded-(--qx-corner-sm)" />
          {hint && <Skeleton className="h-3 w-3/5 rounded-(--qx-corner-sm)" />}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {/* Proportional figures: tabular digits look loose at display sizes, and a lone
                value has no column to align with. */}
            <span
              data-slot="stat-value"
              className={cn(
                "min-w-0 font-heading leading-tight font-semibold tracking-tight text-foreground",
                STAT_VALUE_SIZE[resolvedSize],
              )}
            >
              {value}
            </span>
            {delta != null && (
              <span
                data-slot="stat-delta"
                data-trend={trend ?? "neutral"}
                data-tone={tone}
                className={cn(statDeltaVariants({ trend, tone }))}
              >
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
        </>
      )}
      {children != null && (
        <div data-slot="stat-footer" className="mt-1 min-w-0">
          {children}
        </div>
      )}
    </div>
  );
}

export type { StatProps, StatTone, StatTrend };
export { Stat, statDeltaVariants, statVariants };
