import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Calendar } from "@/components/Calendar/calendar";

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
