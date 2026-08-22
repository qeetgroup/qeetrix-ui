"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/Button/button";
import { SegmentedControl, SegmentedControlItem } from "@/components/Button/segmented-control";
import { cn } from "@/lib/utils";

export type CalendarView = "day" | "week" | "month";

/** `0` = Sunday … `6` = Saturday. */
export type ScheduleWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduleEvent {
  id: string;
  start: Date;
  end: Date;
  title: React.ReactNode;
  /** A semantic class or `--qx-*` var for the event chip (not a raw colour). */
  color?: string;
  allDay?: boolean;
}

export interface ScheduleCalendarProps extends Omit<React.ComponentProps<"div">, "onSelect"> {
  events: ScheduleEvent[];
  view?: CalendarView;
  defaultView?: CalendarView;
  /** The focused period. Only the calendar day it falls on in `timezone` is used. */
  date?: Date;
  defaultDate?: Date;
  /**
   * IANA time zone governing **every** date decision this component makes: which
   * day an event belongs to, where each day starts and ends, what "today" is,
   * what a navigation step lands on, and how every label is formatted.
   *
   * Defaults to the host zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
   * Pass it explicitly for server rendering, where the server's zone and the
   * browser's zone are rarely the same. An unrecognised zone falls back to the
   * host zone rather than throwing.
   */
  timezone?: string;
  /** BCP 47 locale for the visible labels. Defaults to the host locale. */
  locale?: string;
  /** First column of the week grid. Defaults to `0` (Sunday). */
  weekStartsOn?: ScheduleWeekday;
  onViewChange?: (view: CalendarView) => void;
  /** Receives midnight in `timezone` on the day navigated to. */
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: ScheduleEvent) => void;
  /** Receives the `timezone`-local day as `[midnight, next midnight − 1ms]`. */
  onRangeSelect?: (range: { start: Date; end: Date }) => void;
}

/* ── One calendar, one time zone ───────────────────────────────────────────────────────────
 * A calendar answers two different kinds of question. "Which day is this event on?" and
 * "where does this week start?" are questions about a wall clock somewhere; "what should this
 * heading say?" is a question about formatting. Ask them in different zones and the grid stops
 * agreeing with itself: an event at 22:00 in Kolkata is already tomorrow in Auckland, so a
 * calendar that buckets with the host's `Date` accessors and formats with a requested
 * `timeZone` can print an event's time under a day the event is not on — and can highlight the
 * wrong cell as "today" for anyone whose zone crosses midnight before or after the host's.
 *
 * So the zone is resolved once and everything below is derived from it. Days are carried as
 * civil dates — a year/month/day triple with no zone and no instant attached, which is the
 * actual unit a grid is made of — and become instants only at the two edges where instants are
 * unavoidable: comparing against `ScheduleEvent.start` / `.end`, and handing a `Date` back to
 * the consumer. `Intl` is the only IANA database available without a dependency, so the civil
 * ↔ instant bridge is built from `formatToParts`.
 *
 * Known limit: for a zone whose DST transition is at midnight, a day whose 00:00 does not exist
 * locally begins at the instant the clock jumps to instead. Days there are 23 hours long, which
 * is what the wall clock did.
 */

interface CivilDate {
  y: number;
  /** 1-based, as `Intl` reports it. */
  mo: number;
  d: number;
}

const DAY_MS = 86_400_000;
const pad2 = (n: number) => String(n).padStart(2, "0");

/* Civil arithmetic borrows `Date`'s proleptic Gregorian calendar through the UTC accessors,
 * which have no DST and no zone — the epoch values below are calendar maths, not instants. */
const civilFromUtc = (ms: number): CivilDate => {
  const t = new Date(ms);
  return { y: t.getUTCFullYear(), mo: t.getUTCMonth() + 1, d: t.getUTCDate() };
};
const civilAddDays = (c: CivilDate, n: number) =>
  civilFromUtc(Date.UTC(c.y, c.mo - 1, c.d) + n * DAY_MS);
