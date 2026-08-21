import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { DatePicker, DateRangePicker } from "@/components/pickers/date-picker";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("DatePicker", () => {
  it("renders a trigger whose accessible name is the placeholder", () => {
    render(<DatePicker />);
    expect(screen.getByRole("button", { name: /pick a date/i })).toBeInTheDocument();
  });

  it("supports a custom placeholder", () => {
    render(<DatePicker placeholder="Start date" />);
    expect(screen.getByRole("button", { name: "Start date" })).toBeInTheDocument();
  });

  it("opens the calendar popover on trigger click", async () => {
    render(<DatePicker />);
    fireEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    expect(await screen.findByRole("grid")).toBeInTheDocument();
  });

  it("emits the selected date and closes on selection", async () => {
    const onValueChange = vi.fn();
    render(<DatePicker onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    const dayCells = (await screen.findAllByRole("button")).filter((b) =>
      /^\d+$/.test(b.textContent?.trim() ?? ""),
    );
    fireEvent.click(dayCells[10]);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBeInstanceOf(Date);
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
  });

  it("can be disabled", () => {
    render(<DatePicker disabled />);
    expect(screen.getByRole("button", { name: /pick a date/i })).toBeDisabled();
  });

  it("has no axe violations (closed)", async () => {
    const { container } = render(<DatePicker />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations on the open dialog (including the popover)", async () => {
    render(<DatePicker />);
    fireEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    await screen.findByRole("grid");
    // The Base UI popover role="dialog" now carries an accessible name
    // (aria-label="Choose a date"), so the whole open dialog is axe-clean.
    const dialog = screen.getByRole("dialog");
    expect(await a11y(dialog)).toHaveNoViolations();
  });
});

describe("DateRangePicker", () => {
  it("renders a trigger with the range placeholder", () => {
    render(<DateRangePicker />);
    expect(screen.getByRole("button", { name: /pick a date range/i })).toBeInTheDocument();
  });

  it("opens the range calendar on trigger click", async () => {
    render(<DateRangePicker />);
    fireEvent.click(screen.getByRole("button", { name: /pick a date range/i }));
    expect((await screen.findAllByRole("grid")).length).toBeGreaterThan(0);
  });

  it("has no axe violations (closed)", async () => {
    const { container } = render(<DateRangePicker />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations on the open range dialog (including the popover)", async () => {
    render(<DateRangePicker />);
    fireEvent.click(screen.getByRole("button", { name: /pick a date range/i }));
    await screen.findAllByRole("grid");
    // Dialog now has an accessible name (aria-label="Choose a date range").
    const dialog = screen.getByRole("dialog");
    expect(await a11y(dialog)).toHaveNoViolations();
  });
});
