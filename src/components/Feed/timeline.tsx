import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The colour an event's marker carries. Tone is a *second* channel: the event's own title or
 * description must still say what happened, so a reader who cannot tell the hues apart loses
 * nothing. `neutral` is the default — most history is routine, and an activity stream where
 * every dot is Qeet orange has no way left to say "this one matters".
 *
 * `destructive` is the library-wide name for the error tone; `danger` is accepted as an alias
 * (component-api.md § Variant vocabulary).
 */
type TimelineTone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "destructive"
  /** @deprecated Alias of `destructive`. */
  | "danger";

/**
 * Event hierarchy.
 *
 * - `default` — a meaningful event: a full-size marker and a foreground title.
 * - `minor` — system or housekeeping noise (a label changed, a sync ran): a small marker,
 *   muted text and a tighter rhythm, so a run of them reads as one quiet block between the
 *   events that matter.
 *
 * Give the most important events an `icon` on their `TimelineIndicator` as well — that is the
 * third, strongest level.
 */
type TimelineEmphasis = "default" | "minor";

/** Default-size dots are ≥3:1 graphics on every surface; minor events step down on purpose. */
const DOT_TONE: Record<TimelineTone, string> = {
  neutral: "bg-muted-foreground",
  brand: "bg-primary",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  danger: "bg-destructive",
};

/**
 * Icon markers sit on top of the connector, so they must be opaque. The dark brand-subtle and
 * status-subtle tints are translucent (they read as a tint on any surface), so each tint is painted
 * as a layer over the default surface — the same composite the opaque tints used to be, and the
 * recipe DataTable's pinned cells use. The connector never shows through.
 */
const ICON_MARKER_SURFACE =
  "bg-surface bg-[linear-gradient(var(--timeline-marker-tint),var(--timeline-marker-tint))]";
const ICON_TONE: Record<TimelineTone, string> = {
  neutral:
    "border-border [--timeline-marker-tint:var(--qx-color-surface-sunken)] text-muted-foreground",
  brand:
    "border-border-brand [--timeline-marker-tint:var(--qx-color-surface-brand-subtle)] text-brand",
  // The status borders give the pale light-theme surfaces a defined edge on any background.
  info: "border-(--info-border) [--timeline-marker-tint:var(--qx-color-feedback-info-subtle)] text-info-text",
  success:
    "border-(--success-border) [--timeline-marker-tint:var(--qx-color-feedback-success-subtle)] text-success-text",
  warning:
    "border-(--warning-border) [--timeline-marker-tint:var(--qx-color-feedback-warning-subtle)] text-warning-text",
  destructive:
    "border-(--destructive-border) [--timeline-marker-tint:var(--qx-color-feedback-error-subtle)] text-destructive-text",
  danger:
    "border-(--destructive-border) [--timeline-marker-tint:var(--qx-color-feedback-error-subtle)] text-destructive-text",
};

/**
 * Vertical event/audit history. Compose `TimelineItem`s, each with a
 * `TimelineIndicator` (marker + connector) and a `TimelineContent`
 * (`TimelineHeader` holding `TimelineTitle` / `TimelineTime`, then `TimelineDescription`).
 *
 * The rail is one marker box wide (`--qx-component-timeline-marker-size`) for every event, so
 * dots, icon markers and custom markers line up and the connector stays centred. Spacing
 * between events follows density through `--qx-component-timeline-gap`.
 */
