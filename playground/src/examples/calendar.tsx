import {
  Calendar,
  type DateRangePickerProps,
  ScheduleCalendar,
  type ScheduleEvent,
  type ScheduleWeekday,
  toast,
} from "@qeetrix/ui";
import { type ReactNode, useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select } from "../registry/types";

type DateRange = NonNullable<DateRangePickerProps["value"]>;

/**
 * The scenario's "today", 6 Oct 2026 10:30 IST. Every event and deadline below is a fixed Qeet
 * date (GSTR-3B on the 20th, payroll on the 28th), so the calendars are anchored here — passed as
 * DayPicker's `today` and as the schedule's initial date — instead of to the real clock.
 */
const TODAY = new Date("2026-10-06T10:30:00+05:30");

/** A local calendar day (1-based month): what a day picker selects. */
function day(year: number, month: number, date: number) {
  return new Date(year, month - 1, date);
}

const dayFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" });
const shortDay = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });

function Note({ children }: { children: ReactNode }) {
  return <p className="w-0 min-w-full pt-3 text-sm text-muted-foreground">{children}</p>;
}

/* ── Calendar demos ───────────────────────────────────────────────────────────────────────── */

function GstFilingDemo() {
  const [date, setDate] = useState<Date | undefined>(day(2026, 10, 20));
  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      defaultMonth={day(2026, 10, 1)}
      today={TODAY}
      aria-label="GSTR-3B filing date"
      className="rounded-lg border"
      footer={
        <Note>{date ? `GSTR-3B files on ${dayFormat.format(date)}` : "Pick a filing date."}</Note>
      }
    />
  );
}

function SettlementRangeDemo() {
  const [range, setRange] = useState<DateRange | undefined>({
    from: day(2026, 10, 1),
    to: day(2026, 10, 6),
  });
  return (
    <Calendar
      mode="range"
      numberOfMonths={2}
      selected={range}
      onSelect={setRange}
      defaultMonth={day(2026, 10, 1)}
      today={TODAY}
      aria-label="Settlement window"
      className="rounded-lg border"
      footer={
        <Note>
          {range?.from && range.to
            ? `Settling captures from ${shortDay.format(range.from)} to ${shortDay.format(range.to)}`
            : "Pick the first and last day of the window."}
        </Note>
      }
    />
  );
}

const companyHolidays = [day(2026, 11, 9), day(2026, 11, 10)];
/** Gandhi Jayanti plus the November company holidays. */
const officeHolidays = [day(2026, 10, 2), ...companyHolidays];

function AccessReviewDeadlineDemo() {
  const [date, setDate] = useState<Date | undefined>(day(2026, 10, 30));
  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      today={TODAY}
      defaultMonth={day(2026, 10, 1)}
      startMonth={day(2026, 10, 1)}
      endMonth={day(2026, 12, 1)}
      disabled={[{ before: TODAY }, { dayOfWeek: [0, 6] }]}
      unavailable={companyHolidays}
      aria-label="Access review deadline"
      className="rounded-lg border"
      footer={<Note>Weekdays this quarter only; 9–10 Nov are company holidays.</Note>}
    />
  );
}

function OnCallDaysDemo() {
  const [days, setDays] = useState<Date[] | undefined>([
    day(2026, 10, 6),
    day(2026, 10, 7),
    day(2026, 10, 8),
    day(2026, 10, 9),
  ]);
  return (
    <Calendar
      mode="multiple"
      max={7}
      selected={days}
      onSelect={setDays}
      defaultMonth={day(2026, 10, 1)}
      today={TODAY}
      showWeekNumber
      ISOWeek
      aria-label="Arjun Reddy's on-call days"
      className="rounded-lg border"
      footer={<Note>{`Arjun is on call ${days?.length ?? 0} of 7 days max.`}</Note>}
    />
  );
}

