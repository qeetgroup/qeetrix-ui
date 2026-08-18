import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { DateTimePicker } from "@/components/ui/date-time-picker";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("DateTimePicker", () => {
  it("renders a trigger whose accessible name is the placeholder", () => {
    render(<DateTimePicker />);
    expect(screen.getByRole("button", { name: /pick date & time/i })).toBeInTheDocument();
  });

  it("shows the formatted value when a date is provided", () => {
    render(<DateTimePicker value={new Date(2026, 6, 17, 9, 30)} />);
    // The trigger label is a locale-formatted date+time, not the placeholder.
    expect(screen.queryByRole("button", { name: /pick date & time/i })).not.toBeInTheDocument();
  });

  it("opens a calendar plus a time picker on trigger click", async () => {
    render(<DateTimePicker />);
    fireEvent.click(screen.getByRole("button", { name: /pick date & time/i }));
    expect(await screen.findByRole("grid")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /time/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /hours/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /minutes/i })).toBeInTheDocument();
  });

  it("emits a Date when a day is selected", async () => {
    const onValueChange = vi.fn();
    render(<DateTimePicker onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: /pick date & time/i }));
    const dayCells = (await screen.findAllByRole("button")).filter((b) =>
      /^\d+$/.test(b.textContent?.trim() ?? ""),
    );
    fireEvent.click(dayCells[10]);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBeInstanceOf(Date);
  });

  it("can be disabled", () => {
    render(<DateTimePicker disabled />);
    expect(screen.getByRole("button", { name: /pick date & time/i })).toBeDisabled();
  });

  it("has no axe violations (closed)", async () => {
    const { container } = render(<DateTimePicker />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations on the open dialog (calendar + time-picker)", async () => {
    render(<DateTimePicker />);
    fireEvent.click(screen.getByRole("button", { name: /pick date & time/i }));
    await screen.findByRole("grid");
    // The Base UI popover role="dialog" now carries an accessible name
    // (aria-label="Choose a date and time"), so the whole open dialog —
    // calendar and time-picker included — is axe-clean.
    const dialog = screen.getByRole("dialog");
    expect(await a11y(dialog)).toHaveNoViolations();
  });
});
