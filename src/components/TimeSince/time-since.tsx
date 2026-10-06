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
  /**
   * BCP 47 locale for the text. Omitted, the browser's own locale is used once
   * the component has mounted, and `en-US` before that — see the hydration note
   * on the component. Pass it explicitly and both renders agree.
   */
  locale?: string;
  /**
   * IANA time zone the absolute date and the tooltip are rendered in. Omitted,
   * the browser's own zone is used once the component has mounted, and `UTC`
   * before that. Pass it explicitly and both renders agree.
   */
  timeZone?: string;
  className?: string;
}

/* ── Formatting environment ────────────────────────────────────────────────────────────────
 * `Intl.DateTimeFormat(undefined, …)` resolves the *ambient* locale and time zone. That makes
 * the rendered text a function of where the code runs: a container on UTC renders
 * "Jan 1, 2026, 8:00 PM" for the same instant a browser in Asia/Kolkata renders as
 * "Jan 2, 2026, 1:30 AM". Both strings ship — one in the server HTML, the other from the
 * hydration render — so the `title` attribute differed on every TimeSince, and the visible text
 * differed for any value near a date boundary or older than `absoluteAfterDays`.
 *
 * So the first render, the one the server HTML has to match, does not use the ambient values: it
 * formats in `en-US`/`UTC` unless told otherwise. Once the component has mounted, and only then,
 * it switches to the browser's own locale and zone — the same commit that turns the absolute
 * date into "5 minutes ago". Passing `locale` and `timeZone` explicitly removes the switch
 * altogether, which is what an SSR application that cares should do.
 */

/** What the first render formats in, before the browser's own settings may be read. */
const FIRST_RENDER_LOCALE = "en-US";
const FIRST_RENDER_TIME_ZONE = "UTC";

interface FormatEnvironment {
  /** `undefined` means the ambient locale — legal only after mount. */
  locale?: string;
  /** `undefined` means the ambient zone — legal only after mount. */
  timeZone?: string;
}

// Intl formatters are expensive to build and there are only ever a handful of distinct
// environments in one document, so they are built once and kept.
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

function dateFormatter(env: FormatEnvironment, withTime: boolean): Intl.DateTimeFormat {
  const key = `${env.locale ?? ""}|${env.timeZone ?? ""}|${withTime}`;
  const cached = dateTimeFormatters.get(key);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(env.locale, {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
    ...(env.timeZone ? { timeZone: env.timeZone } : {}),
  });
  dateTimeFormatters.set(key, formatter);

  return formatter;
}

/**
 * `numeric: "always"` for every amount, and `"auto"` only to say "now".
 *
 * `"auto"` turns −1 day into "yesterday" and −1 month into "last month". Those are *calendar*
 * words, and this component measures *elapsed* time: 23 hours before 23:30 is 00:30 the same
 * day, which "auto" would call yesterday. "1 day ago" is never wrong. "now", on the other hand,
 * is exactly what `"auto"` is for — and it is localised, where the hard-coded English "just now"
 * this replaced was not.
 */
function relativeFormatter(
  env: FormatEnvironment,
  numeric: "always" | "auto",
): Intl.RelativeTimeFormat {
  const key = `${env.locale ?? ""}|${numeric}`;
  const cached = relativeFormatters.get(key);
  if (cached) return cached;

  const formatter = new Intl.RelativeTimeFormat(env.locale, { numeric });
  relativeFormatters.set(key, formatter);

  return formatter;
}

function toDate(v: string | Date | number): Date {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  return new Date(v);
}

interface FormattedTime {
  label: string;
  /** `undefined` for an unparseable value: an invalid `datetime` attribute is worse than none. */
  iso: string | undefined;
  absolute: string;
}

function formatAbsolute(value: string | Date | number, env: FormatEnvironment): FormattedTime {
  const date = toDate(value);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) {
    return { label: String(value), iso: undefined, absolute: String(value) };
  }

  return {
    label: dateFormatter(env, false).format(date),
    iso: date.toISOString(),
    absolute: dateFormatter(env, true).format(date),
  };
}

const DAY_MS = 86_400_000;

/** Below this, the label is "now": a seconds count that moves every render is noise. */
const NOW_THRESHOLD_MS = 10_000;

