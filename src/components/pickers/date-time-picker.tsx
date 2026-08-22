"use client";

import { CalendarIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/actions/button";
import { Calendar } from "@/components/pickers/calendar";
import { TimePicker } from "@/components/pickers/time-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/surfaces/popover";
import { cn } from "@/lib/utils";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function timeStringFromDate(date: Date, withSeconds: boolean): string {
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return withSeconds ? `${base}:${pad(date.getSeconds())}` : base;
}

/* ── Formatting environment ────────────────────────────────────────────────────────────────
 * `Intl.DateTimeFormat(undefined, …)` resolves the *ambient* locale, which made the trigger's
 * visible text a function of where the code runs: a server on `en-US` sends "Jan 1, 2026, 8:00 PM"
 * and a browser on `de-DE` renders "01.01.2026, 20:00" for the same `Date` prop. That is a text
 * mismatch, so React discards the server's subtree and re-renders it, and reports a recoverable
 * error. A `useMemo` did not help: it only kept one wrong answer per render pass.
 *
 * So the first render — the server's, and the hydration render that has to match it — formats in
 * `en-US` unless told otherwise, and only switches to the browser's own locale after mount.
 * Passing `locale` removes the switch altogether, which is what an SSR application should do.
 *
 * The time *zone* is deliberately not part of this, and here it is forced rather than merely
 * chosen: `timeStringFromDate` reads the *local* wall clock for the TimePicker footer, so a
 * trigger formatted in some other zone would state a different time than the control beneath it.
 * A zone here has to be one decision covering both, which is the injectable locale/zone contract
 * and not this fix.
 */

/** What the first render formats in, before the browser's own settings may be read. */
const FIRST_RENDER_LOCALE = "en-US";

// One formatter per (locale, precision), built once. `undefined` is the ambient locale, which is
// only legal after mount: the server resolves the host's and the browser resolves the user's, and
// the two renders have to produce the same bytes.
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function formatDateTime(date: Date, locale: string | undefined, withSeconds: boolean): string {
  const key = `${locale ?? ""}|${withSeconds}`;
  let formatter = dateTimeFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: withSeconds ? "medium" : "short",
    });
    dateTimeFormatters.set(key, formatter);
  }

  return formatter.format(date);
}

interface DateTimePickerProps {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (date: Date | undefined) => void;
  placeholder?: string;
  hourCycle?: 12 | 24;
  withSeconds?: boolean;
  /**
   * Minute granularity for the footer {@link TimePicker}, normalised there to an
   * integer in `[1, 30]`. Anything that is not a finite number, and anything that
   * rounds below `1`, becomes `1` — not this component's `5`. Defaults to `5`.
   */
  minuteStep?: number;
  /**
   * BCP 47 locale for the trigger's date and time text. Omitted, the browser's own locale is
   * used once the component has mounted, and `en-US` before that — the server cannot know the
   * browser's, so the first render has to be a value both can produce. Pass it and both renders
   * agree.
   */
  locale?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Date + time-of-day picker: a Calendar with a {@link TimePicker} footer inside
 * a Popover, emitting a single `Date`. Selecting a day keeps the chosen time
 * (and vice-versa). Controlled or uncontrolled, mirroring `DatePicker`.
 *
 * `minuteStep` is forwarded unchanged; {@link TimePicker} owns its normalisation,
 * so an invalid step cannot hang a render from this entry point either.
 *
 * The trigger's text is formatted in `en-US` on the first render and in the browser's own locale
 * after mount, because the server cannot know the browser's; pass `locale` and both renders
 * produce the same bytes.
 */
function DateTimePicker({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Pick date & time",
  hourCycle = 24,
  withSeconds = false,
  minuteStep = 5,
  locale,
  disabled,
  id,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<Date | undefined>(defaultValue);
  const selected = value !== undefined ? value : internal;
  // `false` for the first render — the server's, and the hydration render that must match it.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const activeLocale = locale ?? (mounted ? undefined : FIRST_RENDER_LOCALE);

  function commit(next: Date | undefined) {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  function handleDateSelect(date: Date | undefined) {
    if (!date) {
      commit(undefined);
      return;
    }
    const next = new Date(date);
    if (selected) {
      next.setHours(selected.getHours(), selected.getMinutes(), selected.getSeconds(), 0);
    } else {
      next.setHours(0, 0, 0, 0);
    }
    commit(next);
  }

  function handleTimeChange(time: string) {
    const [h, m, s] = time.split(":").map((x) => Number.parseInt(x, 10));
    const next = selected ? new Date(selected) : new Date();
    next.setHours(h, m, Number.isNaN(s) ? 0 : s, 0);
    commit(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            data-empty={!selected}
            className={cn(
              "w-full justify-start gap-2 font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon aria-hidden className="size-4" />
            {selected ? formatDateTime(selected, activeLocale, withSeconds) : placeholder}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start" aria-label="Choose a date and time">
        <Calendar mode="single" selected={selected} onSelect={handleDateSelect} autoFocus />
        <div className="flex items-center justify-center border-t p-3">
          <TimePicker
            value={selected ? timeStringFromDate(selected, withSeconds) : undefined}
            onValueChange={handleTimeChange}
            hourCycle={hourCycle}
            withSeconds={withSeconds}
            minuteStep={minuteStep}
            aria-label="Time"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { DateTimePickerProps };
export { DateTimePicker };
