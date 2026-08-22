"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/actions/button";
import { SegmentedControl, SegmentedControlItem } from "@/components/actions/segmented-control";
import { cn } from "@/lib/utils";

export type CalendarView = "day" | "week" | "month";

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
  /** The focused period. */
  date?: Date;
  defaultDate?: Date;
  /** IANA timezone for formatting (defaults to the browser's). */
  timezone?: string;
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: ScheduleEvent) => void;
  onRangeSelect?: (range: { start: Date; end: Date }) => void;
}

// ---- date helpers (native; no date-fns dependency) --------------------------
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
};
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 7) % 7)); // Sunday-first
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

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

/**
 * ScheduleCalendar is a day/week/month agenda surface. It uses compact grids on
 * medium+ viewports and a full-label chronological agenda on narrow screens.
 * Recurrence, resources, drag/resize, collision layout, and time-grid editing
 * are intentionally outside this component pending a proven scheduler engine.
 */
function ScheduleCalendar({
  events,
  view: viewProp,
  defaultView = "month",
  date: dateProp,
  defaultDate,
  timezone,
  onViewChange,
  onDateChange,
  onEventClick,
  onRangeSelect,
  className,
  ...props
}: ScheduleCalendarProps) {
  const [view, setView] = useControllable(viewProp, defaultView, onViewChange);
  const [date, setDate] = useControllable(
    dateProp,
    defaultDate ?? startOfDay(new Date()),
    onDateChange,
  );

  const fmt = React.useCallback(
    (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(undefined, timezone ? { ...opts, timeZone: timezone } : opts),
    [timezone],
  );

  const eventsForDay = React.useCallback(
    (day: Date) =>
      events
        .filter((e) => e.start <= endOfDay(day) && e.end >= startOfDay(day))
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [events],
  );

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
  const step = view === "month" ? 0 : view === "week" ? 7 : 1;
  const go = (dir: -1 | 0 | 1) => {
    if (dir === 0) return setDate(startOfDay(new Date()));
    if (view === "month") setDate(new Date(date.getFullYear(), date.getMonth() + dir, 1));
    else setDate(addDays(date, dir * step));
  };

  const title =
    view === "month"
      ? fmt({ month: "long", year: "numeric" }).format(date)
      : view === "day"
        ? fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date)
        : `${fmt({ month: "short", day: "numeric" }).format(startOfWeek(date))} – ${fmt({ month: "short", day: "numeric" }).format(addDays(startOfWeek(date), 6))}`;

  const weekdayFmt = fmt({ weekday: "short" });
  const weekStart = startOfWeek(date);
  const weekdays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const agendaStart =
    view === "day"
      ? startOfDay(date)
      : view === "week"
        ? weekStart
        : startOfWeek(startOfMonth(date));
  const agendaDayCount = view === "day" ? 1 : view === "week" ? 7 : 42;
  const agendaDays = Array.from({ length: agendaDayCount }, (_, index) =>
    addDays(agendaStart, index),
  )
    .map((day) => ({ day, events: eventsForDay(day) }))
    .filter(({ events: dayEvents }) => dayEvents.length > 0);

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
          agendaDays.map(({ day, events: dayEvents }) => (
            <section key={day.toISOString()} aria-labelledby={`agenda-${day.toISOString()}`}>
              <h3
                id={`agenda-${day.toISOString()}`}
                className="mb-1.5 text-sm font-semibold text-foreground"
              >
                {fmt({ weekday: "long", month: "short", day: "numeric" }).format(day)}
              </h3>
              <ul className="space-y-1.5">{dayEvents.map(eventButton)}</ul>
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
                  key={d.toISOString()}
                  scope="col"
                  className="pb-1 text-xs font-medium text-muted-foreground"
                >
                  {weekdayFmt.format(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, w) => {
              const rowStart = addDays(startOfWeek(startOfMonth(date)), w * 7);
              return (
                <tr key={rowStart.toISOString()}>
                  {Array.from({ length: 7 }, (_, i) => {
                    const day = addDays(rowStart, i);
                    const outside = day.getMonth() !== date.getMonth();
                    const today = isSameDay(day, new Date());
                    const dayEvents = eventsForDay(day);
                    return (
                      <td
                        key={day.toISOString()}
                        className={cn(
                          "h-24 align-top rounded-md border border-border p-1",
                          outside && "bg-muted/30 text-muted-foreground",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onRangeSelect?.({ start: startOfDay(day), end: endOfDay(day) })
                          }
                          aria-label={fmt({
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          }).format(day)}
                          className={cn(
                            "mb-1 flex size-6 items-center justify-center rounded-full text-xs outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                            today &&
                              "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                          )}
                        >
                          {day.getDate()}
                        </button>
                        {dayEvents.length > 0 && (
                          <ul className="flex flex-col gap-0.5">{dayEvents.map(eventButton)}</ul>
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
          {weekdays.map((day) => {
            const dayEvents = eventsForDay(day);
            return (
              <section
                key={day.toISOString()}
                className="flex min-h-40 flex-col rounded-md border border-border p-1.5"
              >
                <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {fmt({ weekday: "short", day: "numeric" }).format(day)}
                </h3>
                {dayEvents.length ? (
                  <ul className="flex flex-col gap-1">{dayEvents.map(eventButton)}</ul>
                ) : (
                  <p className="text-xs text-muted-foreground/60">—</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {view === "day" && (
        <section
          data-slot="schedule-day"
          className="hidden rounded-md border border-border p-2 md:block"
        >
          {(() => {
            const dayEvents = eventsForDay(date);
            return dayEvents.length ? (
              <ul className="flex flex-col gap-1.5">{dayEvents.map(eventButton)}</ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No events.</p>
            );
          })()}
        </section>
      )}
    </div>
  );
}

export { ScheduleCalendar };