function Timeline({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol data-slot="timeline" className={cn("flex flex-col", className)} {...props} />;
}

interface TimelineItemProps extends React.ComponentProps<"li"> {
  /** Event hierarchy — see `TimelineEmphasis`. @default "default" */
  emphasis?: TimelineEmphasis;
}

function TimelineItem({ className, emphasis = "default", ...props }: TimelineItemProps) {
  return (
    <li
      data-slot="timeline-item"
      data-emphasis={emphasis}
      className={cn(
        "group/timeline-item relative flex gap-3 pb-[var(--qx-component-timeline-gap)] last:pb-0 data-[emphasis=minor]:pb-[var(--qx-component-timeline-gap-minor)] data-[emphasis=minor]:last:pb-0",
        className,
      )}
      {...props}
    />
  );
}

interface TimelineIndicatorProps extends React.ComponentProps<"div"> {
  /** Marker colour. A second channel only — see `TimelineTone`. @default "neutral" */
  tone?: TimelineTone;
  /**
   * An icon shown in a tinted circular marker, for the events that matter most (a passkey
   * added, a payment failed). Decorative: say what happened in the title, or pass `label`.
   */
  icon?: React.ReactNode;
  /**
   * Screen-reader text for what the marker conveys ("Failed", "Approved"), for the case where
   * the visible text does not already say it.
   */
  label?: string;
}

/**
 * The rail: a marker plus the connector down to the next event's marker. `children` replaces
 * the marker entirely (an `Avatar`, a custom glyph); `icon` keeps the Qeetrix marker and puts
 * the icon inside it.
 */
function TimelineIndicator({
  className,
  tone = "neutral",
  icon,
  label,
  children,
  ...props
}: TimelineIndicatorProps) {
  let marker: React.ReactNode;
  if (children != null) {
    marker = children;
  } else if (icon != null) {
    marker = (
      <span
        aria-hidden
        data-slot="timeline-marker"
        data-tone={tone}
        className={cn(
          "flex size-full items-center justify-center rounded-full border [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
          ICON_MARKER_SURFACE,
          ICON_TONE[tone],
        )}
      >
        {icon}
      </span>
    );
  } else {
    marker = (
      <span
        aria-hidden
        data-slot="timeline-marker"
        data-tone={tone}
        className={cn(
          "size-2.5 rounded-full group-data-[emphasis=minor]/timeline-item:size-1.5",
          DOT_TONE[tone],
          // A minor event never shouts, whatever its tone.
          "group-data-[emphasis=minor]/timeline-item:bg-border-strong",
        )}
      />
    );
  }

  return (
    <div
      data-slot="timeline-indicator"
      className={cn("flex w-(--qx-component-timeline-marker-size) shrink-0 flex-col", className)}
      {...props}
    >
      {/* The marker sits above the connector, which runs from this marker's centre to the next
          one's. Both are positioned against the item, so the line spans the item's own padding
          whatever density makes it. */}
      <span className="relative z-1 flex size-(--qx-component-timeline-marker-size) items-center justify-center">
        {marker}
      </span>
      {label && <span className="sr-only">{label}</span>}
      <span
        aria-hidden
        data-slot="timeline-connector"
        className="absolute inset-s-[calc(var(--qx-component-timeline-marker-size)/2-0.5px)] top-[calc(var(--qx-component-timeline-marker-size)/2)] -bottom-[calc(var(--qx-component-timeline-marker-size)/2)] w-px bg-border group-last/timeline-item:hidden"
      />
    </div>
  );
}

function TimelineContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-content"
      // The first text line is centred on the 24px marker: 20px line box + 2px above.
      className={cn("flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5", className)}
      {...props}
    />
  );
}

/**
 * Title and time on one line — title at the start, time at the end — wrapping to two lines
 * in a narrow panel rather than truncating either.
 */
function TimelineHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-header"
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 *:data-[slot=timeline-title]:min-w-0",
        className,
      )}
      {...props}
    />
  );
}

function TimelineTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-title"
      className={cn(
        "text-sm font-medium text-foreground wrap-anywhere group-data-[emphasis=minor]/timeline-item:font-normal group-data-[emphasis=minor]/timeline-item:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

interface TimelineTimeProps extends React.ComponentProps<"div"> {
  /**
   * Machine-readable instant. When set the element renders as `<time dateTime>`, so the
   * relative or localised text the reader sees ("2h ago") keeps an exact value behind it.
   */
  dateTime?: string;
}

function TimelineTime({ className, dateTime, ...props }: TimelineTimeProps) {
  const classes = cn(
    "shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums",
    className,
  );
  if (dateTime !== undefined) {
    return (
      <time
        data-slot="timeline-time"
        dateTime={dateTime}
        className={classes}
        {...(props as React.ComponentProps<"time">)}
      />
    );
  }
  return <div data-slot="timeline-time" className={classes} {...props} />;
}

function TimelineDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="timeline-description"
      className={cn("text-sm text-muted-foreground wrap-anywhere", className)}
      {...props}
    />
  );
}

export type {
  TimelineEmphasis,
  TimelineIndicatorProps,
  TimelineItemProps,
  TimelineTimeProps,
  TimelineTone,
};
export {
  Timeline,
  TimelineContent,
  TimelineDescription,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
};