/**
 * Each unit with its length and the rounded amount at which it gives way to the next one.
 *
 * Choosing by the *rounded* amount, smallest unit first, is what keeps the label from reading
 * "60 seconds ago" or "24 hours ago": 59.6 s rounds to 60, which is not under 60, so it is
 * reported as "1 minute ago". The previous rule took the largest unit the raw value reached and
 * then rounded, which produced both.
 */
const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number, number][] = [
  ["second", 1_000, 60],
  ["minute", 60_000, 60],
  ["hour", 3_600_000, 24],
  ["day", DAY_MS, 30],
  ["month", 30 * DAY_MS, 12],
  ["year", 365 * DAY_MS, Number.POSITIVE_INFINITY],
];

function format(
  value: string | Date | number,
  absoluteAfterDays: number,
  now: number,
  env: FormatEnvironment,
): FormattedTime {
  const d = toDate(value);
  const t = d.getTime();
  if (Number.isNaN(t)) return { label: String(value), iso: undefined, absolute: String(value) };
  const iso = d.toISOString();
  const absolute = dateFormatter(env, true).format(d);

  const diffMs = t - now;
  const past = diffMs <= 0;
  const abs = Math.abs(diffMs);
  if (abs / DAY_MS > absoluteAfterDays) {
    return { label: dateFormatter(env, false).format(d), iso, absolute };
  }
  if (abs < NOW_THRESHOLD_MS) {
    return { label: relativeFormatter(env, "auto").format(0, "second"), iso, absolute };
  }
  for (const [unit, ms, rollsOverAt] of RELATIVE_UNITS) {
    const amount = Math.round(abs / ms);
    if (amount < rollsOverAt) {
      const signed = past ? -amount : amount;
      return { label: relativeFormatter(env, "always").format(signed, unit), iso, absolute };
    }
  }
  return { label: dateFormatter(env, false).format(d), iso, absolute };
}

/**
 * TimeSince renders a relative-time label ("5 minutes ago", "1 day ago")
 * with a hover tooltip showing the absolute locale-formatted timestamp.
 * Values older than `absoluteAfterDays` switch to the absolute date.
 *
 * The phrasing is elapsed time, localised by `Intl.RelativeTimeFormat`: "now" under ten
 * seconds, then seconds, minutes, hours, days, months and years, each giving way to the next at
 * its natural boundary. Calendar words ("yesterday", "last month") are deliberately not used —
 * see `relativeFormatter`.
 *
 * Auto-refreshes every `refreshIntervalMs` so a row that loaded as
 * "just now" ticks over to "1 minute ago" without a page reload.
 *
 * The first render is deliberately environment-free: it shows the absolute
 * date, formatted in `en-US`/`UTC`, because neither the clock nor the ambient
 * locale of whatever rendered the HTML can be relied on to match the browser
 * that hydrates it. Everything else — the relative phrase, the browser's locale
 * and time zone — arrives in the commit after mount. Pass `locale` and
 * `timeZone` to skip that switch and render the same text in both places.
 *
 * Outputs an HTML `<time>` element with the `dateTime` attribute set to
 * the ISO timestamp — friendly to screen readers and assistive tech.
 */
function TimeSince({
  value,
  absoluteAfterDays = 30,
  refreshIntervalMs = 60_000,
  locale,
  timeZone,
  className,
}: TimeSinceProps) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    if (refreshIntervalMs <= 0) return;
    const id = setInterval(() => setNow(Date.now()), refreshIntervalMs);
    return () => clearInterval(id);
  }, [refreshIntervalMs]);

  // `now === null` is the first render: the server's, and the hydration render that has to
  // produce the same bytes. Neither may consult the clock or the ambient locale.
  const beforeMount = now === null;
  const env: FormatEnvironment = {
    locale: locale ?? (beforeMount ? FIRST_RENDER_LOCALE : undefined),
    timeZone: timeZone ?? (beforeMount ? FIRST_RENDER_TIME_ZONE : undefined),
  };

  const { label, iso, absolute } = beforeMount
    ? formatAbsolute(value, env)
    : format(value, absoluteAfterDays, now, env);

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
