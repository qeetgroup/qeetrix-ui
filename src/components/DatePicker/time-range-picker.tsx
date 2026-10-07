"use client";

import { CheckIcon } from "@qeetrix/icons/icons/check";
import { ClockIcon } from "@qeetrix/icons/icons/clock";
import * as React from "react";
import type { DateRange, Matcher } from "react-day-picker";
import { Button } from "@/components/Button/button";
import { Calendar } from "@/components/Calendar/calendar";
import { datePickerTriggerVariants } from "@/components/DatePicker/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { timeRangePickerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

type TimeRangePreset = "1h" | "24h" | "7d" | "30d" | "90d" | "custom";

interface TimeRangeValue {
  preset: TimeRangePreset;
  from: Date;
  to: Date;
}

/** The presets' values and spans. Their names are the catalogue's `timeRangePicker.preset`. */
const PRESETS: { value: Exclude<TimeRangePreset, "custom">; ms: number }[] = [
  { value: "1h", ms: 36e5 },
  { value: "24h", ms: 864e5 },
  { value: "7d", ms: 7 * 864e5 },
  { value: "30d", ms: 30 * 864e5 },
  { value: "90d", ms: 90 * 864e5 },
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
 * Passing `locale` (or declaring one on a `DirectionProvider`) removes the switch altogether,
 * which is what an SSR application should do.
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
 * the default preset is a constant. The one render-time read left is the calendar's opening
 * month, and that happens only while the popover is open — never on the server.
 */

/** The preset a picker shows before anything is selected. Must be one of `PRESETS`. */
const DEFAULT_PRESET: Exclude<TimeRangePreset, "custom"> = "24h";

/** Only ever called from an event handler — see the deferred-clock note above. */
function presetRange(ms: number): { from: Date; to: Date } {
  const to = new Date();
  return { from: new Date(to.getTime() - ms), to };
}

/** The last instant of `date`'s local calendar day. */
function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** The first of the month before `date`'s. */
function previousMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

interface TimeRangePickerProps {
  value?: TimeRangeValue;
  defaultValue?: TimeRangeValue;
  onValueChange?: (value: TimeRangeValue) => void;
  align?: "start" | "center" | "end";
  /**
   * BCP 47 locale for a custom range's date text and the calendar. Omitted, the locale of the
   * nearest `DirectionProvider` is used; failing that, the browser's own locale once the
   * component has mounted, and `en-US` before that — the server cannot know the browser's, so the
   * first render has to be a value both can produce. Pass it and both renders agree.
   */
  locale?: string;
  /** Earliest day a custom range may start on (inclusive). */
  min?: Date;
  /** Latest day a custom range may end on (inclusive) — typically today, for log windows. */
  max?: Date;
  /** First column of the calendar, `0` = Sunday. Defaults to Sunday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  disabled?: boolean;
  id?: string;
  /** Prefixes the trigger's name, e.g. "Log window" → "Log window, Last 24 hours". */
  "aria-label"?: string;
  className?: string;
}

/**
 * Preset + custom time-range selector (log windows, analytics, billing periods).
 * Emits `{ preset, from, to }`; presets close on click, the calendar sets a custom range.
 *
 * A custom range covers whole days: `from` is the first day's local midnight and `to` the *last
 * instant* of the last day, so "Aug 1 – Aug 3" includes Aug 3. The calendar opens on the custom
 * range, or — with none — on last month and this one, since a window is usually in the past. The
 * selected preset is marked with a check as well as the Qeet tint, and reported as pressed.
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
  min,
  max,
  weekStartsOn,
  disabled,
  id,
  "aria-label": ariaLabel,
  className,
}: TimeRangePickerProps) {
  const messages = useMessages("timeRangePicker", timeRangePickerMessages);
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
  const providerLocale = useLocale();
  const activeLocale = locale ?? providerLocale ?? (mounted ? undefined : FIRST_RENDER_LOCALE);
  // Two months stacked under the presets are taller than a phone: below `md`, one.
  const narrow = useIsMobile();

  const commit = (next: TimeRangeValue) => {
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };

  const selectPreset = (p: (typeof PRESETS)[number]) => {
    commit({ preset: p.value, ...presetRange(p.ms) });
    setOpen(false);
  };
  const selectCustom = (range: DateRange | undefined) => {
    if (!range?.from) return;
    // Whole days: the last day is included, so a one-day pick is a 24-hour window, not an
    // empty one.
    commit({ preset: "custom", from: range.from, to: endOfDay(range.to ?? range.from) });
  };

  const label = custom
    ? `${formatDate(custom.from, activeLocale)} – ${formatDate(custom.to, activeLocale)}`
    : preset && preset !== "custom" && PRESETS.some((p) => p.value === preset)
      ? messages.preset(preset)
      : messages.selectRange;

  const dayBounds: Matcher[] = [];
  if (min) dayBounds.push({ before: min });
  if (max) dayBounds.push({ after: max });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-slot="time-range-picker"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel ? messages.triggerLabel(ariaLabel, label) : undefined}
        className={cn(datePickerTriggerVariants(), "w-auto", className)}
      >
        <ClockIcon aria-hidden />
        <span data-slot="time-range-picker-value" className="min-w-0 truncate">
          {label}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        aria-label={messages.dialog}
        className="flex max-h-(--available-height) w-auto max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-y-auto p-0 sm:flex-row"
      >
        <div
          data-slot="time-range-picker-presets"
          className="flex flex-row flex-wrap gap-0.5 border-b border-border p-1.5 sm:flex-col sm:flex-nowrap sm:border-e sm:border-b-0"
        >
          {PRESETS.map((p) => {
            const active = preset === p.value;
            return (
              <Button
                key={p.value}
                variant="ghost"
                size="sm"
                aria-pressed={active}
                className="justify-start aria-pressed:bg-brand-subtle aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:hover:bg-brand-subtle-hover"
                onClick={() => selectPreset(p)}
              >
                {messages.preset(p.value)}
                {active && (
                  <CheckIcon aria-hidden data-icon="inline-end" className="ms-auto text-brand" />
                )}
              </Button>
            );
          })}
          <span className="w-full px-2 pt-1.5 text-xs font-medium text-muted-foreground sm:w-auto">
            {messages.customRange}
          </span>
        </div>
        <Calendar
          mode="range"
          selected={custom ? { from: custom.from, to: custom.to } : undefined}
          onSelect={selectCustom}
          numberOfMonths={narrow ? 1 : 2}
          // Read only while open — after mount, inside the browser — never on the server.
          defaultMonth={
            custom?.from ?? (open ? (narrow ? new Date() : previousMonth(new Date())) : undefined)
          }
          startMonth={min}
          endMonth={max}
          disabled={dayBounds}
          weekStartsOn={weekStartsOn}
          locale={activeLocale ?? new Intl.DateTimeFormat().resolvedOptions().locale}
          fixedWeeks
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export type { TimeRangePickerProps, TimeRangePreset, TimeRangeValue };
export { TimeRangePicker };
