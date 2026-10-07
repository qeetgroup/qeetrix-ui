"use client";

import { ChevronDownIcon } from "@qeetrix/icons/icons/chevron-down";
import { ChevronLeftIcon } from "@qeetrix/icons/icons/chevron-left";
import { ChevronRightIcon } from "@qeetrix/icons/icons/chevron-right";
import * as React from "react";
import {
  type ChevronProps,
  type DayButton,
  DayPicker,
  type DayPickerLocale,
  type DayPickerProps,
  defaultDateLib,
  type Formatters,
  getDefaultClassNames,
  type Labels,
  type Matcher,
  type RootProps,
  type WeekNumberProps,
} from "react-day-picker";
import { type Button, buttonVariants } from "@/components/Button/button";
import { calendarMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { type Direction, useLocale, useResolvedDirection } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

/* ── Visible text from a BCP 47 tag ────────────────────────────────────────────────────────
 * DayPicker localises through a date-fns locale *object*, which a consumer has to import per
 * language. Every other date component in this library takes a BCP 47 string and formats with
 * `Intl`, so a picker whose trigger said "6. Okt. 2026" opened onto "October 2026 · Su Mo Tu".
 *
 * A string `locale` therefore formats every visible piece of text — the caption, the weekday
 * header, the day numbers, the dropdown options — and the grid and day-button names with `Intl`
 * instead. Calendar *arithmetic* (week start, what a month is) stays DayPicker's, so pass
 * `weekStartsOn` for a locale whose week does not start on Sunday: deriving it here would make the
 * server and a browser without `Intl.Locale#getWeekInfo` disagree about the grid's first column.
 */

interface IntlCalendarText {
  formatters: Partial<Formatters>;
  labels: Partial<Labels>;
  /** The full date a day button is named with; the catalogue's `calendar.day` wraps it. */
  formatFullDate: (date: Date) => string;
}

// One set per (locale, zone): `Intl` construction is not cheap and a document has few of either.
const intlTextCache = new Map<string, IntlCalendarText>();

function intlCalendarText(locale: string, timeZone: string | undefined): IntlCalendarText {
  const key = `${locale}|${timeZone ?? ""}`;
  const cached = intlTextCache.get(key);
  if (cached) return cached;

  const make = (options: Intl.DateTimeFormatOptions) => {
    const withZone = timeZone ? { ...options, timeZone } : options;
    try {
      return new Intl.DateTimeFormat(locale, withZone);
    } catch {
      // An unknown tag or zone falls back to a fixed locale rather than the ambient one, so the
      // fallback is the same on the server and in the browser.
      return new Intl.DateTimeFormat("en-US", options);
    }
  };
  const caption = make({ month: "long", year: "numeric" });
  const monthShort = make({ month: "short" });
  const year = make({ year: "numeric" });
  // Narrow ("M", "火"): `Intl` has no two-letter width, and its abbreviated one ("Wed",
  // "Mi.") collides at compact density. The full name is the header's accessible name.
  const weekdayNarrow = make({ weekday: "narrow" });
  const weekdayLong = make({ weekday: "long" });
  const dayNumber = make({ day: "numeric" });
  const fullDate = make({ dateStyle: "full" });

  // `{ day: "numeric" }` is "4日" in `ja`: only the day part belongs in a cell.
  const day = (date: Date) =>
    dayNumber.formatToParts(date).find((part) => part.type === "day")?.value ??
    dayNumber.format(date);

  const text: IntlCalendarText = {
    formatters: {
      formatCaption: (date) => caption.format(date),
      formatDay: day,
      formatMonthDropdown: (date) => monthShort.format(date),
      formatYearDropdown: (date) => year.format(date),
      formatWeekdayName: (date) => weekdayNarrow.format(date),
    },
    labels: {
      labelGrid: (date) => caption.format(date),
      labelWeekday: (date) => weekdayLong.format(date),
    },
    // The day-button label is built per render from this and the message catalogue (the cache
    // must not capture a translation), in the same shape as DayPicker's own, so a string locale
    // changes the date's language and nothing else about what a screen reader hears.
    formatFullDate: (date) => fullDate.format(date),
  };
  intlTextCache.set(key, text);
  return text;
}

const toMatcherList = (matcher: Matcher | Matcher[] | undefined): Matcher[] =>
  matcher === undefined ? [] : Array.isArray(matcher) ? matcher : [matcher];

/* ── Hoisted slot components ───────────────────────────────────────────────────────────────
 * DayPicker renders these as element *types*. Declared inline in `components={{ … }}` they were
 * a new type on every render, so React unmounted and remounted the whole grid each time the
 * parent re-rendered — a range selection re-rendered it twice per click. Declared once here,
 * they are stable; what the root needs from the Calendar instance arrives through context.
 */

const CalendarRootRefContext = React.createContext<React.RefObject<HTMLDivElement | null> | null>(
  null,
);

function assignRef<T>(ref: React.Ref<T> | undefined | null, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as React.RefObject<T | null>).current = value;
}

