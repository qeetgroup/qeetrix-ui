import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ScheduleCalendar, type ScheduleEvent } from "@/components/Calendar/schedule-calendar";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const events: ScheduleEvent[] = [
  {
    id: "1",
    title: "Standup",
    start: new Date(2026, 6, 10, 9, 0),
    end: new Date(2026, 6, 10, 10, 0),
  },
  {
    id: "2",
    title: "Review",
    start: new Date(2026, 6, 15, 14, 0),
    end: new Date(2026, 6, 15, 15, 0),
  },
];
const defaultDate = new Date(2026, 6, 10); // Fri 10 Jul 2026

describe("ScheduleCalendar", () => {
  it("renders the month grid with events", () => {
    render(<ScheduleCalendar events={events} defaultDate={defaultDate} />);
    const month = screen.getByRole("table", { name: /Month of July 2026/ });
    expect(month).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(within(month).getByRole("button", { name: /Standup/ })).toBeInTheDocument();
  });

  it("fires onEventClick and onRangeSelect", () => {
    const onEventClick = vi.fn();
    const onRangeSelect = vi.fn();
    render(
      <ScheduleCalendar
        events={events}
        defaultDate={defaultDate}
        onEventClick={onEventClick}
        onRangeSelect={onRangeSelect}
      />,
    );
    const month = screen.getByRole("table", { name: /Month of July 2026/ });
    fireEvent.click(within(month).getByRole("button", { name: /Standup/ }));
    expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));

    fireEvent.click(within(month).getByRole("button", { name: /July 10/ }));
    expect(onRangeSelect).toHaveBeenCalledTimes(1);
  });

  it("switches views via the segmented control", () => {
    const { container } = render(<ScheduleCalendar events={events} defaultDate={defaultDate} />);
    fireEvent.click(screen.getByRole("radio", { name: "Day" }));
    // day view shows the focused day's events, no month table
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const day = container.querySelector('[data-slot="schedule-day"]');
    expect(day).not.toBeNull();
    expect(within(day as HTMLElement).getByRole("button", { name: /Standup/ })).toBeInTheDocument();
  });

  it("renders a complete mobile agenda and keeps dense grids desktop-only", () => {
    const { container } = render(
      <ScheduleCalendar events={events} defaultDate={defaultDate} defaultView="week" />,
    );

    const agenda = container.querySelector('[data-slot="schedule-agenda"]');
    const week = container.querySelector('[data-slot="schedule-week"]');

    expect(agenda).toHaveClass("md:hidden");
    expect(agenda).toHaveTextContent("Standup");
    expect(week).toHaveClass("hidden", "md:grid");
  });

  it("has no axe violations", async () => {
    const { container } = render(<ScheduleCalendar events={events} defaultDate={defaultDate} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/* ── One calendar, one time zone (I18N-001) ────────────────────────────────────────────────
 * Boundaries used to be computed with the host's `Date` accessors while labels were formatted
 * in the requested zone, so a single grid ran on two zone models. The tell is internal: a day
 * cell's visible number came from the host zone and its accessible name from the requested one,
 * and the two could name different days.
 *
 * The assertions below deliberately key off the **visible** day numbers, which is the half the
 * old code took from the host. Two requested zones 25 hours apart are used so the result does
 * not depend on which zone the worker happens to be in; `schedule-calendar.timezone.test.tsx`
 * pins the host-versus-requested case directly.
 */

/** 2026-07-11 10:30 in Pacific/Kiritimati (UTC+14); 2026-07-10 09:30 in Pacific/Niue (UTC−11). */
const CROSSING_INSTANT = new Date("2026-07-10T20:30:00Z");
const crossing: ScheduleEvent[] = [
  {
    id: "z",
    title: "Launch",
    start: CROSSING_INSTANT,
    end: new Date(CROSSING_INSTANT.getTime() + 3_600_000),
  },
];

const monthTable = () => screen.getByRole("table", { name: /Month of/ });

/** Each day cell as `[visible number, day named in its accessible name]`. */
function dayNumberVsAccessibleName(): Array<[string, string]> {
  return Array.from(monthTable().querySelectorAll("td")).map((td) => {
    const button = td.querySelector("button") as HTMLButtonElement;
    const label = button.getAttribute("aria-label") ?? "";
    return [button.textContent?.trim() ?? "", label.match(/(\d+)$/)?.[1] ?? ""];
  });
}

const cellNamed = (name: RegExp) =>
  within(monthTable()).getByRole("button", { name }).closest("td") as HTMLElement;

describe("ScheduleCalendar time zone", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(["Pacific/Kiritimati", "Pacific/Niue", "UTC"])(
    "labels every cell with the day it actually shows (%s)",
    (timezone) => {
      render(
        <ScheduleCalendar
          events={crossing}
          date={CROSSING_INSTANT}
          timezone={timezone}
          locale="en-US"
        />,
      );
      for (const [visible, named] of dayNumberVsAccessibleName()) {
        expect(named).toBe(visible);
      }
    },
  );

  it("buckets one instant onto the day it falls on in the requested zone", () => {
    const { unmount } = render(
      <ScheduleCalendar
        events={crossing}
        date={CROSSING_INSTANT}
        timezone="Pacific/Kiritimati"
        locale="en-US"
      />,
    );
    expect(
      within(cellNamed(/, July 11$/)).getByRole("button", { name: /Launch/ }),
    ).toBeInTheDocument();
    expect(within(cellNamed(/, July 10$/)).queryByRole("button", { name: /Launch/ })).toBeNull();
    unmount();

    render(
      <ScheduleCalendar
        events={crossing}
        date={CROSSING_INSTANT}
        timezone="Pacific/Niue"
        locale="en-US"
      />,
    );
    expect(
      within(cellNamed(/, July 10$/)).getByRole("button", { name: /Launch/ }),
    ).toBeInTheDocument();
    expect(within(cellNamed(/, July 11$/)).queryByRole("button", { name: /Launch/ })).toBeNull();
  });

  it("formats the event time in the same zone it bucketed it into", () => {
    const { unmount } = render(
      <ScheduleCalendar
        events={crossing}
        date={CROSSING_INSTANT}
        timezone="Pacific/Kiritimati"
        locale="en-US"
      />,
    );
    expect(within(monthTable()).getByRole("button", { name: /Launch/ })).toHaveTextContent(
      "10:30 AM",
    );
    unmount();

    render(
      <ScheduleCalendar
        events={crossing}
        date={CROSSING_INSTANT}
        timezone="Pacific/Niue"
        locale="en-US"
      />,
    );
    expect(within(monthTable()).getByRole("button", { name: /Launch/ })).toHaveTextContent(
      "9:30 AM",
    );
  });

  it("marks today by the requested zone's calendar, not the host's", () => {
    vi.useFakeTimers({ now: CROSSING_INSTANT, shouldAdvanceTime: true });
    const highlighted = () =>
      Array.from(monthTable().querySelectorAll("td button"))
        .filter((b) => b.className.includes("bg-primary"))
        .map((b) => b.textContent?.trim());

    const { unmount } = render(
      <ScheduleCalendar events={[]} timezone="Pacific/Kiritimati" locale="en-US" />,
    );
    expect(highlighted()).toEqual(["11"]);
    unmount();

    render(<ScheduleCalendar events={[]} timezone="Pacific/Niue" locale="en-US" />);
    expect(highlighted()).toEqual(["10"]);
  });

  it("selects a range from midnight to midnight in the requested zone", () => {
    const onRangeSelect = vi.fn();
    render(
      <ScheduleCalendar
        events={[]}
        date={new Date("2026-07-10T03:00:00Z")}
        timezone="Asia/Tokyo"
        locale="en-US"
        onRangeSelect={onRangeSelect}
      />,
    );
    fireEvent.click(within(monthTable()).getByRole("button", { name: /, July 11$/ }));
    const { start, end } = onRangeSelect.mock.calls[0][0];
    expect(start.toISOString()).toBe("2026-07-10T15:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-11T14:59:59.999Z");
  });

  it("keeps day boundaries on the wall clock across a DST transition", () => {
    // America/New_York springs forward at 02:00 on 2026-03-08, so that local day is 23 hours
    // long: it begins at 05:00Z and the next begins at 04:00Z.
    const onRangeSelect = vi.fn();
    render(
      <ScheduleCalendar
        events={[]}
        date={new Date("2026-03-10T12:00:00Z")}
        timezone="America/New_York"
        locale="en-US"
        onRangeSelect={onRangeSelect}
      />,
    );
    fireEvent.click(within(monthTable()).getByRole("button", { name: /, March 8$/ }));
    expect(onRangeSelect.mock.calls[0][0].start.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(onRangeSelect.mock.calls[0][0].end.toISOString()).toBe("2026-03-09T03:59:59.999Z");

    fireEvent.click(within(monthTable()).getByRole("button", { name: /, March 9$/ }));
    expect(onRangeSelect.mock.calls[1][0].start.toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });

  it("navigates to midnight in the requested zone", () => {
    const onDateChange = vi.fn();
    render(
      <ScheduleCalendar
        events={[]}
        date={new Date("2026-07-10T03:00:00Z")}
        defaultView="week"
        timezone="Asia/Tokyo"
        locale="en-US"
        onDateChange={onDateChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onDateChange.mock.calls[0][0].toISOString()).toBe("2026-07-16T15:00:00.000Z");
  });

  it("falls back to the host zone for an unrecognised time zone instead of throwing", () => {
    expect(() =>
      render(<ScheduleCalendar events={crossing} date={CROSSING_INSTANT} timezone="Not/AZone" />),
    ).not.toThrow();
    expect(monthTable()).toBeInTheDocument();
  });
});

describe("ScheduleCalendar locale and week start", () => {
  it("formats labels in the requested locale", () => {
    render(
      <ScheduleCalendar
        events={[]}
        date={new Date("2026-07-10T12:00:00Z")}
        locale="de-DE"
        timezone="UTC"
      />,
    );
    expect(screen.getByRole("table", { name: /Juli 2026/ })).toBeInTheDocument();
  });

  it("starts the week on the requested day", () => {
    const { unmount } = render(
      <ScheduleCalendar events={[]} date={defaultDate} locale="en-US" timezone="UTC" />,
    );
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Sun");
    unmount();

    render(
      <ScheduleCalendar
        events={[]}
        date={defaultDate}
        locale="en-US"
        timezone="UTC"
        weekStartsOn={1}
      />,
    );
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Mon");
  });
});

/*
 * The host zone versus the requested zone.
 *
 * `schedule-calendar.test.tsx` proves the grid is internally consistent by comparing two
 * requested zones, which holds whatever zone the worker runs in. This file pins the other half:
 * that a requested zone overrides the *host* zone rather than being mixed with it.
 *
 * The host zone is set by assigning `process.env.TZ` before the first `Date` or `Intl` call.
 * Node re-resolves its zone on the next call, which is the only way to control the host zone
 * from inside a test — vitest exposes no per-file zone option, and injecting a formatter would
 * only exercise the formatting half, not the bucketing half that was actually wrong. It is
 * restored in `afterAll` so the worker is left as it was found. This is the only `process.env`
 * reference in `src/`, and it never reaches the published build: tests are excluded from
 * `tsconfig.build.json`.
 *
 * Note what does *not* discriminate here. The pre-fix component shifted every cell's label
 * relative to its number by the host-to-requested offset, consistently — so "the cell labelled
 * July 11 holds the event" was true before the fix as well. What was never true is that a
 * cell's number and its accessible name name the same day, or that an emitted `Date` is
 * midnight in the requested zone. Those are the assertions below.
 */
const HOST_ZONE = "Pacific/Niue"; // UTC−11
const REQUESTED = "Pacific/Kiritimati"; // UTC+14 — 25 hours from the host

const dayButtons = () => Array.from(monthTable().querySelectorAll("td button[aria-label]"));

describe("ScheduleCalendar with a host zone that differs from the requested zone", () => {
  let originalTz: string | undefined;

  beforeAll(() => {
    originalTz = process.env.TZ;
    process.env.TZ = HOST_ZONE;
  });

  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it("has actually taken the host zone override", () => {
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("Pacific/Niue");
    expect(CROSSING_INSTANT.getDate()).toBe(10); // host-local day, one behind the requested zone
  });

  it("gives every cell the same day in its number and in its accessible name", () => {
    render(
      <ScheduleCalendar
        events={crossing}
        date={CROSSING_INSTANT}
        timezone={REQUESTED}
        locale="en-US"
      />,
    );
    for (const button of dayButtons()) {
      const named = button.getAttribute("aria-label")?.match(/(\d+)$/)?.[1];
      expect(named).toBe(button.textContent?.trim());
    }
  });

  it("emits midnight in the requested zone, not host midnight", () => {
    const onRangeSelect = vi.fn();
    render(
      <ScheduleCalendar
        events={crossing}
        date={CROSSING_INSTANT}
        timezone={REQUESTED}
        locale="en-US"
        onRangeSelect={onRangeSelect}
      />,
    );
    fireEvent.click(within(monthTable()).getByRole("button", { name: /, July 11$/ }));
    const { start, end } = onRangeSelect.mock.calls[0][0];
    expect(start.toISOString()).toBe("2026-07-10T10:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-11T09:59:59.999Z");
  });

  it("marks the requested zone's today, which is one day ahead of the host's", () => {
    vi.useFakeTimers({ now: CROSSING_INSTANT, shouldAdvanceTime: true });
    render(<ScheduleCalendar events={[]} timezone={REQUESTED} locale="en-US" />);
    const highlighted = dayButtons()
      .filter((b) => b.className.includes("bg-primary"))
      .map((b) => b.textContent?.trim());
    expect(highlighted).toEqual(["11"]);
  });

  it("buckets the event on the requested zone's day", () => {
    render(
      <ScheduleCalendar
        events={crossing}
        date={CROSSING_INSTANT}
        timezone={REQUESTED}
        locale="en-US"
      />,
    );
    const cell = within(monthTable())
      .getByRole("button", { name: /, July 11$/ })
      .closest("td") as HTMLElement;
    expect(within(cell).getByRole("button", { name: /Launch/ })).toBeInTheDocument();
    expect(within(cell).getByRole("button", { name: /Launch/ })).toHaveTextContent("10:30 AM");
  });

  it("still uses the host zone when no zone is requested", () => {
    render(<ScheduleCalendar events={crossing} date={CROSSING_INSTANT} locale="en-US" />);
    const cell = within(monthTable())
      .getByRole("button", { name: /, July 10$/ })
      .closest("td") as HTMLElement;
    expect(within(cell).getByRole("button", { name: /Launch/ })).toBeInTheDocument();
    expect(within(cell).getByRole("button", { name: /Launch/ })).toHaveTextContent("9:30 AM");
  });
});