const civilAddMonths = (c: CivilDate, n: number) => civilFromUtc(Date.UTC(c.y, c.mo - 1 + n, 1));
const civilWeekday = (c: CivilDate) =>
  new Date(Date.UTC(c.y, c.mo - 1, c.d)).getUTCDay() as ScheduleWeekday;
const civilStartOfWeek = (c: CivilDate, weekStartsOn: ScheduleWeekday) =>
  civilAddDays(c, -((civilWeekday(c) - weekStartsOn + 7) % 7));
const civilKey = (c: CivilDate) => `${c.y}-${pad2(c.mo)}-${pad2(c.d)}`;
const civilSame = (a: CivilDate, b: CivilDate) => a.y === b.y && a.mo === b.mo && a.d === b.d;

/** Canonical zone name, or the host zone if `requested` is absent or unrecognised. */
function resolveTimeZone(requested?: string): string {
  const host = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!requested) return host;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: requested }).resolvedOptions().timeZone;
  } catch {
    return host;
  }
}

interface ZoneCalendar {
  timeZone: string;
  /** The calendar day `instant` falls on in this zone. */
  civilOf(instant: Date): CivilDate;
  /** The instant at which `day` begins in this zone. */
  startOf(day: CivilDate): Date;
}

function createZoneCalendar(timeZone: string): ZoneCalendar {
  // `en-US` fixes the part *types*; the values are numeric and locale-independent.
  const fields = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  function wallClock(instant: Date) {
    const parts = fields.formatToParts(instant);
    const at = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value);
    return {
      y: at("year"),
      mo: at("month"),
      d: at("day"),
      h: at("hour"),
      mi: at("minute"),
      s: at("second"),
    };
  }

  /** Zone offset at `instant`, in ms east of UTC. */
  function offsetAt(instant: Date): number {
    const w = wallClock(instant);
    const asUtc = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s);
    // `Intl` truncates to whole seconds; keep the instant's sub-second part out of the offset.
    return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
  }

  return {
    timeZone,
    civilOf: (instant) => {
      const w = wallClock(instant);
      return { y: w.y, mo: w.mo, d: w.d };
    },
    // Two passes: guess with the offset at the *UTC* reading of the wall clock, then correct
    // with the offset actually in force at that instant. One pass is wrong across a transition.
    startOf: (day) => {
      const wall = Date.UTC(day.y, day.mo - 1, day.d);
      const guess = wall - offsetAt(new Date(wall));
      return new Date(wall - offsetAt(new Date(guess)));
    },
  };
}