function IncorporationDateDemo() {
  const [date, setDate] = useState<Date | undefined>(day(2014, 6, 12));
  return (
    <Calendar
      mode="single"
      captionLayout="dropdown"
      selected={date}
      onSelect={setDate}
      defaultMonth={day(2014, 6, 1)}
      startMonth={day(1990, 1, 1)}
      endMonth={day(2026, 12, 1)}
      today={TODAY}
      aria-label="Date of incorporation"
      className="rounded-lg border"
    />
  );
}

const calendarControls = {
  mode: select(["single", "range", "multiple"] as const, "single"),
  numberOfMonths: num(1, { min: 1, max: 3, label: "Months" }),
  captionLayout: select(
    ["label", "dropdown", "dropdown-months", "dropdown-years"] as const,
    "label",
  ),
  weekStartsOn: select(["0", "1"] as const, "0", "Week starts on (0 = Sun)"),
  showOutsideDays: bool(true, "Outside days"),
  showWeekNumber: bool(false, "Week numbers"),
  disablePast: bool(false, "Disable past days"),
  unavailable: bool(false, "Unavailable: holidays (2 Oct, 9–10 Nov)"),
  buttonVariant: select(["ghost", "outline"] as const, "ghost", "Nav button variant"),
};

type CalendarPlaygroundProps = {
  mode: "single" | "range" | "multiple";
  numberOfMonths: number;
  captionLayout: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
  weekStartsOn: "0" | "1";
  showOutsideDays: boolean;
  showWeekNumber: boolean;
  disablePast: boolean;
  unavailable: boolean;
  buttonVariant: "ghost" | "outline";
};

function CalendarPlayground(v: CalendarPlaygroundProps) {
  const [single, setSingle] = useState<Date | undefined>(day(2026, 10, 20));
  const [range, setRange] = useState<DateRange | undefined>({
    from: day(2026, 10, 1),
    to: day(2026, 10, 6),
  });
  const [multiple, setMultiple] = useState<Date[] | undefined>([
    day(2026, 10, 6),
    day(2026, 10, 7),
  ]);
  const shared = {
    numberOfMonths: v.numberOfMonths,
    captionLayout: v.captionLayout,
    weekStartsOn: v.weekStartsOn === "1" ? (1 as const) : (0 as const),
    showOutsideDays: v.showOutsideDays,
    showWeekNumber: v.showWeekNumber,
    disabled: v.disablePast ? { before: TODAY } : undefined,
    unavailable: v.unavailable ? officeHolidays : undefined,
    buttonVariant: v.buttonVariant,
    today: TODAY,
    defaultMonth: day(2026, 10, 1),
    startMonth: v.captionLayout === "label" ? undefined : day(2020, 1, 1),
    endMonth: v.captionLayout === "label" ? undefined : day(2027, 12, 1),
    className: "rounded-lg border",
  };
  if (v.mode === "range") {
    return <Calendar mode="range" selected={range} onSelect={setRange} {...shared} />;
  }
  if (v.mode === "multiple") {
    return <Calendar mode="multiple" selected={multiple} onSelect={setMultiple} {...shared} />;
  }
  return <Calendar mode="single" selected={single} onSelect={setSingle} {...shared} />;
}

/* ── ScheduleCalendar ─────────────────────────────────────────────────────────────────────── */

/** An instant at an IST wall-clock time in October 2026 (or later months). */
function ist(month: number, date: number, time = "00:00") {
  return new Date(
    `2026-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}T${time}:00+05:30`,
  );
}

function allDay(id: string, month: number, date: number, title: string, color?: string) {
  return {
    id,
    start: ist(month, date),
    end: ist(month, date, "23:59"),
    title,
    color,
    allDay: true,
  } satisfies ScheduleEvent;
}

function timed(
  id: string,
  month: number,
  date: number,
  from: string,
  to: string,
  title: string,
  color?: string,
) {
  return { id, start: ist(month, date, from), end: ist(month, date, to), title, color };
}

