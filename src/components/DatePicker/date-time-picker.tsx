"use client";

import { CalendarClockIcon } from "lucide-react";
import * as React from "react";
import type { Matcher } from "react-day-picker";
import { Button } from "@/components/Button/button";
import { Calendar } from "@/components/Calendar/calendar";
import { datePickerTriggerVariants } from "@/components/DatePicker/date-picker";
import { TimePicker } from "@/components/DatePicker/time-picker";
import { FieldHiddenInput, useFieldControl } from "@/components/Input/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover/popover";
import { datePickerMessages, timePickerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function timeStringFromDate(date: Date, withSeconds: boolean): string {
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return withSeconds ? `${base}:${pad(date.getSeconds())}` : base;
}

/**
 * The submitted form of a date-time: `yyyy-mm-ddTHH:mm` (or `…:ss` with `withSeconds`) on the
 * *local* wall clock — the `datetime-local` input's own format, so a server can parse it with
 * the same code it uses for a native field. Not `toISOString()`, which would post UTC.
 */
function toLocalDateTime(date: Date | undefined, withSeconds: boolean): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}T${timeStringFromDate(date, withSeconds)}`;
}

/** `date` moved inside `[min, max]`. Bounds are instants here, not just days. */
function clampToBounds(date: Date, min: Date | undefined, max: Date | undefined): Date {
  if (min && date.getTime() < min.getTime()) return new Date(min);
  if (max && date.getTime() > max.getTime()) return new Date(max);
  return date;
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
 * Passing `locale` (or declaring one on a `DirectionProvider`) removes the switch altogether,
 * which is what an SSR application should do.
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
   * BCP 47 locale for the trigger's date and time text and the calendar in the popover.
   * Omitted, the locale of the nearest `DirectionProvider` is used; failing that, the browser's
   * own locale once the component has mounted, and `en-US` before that — the server cannot know
   * the browser's, so the first render has to be a value both can produce. Pass it and both
   * renders agree.
   */
  locale?: string;
  /**
   * Earliest selectable instant. Days before its day are disabled in the calendar, and a time
   * picked on its day that falls before it is moved up to it.
   */
  min?: Date;
  /** Latest selectable instant, on the same terms as `min`. */
  max?: Date;
  /** First column of the calendar, `0` = Sunday. Defaults to Sunday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Offer a "Clear" action in the popover while a value is set. Off by default. */
  clearable?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  /**
   * Submits the value as `yyyy-mm-ddTHH:mm` (`…:ss` with `withSeconds`) on the local wall clock —
   * the `datetime-local` format. Omit and nothing is serialised.
   */
  name?: string;
  /** Associate the submitted value with a form it is not nested inside, by form `id`. */
  form?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

/**
 * Date + time-of-day picker: a Calendar with a {@link TimePicker} footer inside
 * a Popover, emitting a single `Date`. Selecting a day keeps the chosen time
 * (and vice-versa). Controlled or uncontrolled, mirroring `DatePicker`; the popover stays open
 * after a day is picked so the time can follow, and closes on Escape or an outside click.
 *
 * Forms: implements the composite-field contract (see `field.tsx`) on the same terms as
 * `DatePicker` — Field label, description, error and `aria-invalid` reach the trigger, and
 * `name` submits the local `datetime-local` string.
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
  placeholder: placeholderProp,
  hourCycle = 24,
  withSeconds = false,
  minuteStep = 5,
  locale,
  min,
  max,
  weekStartsOn,
  clearable = false,
  disabled,
  id,
  className,
  name,
  form,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: DateTimePickerProps) {
  const messages = useMessages("datePicker", datePickerMessages);
  const timeMessages = useMessages("timePicker", timePickerMessages);
  const placeholder = placeholderProp ?? messages.dateTimePlaceholder;
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<Date | undefined>(defaultValue);
  const selected = value !== undefined ? value : internal;
  // `false` for the first render — the server's, and the hydration render that must match it.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const providerLocale = useLocale();
  const activeLocale = locale ?? providerLocale ?? (mounted ? undefined : FIRST_RENDER_LOCALE);
  const baseId = React.useId();
  const valueId = `${baseId}-value`;
  // Its own id: React context crosses the popover's portal, so without one the footer's hours
  // column would take the surrounding Field's control id — the trigger's — and duplicate it.
  const timeId = `${baseId}-time`;
  const field = useFieldControl({
    id,
    contentLabelId: valueId,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });

  function commit(next: Date | undefined) {
    const bounded = next ? clampToBounds(next, min, max) : undefined;
    if (value === undefined) setInternal(bounded);
    onValueChange?.(bounded);
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
    // "09:45" has no seconds part: `s` is undefined, which `Number.isNaN` lets through and
    // `setHours` turns into an Invalid Date. Guard every part, and ignore a time that is not one.
    if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return;
    const seconds = s === undefined || Number.isNaN(s) ? 0 : s;
    // An event handler, so reading the clock for "today" is legitimate here.
    const next = selected ? new Date(selected) : new Date();
    next.setHours(h, m, seconds, 0);
    commit(next);
  }

  const dayBounds: Matcher[] = [];
  if (min) dayBounds.push({ before: min });
  if (max) dayBounds.push({ after: max });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <FieldHiddenInput
        name={name}
        value={toLocalDateTime(selected, withSeconds)}
        form={form}
        disabled={disabled}
      />
      <PopoverTrigger
        id={field.id}
        disabled={disabled}
        data-empty={!selected}
        data-placeholder={selected ? undefined : ""}
        aria-label={ariaLabel}
        aria-labelledby={field["aria-labelledby"]}
        aria-describedby={field["aria-describedby"]}
        aria-errormessage={field["aria-errormessage"]}
        aria-invalid={field["aria-invalid"]}
        className={cn(datePickerTriggerVariants(), className)}
      >
        <CalendarClockIcon aria-hidden />
        <span id={valueId} data-slot="date-time-picker-value" className="min-w-0 truncate">
          {selected ? formatDateTime(selected, activeLocale, withSeconds) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-(--available-height) w-auto overflow-y-auto p-0"
        align="start"
        aria-label={messages.dateTimeDialog}
      >
        <Calendar
          mode="single"
          // Re-picking the selected day keeps it (and its time) rather than emptying the value.
          required
          selected={selected}
          onSelect={handleDateSelect}
          defaultMonth={selected}
          startMonth={min}
          endMonth={max}
          disabled={dayBounds}
          weekStartsOn={weekStartsOn}
          locale={activeLocale ?? new Intl.DateTimeFormat().resolvedOptions().locale}
          fixedWeeks
          autoFocus
        />
        <div
          data-slot="date-time-picker-footer"
          className="flex items-center justify-between gap-3 border-t border-border p-3"
        >
          <TimePicker
            id={timeId}
            value={selected ? timeStringFromDate(selected, withSeconds) : undefined}
            onValueChange={handleTimeChange}
            hourCycle={hourCycle}
            withSeconds={withSeconds}
            minuteStep={minuteStep}
            aria-label={timeMessages.label}
          />
          {clearable && selected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                commit(undefined);
                setOpen(false);
              }}
            >
              {messages.clear}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { DateTimePickerProps };
export { DateTimePicker };