function useControllable<T>(controlled: T | undefined, initial: T, onChange?: (v: T) => void) {
  const [internal, setInternal] = React.useState(initial);
  const value = controlled !== undefined ? controlled : internal;
  const set = React.useCallback(
    (next: T) => {
      if (controlled === undefined) setInternal(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [value, set] as const;
}

/** One visible day: its civil date, its half-open instant bounds, and its events. */
interface DayCell {
  civil: CivilDate;
  key: string;
  /** Midnight in the calendar's zone. */
  start: Date;
  /** Midnight of the following day in the calendar's zone (exclusive). */
  next: Date;
  events: ScheduleEvent[];
}

/**
 * ScheduleCalendar is a day/week/month agenda surface. It uses compact grids on
 * medium+ viewports and a full-label chronological agenda on narrow screens.
 * Recurrence, resources, drag/resize, collision layout, and time-grid editing
 * are intentionally outside this component pending a proven scheduler engine.
 *
 * Every date decision — bucketing, day boundaries, "today", navigation and
 * formatting — happens in the single zone named by `timezone`, defaulting to the
 * host zone. `locale` and `weekStartsOn` are likewise explicit rather than
 * inherited from wherever the component happens to render.
 */
function ScheduleCalendar({
  events,
  view: viewProp,
  defaultView = "month",
  date: dateProp,
  defaultDate,
  timezone,
  locale,
  weekStartsOn = 0,
  onViewChange,
  onDateChange,
  onEventClick,
  onRangeSelect,
  className,
  ...props
}: ScheduleCalendarProps) {
  const [view, setView] = useControllable(viewProp, defaultView, onViewChange);
  const [date, setDate] = useControllable(dateProp, defaultDate ?? new Date(), onDateChange);

  const zone = React.useMemo(() => resolveTimeZone(timezone), [timezone]);
  const cal = React.useMemo(() => createZoneCalendar(zone), [zone]);

  const fmt = React.useCallback(
    (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, { ...opts, timeZone: zone }),
    [locale, zone],
  );

  // Memoised on the instant, not the `Date` object, so the civil date is referentially stable
  // across renders and can be a dependency of the grid below.
  const dateMs = date.getTime();
  const focus = React.useMemo(() => cal.civilOf(new Date(dateMs)), [cal, dateMs]);
  const todayCivil = cal.civilOf(new Date());

  // The visible days, built once and shared by the agenda and the dense grids so the two
  // cannot disagree about which events belong to which day.
  const gridDays = React.useMemo<DayCell[]>(() => {
    const anchor =
      view === "day"
        ? focus
        : view === "week"
          ? civilStartOfWeek(focus, weekStartsOn)
          : civilStartOfWeek({ y: focus.y, mo: focus.mo, d: 1 }, weekStartsOn);
    const count = view === "day" ? 1 : view === "week" ? 7 : 42;
    const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

    return Array.from({ length: count }, (_, i) => {
      const civil = civilAddDays(anchor, i);
      const start = cal.startOf(civil);
      const next = cal.startOf(civilAddDays(civil, 1));
      return {
        civil,
        key: civilKey(civil),
        start,
        next,
        events: sorted.filter(
          (e) => e.start.getTime() < next.getTime() && e.end.getTime() >= start.getTime(),
        ),
      };
    });
  }, [cal, events, view, weekStartsOn, focus]);

  const weekdays = gridDays.slice(0, 7);
  const agendaDays = gridDays.filter((day) => day.events.length > 0);

  const timeLabel = (e: ScheduleEvent) =>
    e.allDay ? "All day" : fmt({ hour: "numeric", minute: "2-digit" }).format(e.start);

  const eventButton = (e: ScheduleEvent) => (
    <li key={e.id}>
      <button
        type="button"
        data-slot="schedule-event"
        onClick={() => onEventClick?.(e)}
        className={cn(
          "flex w-full items-center gap-1.5 truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-left text-xs text-foreground outline-none hover:bg-primary/20 focus-visible:ring-3 focus-visible:ring-ring/50",
          e.color,
        )}
      >
        <span className="tabular-nums text-muted-foreground">{timeLabel(e)}</span>
        <span className="truncate font-medium">{e.title}</span>
      </button>
    </li>
  );

  // period navigation ---------------------------------------------------------
  const go = (dir: -1 | 0 | 1) => {
    if (dir === 0) return setDate(cal.startOf(todayCivil));
    if (view === "month") return setDate(cal.startOf(civilAddMonths(focus, dir)));
    setDate(cal.startOf(civilAddDays(focus, dir * (view === "week" ? 7 : 1))));
  };

  const focusStart = cal.startOf(focus);
  const title =
    view === "month"
      ? fmt({ month: "long", year: "numeric" }).format(focusStart)
      : view === "day"
        ? fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(
            focusStart,
          )
        : `${fmt({ month: "short", day: "numeric" }).format(weekdays[0].start)} – ${fmt({ month: "short", day: "numeric" }).format(weekdays[6].start)}`;

  const weekdayFmt = fmt({ weekday: "short" });

  return (
    <div data-slot="schedule-calendar" className={cn("flex flex-col gap-3", className)} {...props}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => go(-1)} aria-label="Previous">
            <ChevronLeftIcon aria-hidden />
          </Button>
          <Button variant="outline" size="sm" onClick={() => go(0)}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => go(1)} aria-label="Next">
            <ChevronRightIcon aria-hidden />
          </Button>
          <h2 data-slot="schedule-title" className="ms-2 font-heading text-base font-semibold">
            {title}
          </h2>
        </div>
        <SegmentedControl
          size="sm"
          value={view}
          onValueChange={(v) => setView(v as CalendarView)}
          aria-label="Calendar view"
        >
          <SegmentedControlItem value="day">Day</SegmentedControlItem>
          <SegmentedControlItem value="week">Week</SegmentedControlItem>
          <SegmentedControlItem value="month">Month</SegmentedControlItem>
        </SegmentedControl>
      </header>

      <section data-slot="schedule-agenda" className="space-y-3 md:hidden" aria-label={title}>
        {agendaDays.length > 0 ? (
          agendaDays.map((day) => (
            <section key={day.key} aria-labelledby={`agenda-${day.key}`}>
              <h3 id={`agenda-${day.key}`} className="mb-1.5 text-sm font-semibold text-foreground">
                {fmt({ weekday: "long", month: "short", day: "numeric" }).format(day.start)}
              </h3>
              <ul className="space-y-1.5">{day.events.map(eventButton)}</ul>
            </section>
          ))
        ) : (
          <p className="rounded-md border border-border py-8 text-center text-sm text-muted-foreground">
            No events in this period.
          </p>
        )}
      </section>

      {view === "month" && (
        <table
          data-slot="schedule-month"
          className="hidden w-full table-fixed border-separate border-spacing-1 md:table"
          aria-label={`Month of ${title}`}
        >
          <thead>
            <tr>
              {weekdays.map((d) => (
                <th
                  key={d.key}
                  scope="col"
                  className="pb-1 text-xs font-medium text-muted-foreground"
                >
                  {weekdayFmt.format(d.start)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, w) => {
              const row = gridDays.slice(w * 7, w * 7 + 7);
              return (
                <tr key={row[0].key}>
                  {row.map((day) => {
                    const outside = day.civil.mo !== focus.mo || day.civil.y !== focus.y;
                    const today = civilSame(day.civil, todayCivil);
                    return (
                      <td
                        key={day.key}
                        className={cn(
                          "h-24 align-top rounded-md border border-border p-1",
                          outside && "bg-muted/30 text-muted-foreground",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onRangeSelect?.({
                              start: day.start,
                              end: new Date(day.next.getTime() - 1),
                            })
                          }
                          aria-label={fmt({
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          }).format(day.start)}
                          className={cn(
                            "mb-1 flex size-6 items-center justify-center rounded-full text-xs outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                            today &&
                              "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                          )}
                        >
                          {day.civil.d}
                        </button>
                        {day.events.length > 0 && (
                          <ul className="flex flex-col gap-0.5">{day.events.map(eventButton)}</ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {view === "week" && (
        <div data-slot="schedule-week" className="hidden grid-cols-7 gap-1 md:grid">
          {gridDays.map((day) => (
            <section
              key={day.key}
              className="flex min-h-40 flex-col rounded-md border border-border p-1.5"
            >
              <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
                {fmt({ weekday: "short", day: "numeric" }).format(day.start)}
              </h3>
              {day.events.length ? (
                <ul className="flex flex-col gap-1">{day.events.map(eventButton)}</ul>
              ) : (
                <p className="text-xs text-muted-foreground/60">—</p>
              )}
            </section>
          ))}
        </div>
      )}

      {view === "day" && (
        <section
          data-slot="schedule-day"
          className="hidden rounded-md border border-border p-2 md:block"
        >
          {gridDays[0].events.length ? (
            <ul className="flex flex-col gap-1.5">{gridDays[0].events.map(eventButton)}</ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No events.</p>
          )}
        </section>
      )}
    </div>
  );
}

export { ScheduleCalendar };
