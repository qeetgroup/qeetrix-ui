"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TimeSinceProps {
  /** ISO 8601 string, Date instance, or epoch milliseconds. */
  value: string | Date | number;
  /**
   * Once the value is older than this many days, render the absolute
   * locale-formatted date instead of a relative phrase. Default 30.
   */
  absoluteAfterDays?: number;
  /**
   * How often the relative label re-renders, in milliseconds. Tighter
   * intervals give a smoother "30s ago → 31s ago" feel but cost more
   * re-renders. 0 disables the tick (useful inside a list rendered
   * thousands of times per page). Default 60 s.
   */
  refreshIntervalMs?: number;
  className?: string;
}

const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const ABS_FMT = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const ABS_FMT_FULL = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function toDate(v: string | Date | number): Date {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  return new Date(v);
}

interface FormattedTime {
  label: string;
  iso: string;
  absolute: string;
}

function formatAbsolute(value: string | Date | number): FormattedTime {
  const date = toDate(value);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) {
    return { label: String(value), iso: String(value), absolute: String(value) };
  }

  return {
    label: ABS_FMT.format(date),
    iso: date.toISOString(),
    absolute: ABS_FMT_FULL.format(date),
  };
}

function format(
  value: string | Date | number,
  absoluteAfterDays: number,
  now: number,
): FormattedTime {
  const d = toDate(value);
  const t = d.getTime();
  const iso = Number.isNaN(t) ? String(value) : d.toISOString();
  const absolute = Number.isNaN(t) ? String(value) : ABS_FMT_FULL.format(d);
  if (Number.isNaN(t)) return { label: String(value), iso, absolute };

  const diffMs = t - now;
  const past = diffMs <= 0;
  const abs = Math.abs(diffMs);
  const dayMs = 86_400_000;
  if (abs / dayMs > absoluteAfterDays) {
    return { label: ABS_FMT.format(d), iso, absolute };
  }
  if (abs < 10_000) {
    return { label: past ? "just now" : "in a moment", iso, absolute };
  }
  // Pick the largest unit where |value| ≥ 1.
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * dayMs],
    ["month", 30 * dayMs],
    ["day", dayMs],
    ["hour", 3_600_000],
    ["minute", 60_000],
    ["second", 1_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) {
      const v = Math.round(diffMs / ms);
      return { label: RTF.format(v, unit), iso, absolute };
    }
  }
  return { label: past ? "just now" : "in a moment", iso, absolute };
}

/**
 * TimeSince renders a relative-time label ("5 minutes ago", "yesterday")
 * with a hover tooltip showing the absolute locale-formatted timestamp.
 * Values older than `absoluteAfterDays` switch to the absolute date.
 *
 * Auto-refreshes every `refreshIntervalMs` so a row that loaded as
 * "just now" ticks over to "1 minute ago" without a page reload.
 *
 * Outputs an HTML `<time>` element with the `dateTime` attribute set to
 * the ISO timestamp — friendly to screen readers and assistive tech.
 */
function TimeSince({
  value,
  absoluteAfterDays = 30,
  refreshIntervalMs = 60_000,
  className,
}: TimeSinceProps) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    if (refreshIntervalMs <= 0) return;
    const id = setInterval(() => setNow(Date.now()), refreshIntervalMs);
    return () => clearInterval(id);
  }, [refreshIntervalMs]);

  const { label, iso, absolute } =
    now === null ? formatAbsolute(value) : format(value, absoluteAfterDays, now);

  return (
    <time
      data-slot="time-since"
      dateTime={iso}
      title={absolute}
      className={cn("text-muted-foreground", className)}
    >
      {label}
    </time>
  );
}

export type { TimeSinceProps };
export { TimeSince };