const deadline = "bg-warning-subtle hover:bg-warning-subtle";
const customer = "bg-info-subtle hover:bg-info-subtle";
const ops = "bg-destructive-subtle hover:bg-destructive-subtle";
const people = "bg-success-subtle hover:bg-success-subtle";
const holiday = "bg-muted hover:bg-muted";

const scheduleEvents: ScheduleEvent[] = [
  allDay("evt_gandhi", 10, 2, "Gandhi Jayanti · offices closed", holiday),
  timed("evt_onb_kanpur", 10, 5, "11:00", "12:00", "Onboarding call · Kanpur Logistics", customer),
  timed("evt_oncall_1", 10, 6, "09:30", "10:00", "On-call handover · Priya → Arjun"),
  timed("evt_soc2", 10, 6, "15:00", "17:00", "SOC 2 Type II audit walkthrough"),
  timed("evt_access_review", 10, 7, "10:00", "11:00", "Q3 access review kick-off"),
  timed("evt_recon", 10, 8, "16:00", "17:00", "Qeet Pay settlement reconciliation"),
  {
    id: "evt_maint",
    start: ist(10, 10, "23:30"),
    end: ist(10, 11, "02:00"),
    title: "Maintenance · Postgres 17 upgrade (ap-south-1)",
    color: ops,
  },
  allDay("evt_gstr1", 10, 11, "GSTR-1 due (September)", deadline),
  timed("evt_oncall_2", 10, 12, "09:30", "10:00", "On-call handover · Arjun → Sanjay"),
  timed("evt_onb_lotus", 10, 14, "14:00", "15:00", "Onboarding call · Lotus Education", customer),
  timed("evt_passkeys", 10, 15, "11:00", "12:00", "Passkey rollout review"),
  timed("evt_oncall_3", 10, 19, "09:30", "10:00", "On-call handover · Sanjay → Priya"),
  allDay("evt_gstr3b", 10, 20, "GSTR-3B due (September)", deadline),
  timed("evt_release", 10, 22, "18:00", "19:00", "Release · Qeet ID 4.2 (SCIM groups)"),
  timed("evt_oncall_4", 10, 26, "09:30", "10:00", "On-call handover · Priya → Rohan"),
  allDay("evt_payroll", 10, 28, "Payroll run · October", people),
  timed("evt_freeze", 10, 30, "15:00", "16:00", "SOC 2 evidence freeze"),
  allDay("evt_tds", 10, 31, "TDS return (Q2) due", deadline),
  allDay("evt_invoice", 11, 2, "QP-INV-2026-00412 due", deadline),
];

const eventTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function announceEvent(event: ScheduleEvent) {
  toast(event.title, {
    description: event.allDay ? "All day" : `${eventTime.format(event.start)} IST`,
  });
}

const scheduleControls = {
  defaultView: select(["month", "week", "day"] as const, "month", "Initial view"),
  weekStartsOn: select(["0", "1"] as const, "1", "Week starts on (0 = Sun)"),
  timezone: select(
    ["Asia/Kolkata", "UTC", "Europe/London", "America/New_York", "Pacific/Auckland"] as const,
    "Asia/Kolkata",
  ),
  locale: select(["en-IN", "en-US", "en-GB", "hi-IN"] as const, "en-IN"),
  withEvents: bool(true, "With events"),
};

