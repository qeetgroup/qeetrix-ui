"use client";

import { cva } from "class-variance-authority";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import type { DateRange, Matcher } from "react-day-picker";
import { Button } from "@/components/Button/button";
import { Calendar } from "@/components/Calendar/calendar";
import { FieldHiddenInput, useFieldControl } from "@/components/Input/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { fieldText, fieldTrigger } from "@/internal/field-styles";
import { datePickerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

/* ── The trigger is a field ────────────────────────────────────────────────────────────────
 * A date picker shows a value and opens a chooser, which is what a Select trigger does — so it
 * is drawn as a field, not as an outline button, from the shared field recipe
 * (`fieldTrigger`, the same one Select uses): the input's boundary, corner, fill and density-
 * resolved height, the field focus recipe (the border itself turns the ring colour and
 * thickens), the error boundary when `aria-invalid`, the Field's warning/success boundary, the
 * placeholder colour while empty, and the hover edge held while the popover is open — so the
 * trigger still reads as the active field after focus has moved into the calendar.
 *
 * Exported so a consumer composing their own chooser (a fiscal-period picker, say) can draw a
 * trigger that sits in the same form row without restating the recipe.
 */
const datePickerTriggerVariants = cva([
  fieldTrigger,
  fieldText,
  "inline-flex h-(--qx-component-input-height) items-center justify-start gap-2 px-2.5 text-start font-normal whitespace-nowrap select-none",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-muted-foreground [&_svg:not([class*='size-'])]:size-4",
]);

/* ── Formatting environment ────────────────────────────────────────────────────────────────
 * `Intl.DateTimeFormat(undefined, …)` resolves the *ambient* locale, which makes the trigger's
 * visible text a function of where the code runs: a server on `en-US` sends "Jan 1, 2026" and a
 * browser on `de-DE` renders "1. Jan. 2026" for the same `Date` prop. That is a text mismatch,
 * so React discards the server's subtree and re-renders it, and reports a recoverable error.
 *
 * So the first render — the server's, and the hydration render that has to match it — formats in
 * `en-US` unless told otherwise, and only switches to the browser's own locale after mount.
 * Passing `locale` (or declaring one on a `DirectionProvider`) removes the switch altogether,
 * which is what an SSR application should do. The calendar in the popover is formatted in the
 * same locale as the trigger, so the two never speak different languages.
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
 * The locale the popover's calendar is formatted in: the trigger's, or — when the trigger is on
 * the ambient locale — that locale by name. Only reached while the popover is open, which is
 * after mount, so reading the ambient locale here cannot reach a server render.
 */
function calendarLocaleFor(locale: string | undefined): string {
  return locale ?? new Intl.DateTimeFormat().resolvedOptions().locale;
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

/** DayPicker matchers for an inclusive `[min, max]` window, compared by calendar day. */
function boundsMatchers(min: Date | undefined, max: Date | undefined): Matcher[] {
  const matchers: Matcher[] = [];
  if (min) matchers.push({ before: min });
  if (max) matchers.push({ after: max });
  return matchers;
}

/** Props shared by the single-date and range pickers. */
interface DatePickerSharedProps {
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /**
   * BCP 47 locale for the trigger's date text and the calendar in the popover. Omitted, the
   * locale of the nearest `DirectionProvider` is used; failing that, the browser's own locale
   * once the component has mounted, and `en-US` before that — the server cannot know the
   * browser's, so the first render has to be a value both can produce. Pass it and both renders
   * agree.
   */
  locale?: string;
  /** Earliest selectable day (inclusive, by calendar day). Navigation stops at its month. */
  min?: Date;
  /** Latest selectable day (inclusive, by calendar day). Navigation stops at its month. */
  max?: Date;
  /**
   * Days that exist but cannot be picked — booked, blocked, holidays. Drawn struck through in a
   * sunken well and named ", unavailable"; see `Calendar`'s `unavailable`.
   */
  unavailable?: Matcher | Matcher[];
  /** First column of the calendar, `0` = Sunday. Defaults to Sunday. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Offer a "Clear" action in the popover while a value is set. Off by default: re-picking the
   * selected day confirms it rather than silently emptying the field, so an optional field opts
   * in to being clearable.
   */
  clearable?: boolean;
  /** Associate the submitted value(s) with a form they are not nested inside, by form `id`. */
  form?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

interface DatePickerProps extends DatePickerSharedProps {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (date: Date | undefined) => void;
  /**
   * Submits the selected day as `yyyy-mm-dd` under this name. Omit and nothing is serialised.
   * The value is the local calendar day, not a UTC instant.
   */
  name?: string;
}

/** The popover footer with the Clear action. */
function ClearFooter({ onClear, label }: { onClear: () => void; label: string }) {
  return (
    <div data-slot="date-picker-footer" className="flex justify-end border-t border-border p-2">
      <Button variant="ghost" size="sm" onClick={onClear}>
        {label}
      </Button>
    </div>
  );
}

/**
 * A single-date picker: a field-styled trigger opening a Calendar in a Popover.
 *
 * The calendar opens on the selected day's month (today's when empty), with focus on the selected
 * day; arrow keys move by day and week, PageUp/PageDown by month, Enter picks and closes, and
 * Escape closes — focus returns to the trigger either way. Re-picking the selected day confirms
 * it; `clearable` adds an explicit Clear.
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
  placeholder: placeholderProp,
  disabled,
  id,
  className,
  locale,
  min,
  max,
  unavailable,
  weekStartsOn,
  clearable = false,
  name,
  form,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const messages = useMessages("datePicker", datePickerMessages);
  const placeholder = placeholderProp ?? messages.placeholder;
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<Date | undefined>(defaultValue);
  const selected = value !== undefined ? value : internal;
  // `false` for the first render — the server's, and the hydration render that must match it.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const providerLocale = useLocale();
  const activeLocale = locale ?? providerLocale ?? (mounted ? undefined : FIRST_RENDER_LOCALE);
  const valueId = `${React.useId()}-value`;
  const field = useFieldControl({
    id,
    contentLabelId: valueId,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });

  const commit = (date: Date | undefined) => {
    if (value === undefined) setInternal(date);
    onValueChange?.(date);
  };

  const handleSelect = (date: Date | undefined) => {
    commit(date);
    if (date) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <FieldHiddenInput name={name} value={toISODate(selected)} form={form} disabled={disabled} />
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
        <CalendarIcon aria-hidden />
        <span id={valueId} data-slot="date-picker-value" className="min-w-0 truncate">
          {selected ? formatDate(selected, activeLocale) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-(--available-height) w-auto overflow-y-auto p-0"
        align="start"
        aria-label={messages.dialog}
      >
        <Calendar
          mode="single"
          // Re-picking the selected day confirms it (and closes); clearing is explicit.
          required
          selected={selected}
          onSelect={handleSelect}
          // The popover unmounts on close, so this is read on every open: the calendar opens on
          // the value's month, not on whatever month today happens to be.
          defaultMonth={selected}
          startMonth={min}
          endMonth={max}
          disabled={boundsMatchers(min, max)}
          unavailable={unavailable}
          weekStartsOn={weekStartsOn}
          locale={calendarLocaleFor(activeLocale)}
          fixedWeeks
          autoFocus
        />
        {clearable && selected && (
          <ClearFooter
            label={messages.clear}
            onClear={() => {
              commit(undefined);
              setOpen(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps extends DatePickerSharedProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange | undefined) => void;
  /** Months shown side by side in the popover. Defaults to 2; one below the `md` breakpoint. */
  numberOfMonths?: number;
  /**
   * Submits the range as **two** `yyyy-mm-dd` values under the same name, from then to — the
   * native multi-value idiom, so `formData.getAll(name)` is `[from, to]` and
   * `formData.get(name)` is the start. An unset end submits as an empty string rather than
   * being dropped, so the pair is always two entries and position means the same thing.
   */
  name?: string;
}

function formatRange(range: DateRange | undefined, locale: string | undefined): string | null {
  if (!range?.from) return null;
  if (!range.to) return formatDate(range.from, locale);
  return `${formatDate(range.from, locale)} – ${formatDate(range.to, locale)}`;
}

/**
 * A date-range picker (log windows, billing periods): a range Calendar in a Popover, two months
 * side by side, opening on the range's start.
 *
 * Forms: implements the composite-field contract (see `field.tsx`), on the same terms as
 * {@link DatePicker} — with `name` emitting the two ends of the range as two same-named values.
 */
function DateRangePicker({
  value,
  defaultValue,
  onValueChange,
  placeholder: placeholderProp,
  disabled,
  id,
  className,
  numberOfMonths = 2,
  locale,
  min,
  max,
  unavailable,
  weekStartsOn,
  clearable = false,
  name,
  form,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: DateRangePickerProps) {
  const messages = useMessages("datePicker", datePickerMessages);
  const placeholder = placeholderProp ?? messages.rangePlaceholder;
  const [open, setOpen] = React.useState(false);
  const [internal, setInternal] = React.useState<DateRange | undefined>(defaultValue);
  const selected = value !== undefined ? value : internal;
  // `false` for the first render — the server's, and the hydration render that must match it.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const providerLocale = useLocale();
  const activeLocale = locale ?? providerLocale ?? (mounted ? undefined : FIRST_RENDER_LOCALE);
  const label = formatRange(selected, activeLocale);
  // Two months stacked are taller than a phone: below `md` the popover shows one.
  const narrow = useIsMobile();
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
        id={field.id}
        disabled={disabled}
        data-empty={!label}
        data-placeholder={label ? undefined : ""}
        aria-label={ariaLabel}
        aria-labelledby={field["aria-labelledby"]}
        aria-describedby={field["aria-describedby"]}
        aria-errormessage={field["aria-errormessage"]}
        aria-invalid={field["aria-invalid"]}
        className={cn(datePickerTriggerVariants(), className)}
      >
        <CalendarIcon aria-hidden />
        <span id={valueId} data-slot="date-range-picker-value" className="min-w-0 truncate">
          {label ?? placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-(--available-height) w-auto overflow-y-auto p-0"
        align="start"
        aria-label={messages.rangeDialog}
      >
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={narrow ? 1 : numberOfMonths}
          defaultMonth={selected?.from}
          startMonth={min}
          endMonth={max}
          disabled={boundsMatchers(min, max)}
          unavailable={unavailable}
          weekStartsOn={weekStartsOn}
          locale={calendarLocaleFor(activeLocale)}
          fixedWeeks
          autoFocus
        />
        {clearable && selected?.from && (
          <ClearFooter
            label={messages.clear}
            onClear={() => {
              handleSelect(undefined);
              setOpen(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

export type { DatePickerProps, DateRangePickerProps };
export { DatePicker, DateRangePicker, datePickerTriggerVariants };
