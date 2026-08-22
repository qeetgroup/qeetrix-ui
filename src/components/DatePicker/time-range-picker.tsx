"use client";

import { ClockIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/Button/button";
import { Calendar } from "@/components/Calendar/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover/popover";
import { cn } from "@/lib/utils";

type TimeRangePreset = "1h" | "24h" | "7d" | "30d" | "90d" | "custom";

interface TimeRangeValue {
  preset: TimeRangePreset;
  from: Date;
  to: Date;
}

const PRESETS: { value: Exclude<TimeRangePreset, "custom">; label: string; ms: number }[] = [
  { value: "1h", label: "Last hour", ms: 36e5 },
  { value: "24h", label: "Last 24 hours", ms: 864e5 },
  { value: "7d", label: "Last 7 days", ms: 7 * 864e5 },
  { value: "30d", label: "Last 30 days", ms: 30 * 864e5 },
  { value: "90d", label: "Last 90 days", ms: 90 * 864e5 },
];

/* ── Formatting environment ────────────────────────────────────────────────────────────────
 * `Intl.DateTimeFormat(undefined, …)` resolves the *ambient* locale, so the trigger's visible
 * text was a function of where the code runs: a server on `en-US` sends "Jan 1, 2026" and a
 * browser on `de-DE` renders "1. Jan. 2026" for the same instant. That is a text mismatch, so
 * React discards the server's subtree and re-renders it, and reports a recoverable error. The
 * formatter was also built at module scope, which froze the locale for the whole process.
 *
 * So the first render — the server's, and the hydration render that has to match it — formats in
 * `en-US` unless told otherwise, and only switches to the browser's own locale after mount.
 * Passing `locale` removes the switch altogether, which is what an SSR application should do.
 *
 * The time *zone* is deliberately not part of this, for the reason `date-picker.tsx` records:
 * the ends of a custom range arrive from the Calendar as *local* calendar days, so a display
 * zone that disagreed with them would render a day the user did not pick. A zone here has to be
 * one decision covering both, and that is the injectable locale/zone contract, not this fix.
 */

/** What the first render formats in, before the browser's own settings may be read. */
const FIRST_RENDER_LOCALE = "en-US";

// One formatter per locale, built once. `undefined` is the ambient locale, which is only legal
// after mount: the server resolves the host's and the browser resolves the user's, and the two
// renders have to produce the same bytes.
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function formatDate(date: Date, locale: string | undefined): string {
  const key = locale ?? "";
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
    dateFormatters.set(key, formatter);
  }

  return formatter.format(date);
}

/* ── Deferred clock ────────────────────────────────────────────────────────────────────────
 * A preset's window is "the last 24 hours *as of now*", and the initial value used to be seeded
 * with `new Date()` inside the `useState` initializer. That is a harder mismatch than the locale
 * one: the server and the browser do not merely format differently, they compute different
 * instants, and no amount of matching configuration makes them agree.
 *
 * Nothing renders those instants while a preset is selected — the trigger shows "Last 24 hours",
 * and only a *custom* range puts dates on screen, which requires either a `defaultValue` or a
 * selection. So the clock is not needed until the user commits, and a commit happens inside an
 * event handler, where reading it is correct. The initial internal value is therefore `null` and
 * the default preset is a constant.
 */

/** The preset a picker shows before anything is selected. Must be one of `PRESETS`. */
const DEFAULT_PRESET: Exclude<TimeRangePreset, "custom"> = "24h";

/** Only ever called from an event handler — see the deferred-clock note above. */
function presetRange(ms: number): { from: Date; to: Date } {
  const to = new Date();
  return { from: new Date(to.getTime() - ms), to };
}

interface TimeRangePickerProps {
  value?: TimeRangeValue;
  defaultValue?: TimeRangeValue;
  onValueChange?: (value: TimeRangeValue) => void;
  align?: "start" | "center" | "end";
  /**
   * BCP 47 locale for a custom range's date text. Omitted, the browser's own locale is used
   * once the component has mounted, and `en-US` before that — the server cannot know the
   * browser's, so the first render has to be a value both can produce. Pass it and both renders
   * agree.
   */
  locale?: string;
  className?: string;
}

/**
 * Preset + custom time-range selector (log windows, analytics, billing periods).
 * Emits `{ preset, from, to }`; presets close on click, the calendar sets a custom range.
 *
 * Server-render safe: the default preset needs no clock, so the instants of its window are
 * computed when the user commits rather than during render — the server and the browser cannot
 * disagree about "now" because neither one asks. A custom range's dates are formatted in `en-US`
 * on the first render and in the browser's own locale after mount; pass `locale` and both
 * renders produce the same bytes.
 */
function TimeRangePicker({
  value,
  defaultValue,
  onValueChange,
  align = "start",
  locale,
  className,
}: TimeRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isControlled = value !== undefined;
  // `null` until a `defaultValue` is given or the user picks: a preset needs no instants to
  // render, and computing them here would read the clock during render.
  const [internal, setInternal] = React.useState<TimeRangeValue | null>(defaultValue ?? null);
  const current = isControlled ? (value as TimeRangeValue) : internal;
  const preset = current?.preset ?? DEFAULT_PRESET;
  const custom = current?.preset === "custom" ? current : null;
  // `false` for the first render — the server's, and the hydration render that must match it.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const activeLocale = locale ?? (mounted ? undefined : FIRST_RENDER_LOCALE);

  const commit = (next: TimeRangeValue) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };

  const selectPreset = (p: (typeof PRESETS)[number]) => {
    commit({ preset: p.value, ...presetRange(p.ms) });
    setOpen(false);
  };
  const selectCustom = (range: DateRange | undefined) => {
    if (range?.from) commit({ preset: "custom", from: range.from, to: range.to ?? range.from });
  };

  const label = custom
    ? `${formatDate(custom.from, activeLocale)} – ${formatDate(custom.to, activeLocale)}`
    : (PRESETS.find((p) => p.value === preset)?.label ?? "Select range");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            data-slot="time-range-picker"
            className={cn("justify-start gap-2 font-normal", className)}
          >
            <ClockIcon aria-hidden className="size-4" />
            {label}
          </Button>
        }
      />
      <PopoverContent align={align} className="flex w-auto gap-0 p-0">
        <div className="flex flex-col gap-0.5 border-e border-border p-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.value}
              variant={preset === p.value ? "secondary" : "ghost"}
              size="sm"
              className="justify-start"
              onClick={() => selectPreset(p)}
            >
              {p.label}
            </Button>
          ))}
          <span className="px-2 pt-1.5 text-xs font-medium text-muted-foreground">
            Custom range
          </span>
        </div>
        <Calendar
          mode="range"
          selected={custom ? { from: custom.from, to: custom.to } : undefined}
          onSelect={selectCustom}
          numberOfMonths={2}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export type { TimeRangePickerProps, TimeRangePreset, TimeRangeValue };
export { TimeRangePicker };