export const examples: FamilyExamples = {
  calendar: {
    layout: "wide",
    minHeight: 1900,
    demos: [
      {
        name: "Single date",
        description: "A GST filing date, with the selection echoed in the footer (a live region).",
        render: () => <GstFilingDemo />,
      },
      {
        name: "Range, two months",
        render: () => <SettlementRangeDemo />,
      },
      {
        name: "Disabled and unavailable days",
        description:
          "Past days and weekends are disabled, holidays are `unavailable` (struck through); navigation stops at October and December.",
        render: () => <AccessReviewDeadlineDemo />,
      },
      {
        name: "Multiple, with ISO week numbers",
        description: "`max` caps the selection at seven on-call days.",
        render: () => <OnCallDaysDemo />,
      },
      {
        name: "Dropdown caption",
        description: "Month and year dropdowns for dates far from today.",
        render: () => <IncorporationDateDemo />,
      },
    ],
    playground: definePlayground({
      controls: calendarControls,
      render: (v) => <CalendarPlayground key={v.mode} {...v} />,
      code: (v) => {
        const setter = { single: "setDate", range: "setRange", multiple: "setDays" }[v.mode];
        const state = { single: "date", range: "range", multiple: "days" }[v.mode];
        return jsx("Calendar", {
          mode: v.mode,
          selected: expr(state),
          onSelect: expr(setter),
          numberOfMonths: v.numberOfMonths === 1 ? undefined : v.numberOfMonths,
          captionLayout: v.captionLayout === "label" ? undefined : v.captionLayout,
          startMonth: v.captionLayout === "label" ? undefined : expr("new Date(2020, 0)"),
          endMonth: v.captionLayout === "label" ? undefined : expr("new Date(2027, 11)"),
          weekStartsOn: v.weekStartsOn === "1" ? 1 : undefined,
          showOutsideDays: v.showOutsideDays ? undefined : expr("false"),
          showWeekNumber: v.showWeekNumber,
          disabled: v.disablePast ? expr("{ before: new Date() }") : undefined,
          unavailable: v.unavailable ? expr("holidays") : undefined,
          buttonVariant: v.buttonVariant === "ghost" ? undefined : v.buttonVariant,
          className: "rounded-lg border",
        });
      },
    }),
  },

  "schedule-calendar": {
    layout: "wide",
    minHeight: 1400,
    demos: [
      {
        name: "Month",
        description:
          "October 2026 in IST. Click an event for its details; all-day deadlines are tinted.",
        render: () => (
          <ScheduleCalendar
            events={scheduleEvents}
            defaultDate={TODAY}
            timezone="Asia/Kolkata"
            locale="en-IN"
            weekStartsOn={1}
            onEventClick={announceEvent}
          />
        ),
      },
      {
        name: "Week",
        description: "The maintenance window crosses midnight, so it shows on Saturday and Sunday.",
        render: () => (
          <ScheduleCalendar
            events={scheduleEvents}
            defaultView="week"
            defaultDate={ist(10, 10, "12:00")}
            timezone="Asia/Kolkata"
            locale="en-IN"
            weekStartsOn={1}
            onEventClick={announceEvent}
          />
        ),
      },
      {
        name: "Day",
        render: () => (
          <ScheduleCalendar
            events={scheduleEvents}
            defaultView="day"
            defaultDate={TODAY}
            timezone="Asia/Kolkata"
            locale="en-IN"
            onEventClick={announceEvent}
          />
        ),
      },
      {
        name: "Empty",
        render: () => (
          <ScheduleCalendar
            events={[]}
            defaultView="day"
            defaultDate={ist(10, 4, "12:00")}
            timezone="Asia/Kolkata"
            locale="en-IN"
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: scheduleControls,
      render: (v) => (
        <div className="w-[min(64rem,90vw)]">
          <ScheduleCalendar
            key={v.defaultView}
            events={v.withEvents ? scheduleEvents : []}
            defaultView={v.defaultView}
            defaultDate={TODAY}
            timezone={v.timezone}
            locale={v.locale}
            weekStartsOn={Number(v.weekStartsOn) as ScheduleWeekday}
            onEventClick={announceEvent}
          />
        </div>
      ),
      code: (v) =>
        jsx("ScheduleCalendar", {
          events: v.withEvents ? expr("events") : expr("[]"),
          defaultView: v.defaultView === "month" ? undefined : v.defaultView,
          defaultDate: expr('new Date("2026-10-06T10:30:00+05:30")'),
          timezone: v.timezone,
          locale: v.locale,
          weekStartsOn: v.weekStartsOn === "0" ? undefined : 1,
          onEventClick: expr("(event) => openEvent(event.id)"),
        }),
    }),
  },
};
