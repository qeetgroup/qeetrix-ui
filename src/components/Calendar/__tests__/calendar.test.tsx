import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Calendar } from "@/components/Calendar/calendar";
import { DirectionProvider } from "@/providers/direction-provider";

/* Fixed dates throughout: `today` and `defaultMonth` are props, so nothing here reads the clock. */
const d = (month: number, day: number) => new Date(2026, month - 1, day);
const TODAY = d(10, 6);
const dayButton = (name: RegExp) => screen.getByRole("button", { name });

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Calendar", () => {
  it("renders the calendar grid", () => {
    render(<Calendar mode="single" />);
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("renders day cells", () => {
    render(<Calendar mode="single" />);
    expect(screen.getAllByRole("gridcell").length).toBeGreaterThan(0);
  });

  it("fires onSelect when a day is clicked", () => {
    const onSelect = vi.fn();
    render(<Calendar mode="single" onSelect={onSelect} />);
    const dayCells = screen
      .getAllByRole("button")
      .filter((btn) => /^\d+$/.test(btn.textContent?.trim() ?? ""));
    fireEvent.click(dayCells[5]);
    expect(onSelect).toHaveBeenCalled();
  });

  it("renders previous/next navigation buttons", () => {
    render(<Calendar mode="single" />);
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Calendar mode="single" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Calendar states", () => {
  it("marks today and the selection on different days, with different signals", () => {
    render(<Calendar mode="single" selected={d(10, 20)} defaultMonth={d(10, 1)} today={TODAY} />);
    const today = dayButton(/^Today, Tuesday, October 6th, 2026$/);
    const selected = dayButton(/October 20th, 2026, selected$/);
    expect(today).toHaveAttribute("data-today", "true");
    expect(today).toHaveAttribute("data-selected-single", "false");
    expect(selected).toHaveAttribute("data-selected-single", "true");
    expect(selected).not.toHaveAttribute("data-today");
  });

  it("can be today and selected at once", () => {
    render(<Calendar mode="single" selected={TODAY} defaultMonth={d(10, 1)} today={TODAY} />);
    const both = dayButton(/^Today, .*October 6th, 2026, selected$/);
    expect(both).toHaveAttribute("data-today", "true");
    expect(both).toHaveAttribute("data-selected-single", "true");
  });

  it("exposes a range's ends and middle", () => {
    render(
      <Calendar
        mode="range"
        selected={{ from: d(10, 8), to: d(10, 10) }}
        defaultMonth={d(10, 1)}
        today={TODAY}
      />,
    );
    expect(dayButton(/October 8th/)).toHaveAttribute("data-range-start", "true");
    expect(dayButton(/October 9th/)).toHaveAttribute("data-range-middle", "true");
    expect(dayButton(/October 10th/)).toHaveAttribute("data-range-end", "true");
  });

  it("disables unavailable days, marks them and says so", () => {
    const onSelect = vi.fn();
    render(
      <Calendar
        mode="single"
        onSelect={onSelect}
        defaultMonth={d(10, 1)}
        today={TODAY}
        unavailable={[d(10, 14)]}
        disabled={{ before: d(10, 3) }}
      />,
    );
    const taken = dayButton(/October 14th, 2026, unavailable$/);
    expect(taken).toBeDisabled();
    expect(taken).toHaveAttribute("data-unavailable", "true");
    // Disabled-but-not-unavailable is named plainly: the two states read differently.
    expect(dayButton(/October 2nd, 2026$/)).toBeDisabled();
    expect(dayButton(/October 2nd, 2026$/)).not.toHaveAttribute("data-unavailable");
    fireEvent.click(taken);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps outside days selectable", () => {
    const onSelect = vi.fn();
    render(<Calendar mode="single" onSelect={onSelect} defaultMonth={d(10, 1)} today={TODAY} />);
    const outside = dayButton(/September 30th, 2026/);
    expect(outside).toHaveAttribute("data-outside", "true");
    fireEvent.click(outside);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("stamps every day with its ISO date, independent of the host locale", () => {
    render(<Calendar mode="single" defaultMonth={d(10, 1)} today={TODAY} />);
    expect(dayButton(/October 6th/)).toHaveAttribute("data-day", "2026-10-06");
  });

  it("renders week numbers as row headers", () => {
    const { container } = render(
      <Calendar mode="single" showWeekNumber defaultMonth={d(10, 1)} today={TODAY} />,
    );
    const rowHeaders = container.querySelectorAll('th[scope="row"]');
    expect(rowHeaders.length).toBeGreaterThan(0);
    expect(container.querySelector('td[scope="row"]')).toBeNull();
  });

  it("has no axe violations with a range, unavailable days and week numbers", async () => {
    const { container } = render(
      <Calendar
        mode="range"
        numberOfMonths={2}
        showWeekNumber
        selected={{ from: d(10, 8), to: d(10, 16) }}
        unavailable={[d(10, 21)]}
        defaultMonth={d(10, 1)}
        today={TODAY}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Calendar locale", () => {
  it("formats every visible label with Intl when given a BCP 47 tag", () => {
    const { container } = render(
      <Calendar mode="single" locale="de-DE" defaultMonth={d(10, 1)} today={d(1, 1)} />,
    );
    expect(screen.getByRole("grid", { name: "Oktober 2026" })).toBeInTheDocument();
    expect(dayButton(/^Dienstag, 6\. Oktober 2026$/)).toHaveTextContent("6");
    expect(container.querySelector("[data-slot=calendar]")).toHaveAttribute("lang", "de-DE");
  });

  it("puts only the day number in a cell, even where Intl appends a unit", () => {
    // `{ day: "numeric" }` is "6日" in Japanese.
    render(<Calendar mode="single" locale="ja-JP" defaultMonth={d(10, 1)} today={d(1, 1)} />);
    expect(dayButton(/2026年10月6日/)).toHaveTextContent(/^6$/);
  });

  it("uses the DirectionProvider's locale when none is passed", () => {
    render(
      <DirectionProvider locale="fr-FR">
        <Calendar mode="single" defaultMonth={d(10, 1)} today={d(1, 1)} />
      </DirectionProvider>,
    );
    expect(screen.getByRole("grid", { name: "octobre 2026" })).toBeInTheDocument();
  });

  it("still accepts a DayPicker locale object", () => {
    render(
      <Calendar mode="single" locale={{ code: "en-GB" }} defaultMonth={d(10, 1)} today={d(1, 1)} />,
    );
    expect(screen.getByRole("grid", { name: /October 2026/ })).toBeInTheDocument();
  });
});

describe("Calendar direction and stability", () => {
  it("mirrors the inline arrow keys under RTL", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DirectionProvider direction="rtl">
        <Calendar mode="single" defaultMonth={d(10, 1)} today={TODAY} />
      </DirectionProvider>,
    );
    expect(container.querySelector("[data-slot=calendar]")).toHaveAttribute("dir", "rtl");
    dayButton(/October 6th/).focus();
    // In RTL the next day is to the left.
    await user.keyboard("{ArrowLeft}");
    expect(dayButton(/October 7th/)).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(dayButton(/October 5th/)).toHaveFocus();
  });

  it("stamps no dir in LTR, so it inherits the document's", () => {
    const { container } = render(<Calendar mode="single" defaultMonth={d(10, 1)} />);
    expect(container.querySelector("[data-slot=calendar]")).not.toHaveAttribute("dir");
  });

  it("keeps its DOM across a parent re-render instead of remounting the grid", () => {
    const { container, rerender } = render(
      <Calendar mode="single" selected={d(10, 6)} defaultMonth={d(10, 1)} today={TODAY} />,
    );
    const root = container.querySelector("[data-slot=calendar]");
    const day = dayButton(/October 9th/);
    rerender(<Calendar mode="single" selected={d(10, 9)} defaultMonth={d(10, 1)} today={TODAY} />);
    expect(container.querySelector("[data-slot=calendar]")).toBe(root);
    expect(dayButton(/October 9th/)).toBe(day);
  });
});
