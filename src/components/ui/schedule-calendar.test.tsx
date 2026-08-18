import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ScheduleCalendar, type ScheduleEvent } from "@/components/ui/schedule-calendar";

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
