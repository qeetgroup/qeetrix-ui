"use client";

import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/Button/button";
import { FieldHiddenInput, useFieldControl } from "@/components/Input/field";
import { Calendar } from "@/components/Calendar/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover/popover";
import { cn } from "@/lib/utils";

/* ── Formatting environment ────────────────────────────────────────────────────────────────
 * `Intl.DateTimeFormat(undefined, …)` resolves the *ambient* locale, which makes the trigger's
 * visible text a function of where the code runs: a server on `en-US` sends "Jan 1, 2026" and a
 * browser on `de-DE` renders "1. Jan. 2026" for the same `Date` prop. That is a text mismatch,
 * so React discards the server's subtree and re-renders it, and reports a recoverable error.
 *
 * So the first render — the server's, and the hydration render that has to match it — formats in
 * `en-US` unless told otherwise, and only switches to the browser's own locale after mount.
 * Passing `locale` removes the switch altogether, which is what an SSR application should do.
 *
 * The time *zone* is deliberately not part of this. `toISODate` submits the local calendar day
 * on purpose (see below), so a display zone that disagreed with it would show one date and post
 * another; a zone here has to be one decision covering both, and that is the injectable
 * locale/zone contract, not this fix.
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

/**
 * The submitted form of a date: `yyyy-mm-dd` in the *local* calendar day the trigger shows.
 *
 * Not `toISOString()`, which converts to UTC first and therefore posts the previous day for
 * every user east of Greenwich after midnight local — the picker would submit a date the user
 * never saw. `formatDate` above is locale-dependent by design (it is what the user reads); a
 * submitted value must not be.
 */
function toISODate(date: Date | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

interface DatePickerProps {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /**
   * BCP 47 locale for the trigger's date text. Omitted, the browser's own locale is used once
   * the component has mounted, and `en-US` before that — the server cannot know the browser's,
   * so the first render has to be a value both can produce. Pass it and both renders agree.
   */
  locale?: string;
  /**
   * Submits the selected day as `yyyy-mm-dd` under this name. Omit and nothing is serialised.
   * The value is the local calendar day, not a UTC instant.
   */
  name?: string;
  /** Associate the submitted value with a form it is not nested inside, by form `id`. */
  form?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

/**
 * A single-date picker: an outline trigger button opening a Calendar in a Popover.
 *
 * Forms: implements the composite-field contract (see `field.tsx`). Inside a `Field` the trigger
 * is named "<label>, <selected date>" — the Field label is prepended to the button's own text
 * rather than replacing it, so the current selection stays audible — and it carries the
 * description, error and `aria-invalid`. `name` submits `yyyy-mm-dd`. There is no `required`:
 * a hidden value is exempt from constraint validation, so an empty date is the consumer's check.
 */
function DatePicker({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Pick a date",
  disabled,
  id,
  className,
  locale,
  name,
  form,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<Date | undefined>(defaultValue);
  const selected = value !== undefined ? value : internal;
  // `false` for the first render — the server's, and the hydration render that must match it.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const activeLocale = locale ?? (mounted ? undefined : FIRST_RENDER_LOCALE);
  const valueId = `${React.useId()}-value`;
  const field = useFieldControl({
    id,
    contentLabelId: valueId,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });

  const handleSelect = (date: Date | undefined) => {
    if (value === undefined) setInternal(date);
    onValueChange?.(date);
    if (date) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <FieldHiddenInput name={name} value={toISODate(selected)} form={form} disabled={disabled} />
      <PopoverTrigger
        render={
          <Button
            id={field.id}
            variant="outline"
            disabled={disabled}
            data-empty={!selected}
            aria-label={ariaLabel}
            aria-labelledby={field["aria-labelledby"]}
            aria-describedby={field["aria-describedby"]}
            aria-errormessage={field["aria-errormessage"]}
            aria-invalid={field["aria-invalid"]}
            className={cn(
              "w-full justify-start gap-2 font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon aria-hidden className="size-4" />
            <span id={valueId} data-slot="date-picker-value">
              {selected ? formatDate(selected, activeLocale) : placeholder}
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start" aria-label="Choose a date">
        <Calendar mode="single" selected={selected} onSelect={handleSelect} autoFocus />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Months shown side by side in the popover. Defaults to 2. */
  numberOfMonths?: number;
  /**
   * BCP 47 locale for the trigger's date text. Omitted, the browser's own locale is used once
   * the component has mounted, and `en-US` before that — the server cannot know the browser's,
   * so the first render has to be a value both can produce. Pass it and both renders agree.
   */
  locale?: string;
  /**
   * Submits the range as **two** `yyyy-mm-dd` values under the same name, from then to — the
   * native multi-value idiom, so `formData.getAll(name)` is `[from, to]` and
   * `formData.get(name)` is the start. An unset end submits as an empty string rather than
   * being dropped, so the pair is always two entries and position means the same thing.
   */
  name?: string;
  /** Associate the submitted values with a form they are not nested inside, by form `id`. */
  form?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

function formatRange(range: DateRange | undefined, locale: string | undefined): string | null {
  if (!range?.from) return null;
  if (!range.to) return formatDate(range.from, locale);
  return `${formatDate(range.from, locale)} – ${formatDate(range.to, locale)}`;
}

/**
 * A date-range picker (log windows, billing periods): two-month range Calendar in a Popover.
 *
 * Forms: implements the composite-field contract (see `field.tsx`), on the same terms as
 * {@link DatePicker} — with `name` emitting the two ends of the range as two same-named values.
 */
function DateRangePicker({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Pick a date range",
  disabled,
  id,
  className,
  numberOfMonths = 2,
  locale,
  name,
  form,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<DateRange | undefined>(defaultValue);
  const selected = value !== undefined ? value : internal;
  // `false` for the first render — the server's, and the hydration render that must match it.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const activeLocale = locale ?? (mounted ? undefined : FIRST_RENDER_LOCALE);
  const label = formatRange(selected, activeLocale);
  const valueId = `${React.useId()}-value`;
  const field = useFieldControl({
    id,
    contentLabelId: valueId,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });

  const handleSelect = (range: DateRange | undefined) => {
    if (value === undefined) setInternal(range);
    onValueChange?.(range);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <FieldHiddenInput
        name={name}
        value={toISODate(selected?.from)}
        form={form}
        disabled={disabled}
      />
      <FieldHiddenInput
        name={name}
        value={toISODate(selected?.to)}
        form={form}
        disabled={disabled}
      />
      <PopoverTrigger
        render={
          <Button
            id={field.id}
            variant="outline"
            disabled={disabled}
            data-empty={!label}
            aria-label={ariaLabel}
            aria-labelledby={field["aria-labelledby"]}
            aria-describedby={field["aria-describedby"]}
            aria-errormessage={field["aria-errormessage"]}
            aria-invalid={field["aria-invalid"]}
            className={cn(
              "w-full justify-start gap-2 font-normal data-[empty=true]:text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon aria-hidden className="size-4" />
            <span id={valueId} data-slot="date-range-picker-value">
              {label ?? placeholder}
            </span>
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start" aria-label="Choose a date range">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export type { DatePickerProps, DateRangePickerProps };
export { DatePicker, DateRangePicker };