function CalendarRoot({ className, rootRef, ...props }: RootProps) {
  const ownRef = React.useContext(CalendarRootRefContext);
  const setRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      assignRef(rootRef, node);
      assignRef(ownRef, node);
    },
    [rootRef, ownRef],
  );
  return <div data-slot="calendar" ref={setRef} className={className} {...props} />;
}

function CalendarChevron({ className, orientation, disabled: _disabled, size }: ChevronProps) {
  const iconClassName = cn("size-4", className);
  if (orientation === "left")
    return <ChevronLeftIcon aria-hidden size={size} className={iconClassName} />;
  if (orientation === "right") {
    return <ChevronRightIcon aria-hidden size={size} className={iconClassName} />;
  }
  return <ChevronDownIcon aria-hidden size={size} className={iconClassName} />;
}

function CalendarWeekNumber({ children, week: _week, className, ...props }: WeekNumberProps) {
  // A row header, as DayPicker declares it (`scope="row"`): a `<td>` here made `scope` invalid.
  return (
    <th className={cn("p-0 font-normal", className)} {...props}>
      <div className="flex size-(--cell-size) items-center justify-center text-center">
        {children}
      </div>
    </th>
  );
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Every DayPicker prop, plus the Qeetrix additions below. */
type CalendarProps = DistributiveOmit<DayPickerProps, "locale"> & {
  /** Variant of the previous/next month buttons. */
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  /**
   * A BCP 47 tag (`"de-DE"`, `"hi-IN"`) formats the caption, weekday names, day numbers and
   * accessible names with `Intl`, the way every other Qeetrix date component does. A DayPicker
   * locale object is still accepted and behaves as it always has. Omitted, the locale declared
   * by the nearest `DirectionProvider` is used if there is one, and DayPicker's English if not.
   *
   * A string does not change the week start — pass `weekStartsOn` for that.
   */
  locale?: Partial<DayPickerLocale> | string;
  /**
   * Days that exist but cannot be taken — booked, blocked, a holiday. They are disabled (so they
   * cannot be selected), drawn as a struck-through number in a sunken well so they read
   * differently from days outside `disabled`/min–max, and their accessible name ends in
   * ", unavailable". Exposed to `modifiers` and `modifiersClassNames` as `unavailable`.
   */
  unavailable?: Matcher | Matcher[];
};

/**
 * Calendar — the canonical shadcn Calendar (react-day-picker v9), restyled for Qeet. Supports
 * every DayPicker mode (`single`, `multiple`, `range`) and the dropdown caption layouts.
 * `DatePicker` / `DateRangePicker` compose it inside a Popover.
 *
 * States, by design:
 * - **selected** (and a range's two ends): the solid Qeet Ember action fill with its white label;
 * - **range middle**: the quiet brand tint, so a span is one selection, not a band of orange;
 * - **today**: a graphite marker — semibold plus a dot — never a second orange;
 * - **outside** days: a step quieter, still selectable;
 * - **disabled** and **unavailable**: struck through, never colour alone; unavailable days also
 *   sit in a sunken well and are named as such;
 * - **focus**: the Qeet focus ring, keyboard only, raised above its neighbours.
 *
 * The day cell is `--qx-component-calendar-cell-size` (the density-resolved control height), so
 * the grid follows `data-qx-density`. Keyboard handling is DayPicker's and mirrors under RTL:
 * the reading direction is resolved from `dir`, the nearest `DirectionProvider`, or the DOM.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  labels,
  components,
  locale,
  unavailable,
  disabled,
  modifiers,
  dir,
  lang,
  timeZone,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const direction = useResolvedDirection(
    rootRef,
    dir === "rtl" || dir === "ltr" ? (dir as Direction) : undefined,
  );
  const providerLocale = useLocale();
  const localeTag =
    typeof locale === "string" ? locale : locale === undefined ? providerLocale : undefined;
  const intlText = localeTag ? intlCalendarText(localeTag, timeZone) : undefined;
  const messages = useMessages("calendar", calendarMessages);
  // Catalogue labels for what DayPicker would name in English. A DayPicker locale *object* that
  // carries its own label keeps it: DayPicker ranks a custom label above the locale's.
  const localeLabels =
    typeof locale === "object" ? (locale as { labels?: Partial<Labels> }).labels : undefined;
  const catalogueLabels = React.useMemo(() => {
    const own: Partial<Labels> = {};
    const fill = <K extends keyof Labels>(key: K, label: Labels[K]) => {
      if (!localeLabels?.[key]) own[key] = label;
    };
    fill("labelNext", () => messages.nextMonth);
    fill("labelPrevious", () => messages.previousMonth);
    fill("labelMonthDropdown", () => messages.monthDropdown);
    fill("labelYearDropdown", () => messages.yearDropdown);
    fill("labelWeekNumber", (week) => messages.weekNumber(week));
    fill("labelWeekNumberHeader", () => messages.weekNumberHeader);
    if (intlText) {
      own.labelDayButton = (date, modifiers) =>
        messages.day(intlText.formatFullDate(date), modifiers);
    }
    return own;
  }, [messages, localeLabels, intlText]);

  const dayPickerProps = {
    ...props,
    showOutsideDays,
    captionLayout,
    timeZone,
    // Only an RTL resolution is passed on: an LTR one would stamp `dir="ltr"` on the root and
    // pin it against a document that is still deciding. DayPicker mirrors its arrow keys from
    // this (and the `navLayout="around"` chevrons; the default nav's are mirrored by CSS below).
    dir: dir ?? (direction === "rtl" ? "rtl" : undefined),
    lang: lang ?? localeTag,
    locale: typeof locale === "string" ? undefined : locale,
    disabled:
      unavailable === undefined
        ? disabled
        : [...toMatcherList(disabled), ...toMatcherList(unavailable)],
    modifiers: unavailable === undefined ? modifiers : { ...modifiers, unavailable },
    formatters: {
      // DayPicker's own date library, not `toLocaleString("default")`: the ambient locale made
      // the server and the browser render different dropdown labels.
      formatMonthDropdown: (date: Date, dateLib = defaultDateLib) => dateLib.format(date, "LLL"),
      ...intlText?.formatters,
      ...formatters,
    },
    labels: { ...catalogueLabels, ...intlText?.labels, ...labels },
    className: cn(
      "group/calendar bg-background p-3 [--cell-size:var(--qx-component-calendar-cell-size)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
      // DayPicker's default nav draws previous as "left" and next as "right" whatever the
      // direction, so under RTL its glyphs are mirrored here. Scoped to `.rdp-nav`: the
      // `navLayout="around"` buttons live in the caption and are mirrored by DayPicker itself.
      "rtl:**:[.rdp-nav>button>svg]:rotate-180",
      className,
    ),
    classNames: {
      root: cn("w-fit", defaultClassNames.root),
      months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
      month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
      nav: cn(
        "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
        defaultClassNames.nav,
      ),
      button_previous: cn(
        buttonVariants({ variant: buttonVariant }),
        "size-(--cell-size) p-0 select-none aria-disabled:opacity-disabled",
        defaultClassNames.button_previous,
      ),
      button_next: cn(
        buttonVariants({ variant: buttonVariant }),
        "size-(--cell-size) p-0 select-none aria-disabled:opacity-disabled",
        defaultClassNames.button_next,
      ),
      month_caption: cn(
        "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
        defaultClassNames.month_caption,
      ),
      dropdowns: cn(
        "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
        defaultClassNames.dropdowns,
      ),
      dropdown_root: cn(
        "relative rounded-md border border-control shadow-xs has-focus-visible:focus-ring-field",
        defaultClassNames.dropdown_root,
      ),
      dropdown: cn("absolute inset-0 bg-popover opacity-0", defaultClassNames.dropdown),
      caption_label: cn(
        "text-foreground select-none",
        captionLayout === "label"
          ? "text-sm font-semibold"
          : "flex h-[calc(var(--cell-size)-2px)] items-center gap-1 rounded-md ps-2 pe-1 text-sm font-medium [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
        defaultClassNames.caption_label,
      ),
      table: "w-full border-collapse",
      weekdays: cn("flex", defaultClassNames.weekdays),
      // The compact label size through its variables: `cn` (tailwind-merge) does not know the
      // `text-label-compact` role is a size, reads it as a colour, and drops it in favour of
      // `text-muted-foreground`.
      weekday: cn(
        "flex-1 rounded-md text-(length:--qx-typography-label-compact-font-size) leading-(--qx-typography-label-compact-line-height) font-normal text-muted-foreground select-none",
        defaultClassNames.weekday,
      ),
      week: cn("mt-1 flex w-full", defaultClassNames.week),
      week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
      week_number: cn(
        "text-(length:--qx-typography-label-compact-font-size) leading-(--qx-typography-label-compact-line-height) text-muted-foreground select-none",
        defaultClassNames.week_number,
      ),
      // The cell. A selected cell at a week's edge rounds its button, so a range that wraps a
      // week reads as two bands rather than one band cut off by the grid.
      day: cn(
        "group/day relative aspect-square h-full w-full p-0 text-center select-none",
        "[&:first-child[data-selected=true]_button]:rounded-s-(--qx-component-calendar-day-corner) [&:last-child[data-selected=true]_button]:rounded-e-(--qx-component-calendar-day-corner)",
        defaultClassNames.day,
      ),
      // The range's end cells carry the tint behind their solid caps, so the band runs into them.
      range_start: cn(
        "rounded-s-(--qx-component-calendar-day-corner) bg-(--qx-component-calendar-range-background)",
        defaultClassNames.range_start,
      ),
      range_middle: cn("rounded-none", defaultClassNames.range_middle),
      range_end: cn(
        "rounded-e-(--qx-component-calendar-day-corner) bg-(--qx-component-calendar-range-background)",
        defaultClassNames.range_end,
      ),
      // Today, outside, disabled and unavailable are drawn by the day button, which knows every
      // modifier at once; the cell keeps only DayPicker's hook classes for consumers.
      today: defaultClassNames.today,
      outside: defaultClassNames.outside,
      disabled: defaultClassNames.disabled,
      hidden: cn("invisible", defaultClassNames.hidden),
      ...classNames,
    },
    components: {
      Root: CalendarRoot,
      Chevron: CalendarChevron,
      DayButton: CalendarDayButton,
      WeekNumber: CalendarWeekNumber,
      ...components,
    },
  } as DayPickerProps;

  return (
    <CalendarRootRefContext.Provider value={rootRef}>
      <DayPicker {...dayPickerProps} />
    </CalendarRootRefContext.Provider>
  );
}

/**
 * One day. A native button rather than `Button`: a day is a grid cell with its own state model
 * (selected, range, today, outside, disabled, unavailable), and Button's press nudge and halo
 * are wrong inside a grid. Every state is decided here, from DayPicker's modifiers, so no two
 * state rules compete on specificity.
 */
function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const rangeEnd = Boolean(modifiers.range_start || modifiers.range_end);
  const selectedSingle = Boolean(
    modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle,
  );
  const solid = selectedSingle || rangeEnd;
  const inRange = Boolean(modifiers.range_middle) && !rangeEnd;
  const unavailable = Boolean(modifiers.unavailable);
  const disabled = Boolean(modifiers.disabled);
  const label = props["aria-label"];
  const messages = useMessages("calendar", calendarMessages);

  return (
    <button
      ref={ref}
      type="button"
      data-slot="calendar-day-button"
      // ISO, like the cell's own `data-day`: `toLocaleDateString()` differed between the server
      // and the browser, which is a hydration mismatch on every day of the month.
      data-day={day.isoDate}
      data-selected-single={selectedSingle}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-today={modifiers.today || undefined}
      data-outside={modifiers.outside || undefined}
      data-unavailable={unavailable || undefined}
      className={cn(
        "relative flex aspect-square size-auto w-full min-w-(--cell-size) flex-col items-center justify-center gap-1 rounded-(--qx-component-calendar-day-corner) p-0 text-sm leading-none font-normal tabular-nums select-none",
        "transition-colors duration-fast ease-standard outline-none focus-visible:z-10 focus-visible:focus-ring",
        "[&>span]:text-xs [&>span]:opacity-70",
        !solid &&
          !inRange &&
          "text-foreground hover:bg-(--qx-component-calendar-day-background-hover)",
        modifiers.outside &&
          !solid &&
          !inRange &&
          "text-(--qx-component-calendar-outside-foreground)",
        // Today: graphite weight plus a dot in the label's own colour (drawn as a border so it
        // survives forced colours, where backgrounds are repainted).
        modifiers.today &&
          "font-semibold after:pointer-events-none after:absolute after:inset-x-0 after:top-[calc(50%+0.55em)] after:mx-auto after:size-1 after:rounded-full after:border-2 after:border-current",
        solid &&
          "bg-(--qx-component-calendar-selected-background) font-medium text-(--qx-component-calendar-selected-foreground) hover:bg-(--qx-component-calendar-selected-background-hover)",
        inRange &&
          "rounded-none bg-(--qx-component-calendar-range-background) text-(--qx-component-calendar-range-foreground) hover:bg-(--qx-component-calendar-range-background-hover)",
        // Forced colours repaint every fill, so selection takes the system selection — the
        // library recipe, which also keeps Chromium's Canvas text backplate off the label.
        (solid || inRange) && "forced-colors-selected",
        disabled && "cursor-not-allowed line-through decoration-1",
        disabled &&
          !unavailable &&
          !solid &&
          "text-(--qx-component-calendar-disabled-foreground) hover:bg-transparent",
        unavailable &&
          !solid &&
          "bg-(--qx-component-calendar-unavailable-background) text-(--qx-component-calendar-outside-foreground) hover:bg-(--qx-component-calendar-unavailable-background)",
        // DayPicker's own `rdp-day_button` hook class arrives here.
        className,
      )}
      {...props}
      aria-label={unavailable && label ? messages.unavailable(label) : label}
    />
  );
}

export type { CalendarProps };
export { Calendar, CalendarDayButton };
