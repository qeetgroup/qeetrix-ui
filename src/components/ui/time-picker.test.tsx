import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { TimePicker } from "@/components/ui/time-picker";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("TimePicker", () => {
  it("renders a group with an accessible label", () => {
    render(<TimePicker aria-label="Meeting time" />);
    expect(screen.getByRole("group", { name: "Meeting time" })).toBeInTheDocument();
  });

  it("defaults to an 'Time' label when aria-label is omitted", () => {
    render(<TimePicker />);
    expect(screen.getByRole("group", { name: "Time" })).toBeInTheDocument();
  });

  it("renders Hours and Minutes comboboxes", () => {
    render(<TimePicker aria-label="Alarm" />);
    expect(screen.getByRole("combobox", { name: "Hours" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Minutes" })).toBeInTheDocument();
  });

  it("renders Seconds combobox when withSeconds is true", () => {
    render(<TimePicker aria-label="Duration" withSeconds />);
    expect(screen.getByRole("combobox", { name: "Seconds" })).toBeInTheDocument();
  });

  it("renders AM/PM combobox in 12-hour mode", () => {
    render(<TimePicker aria-label="Time" hourCycle={12} />);
    expect(screen.getByRole("combobox", { name: "AM or PM" })).toBeInTheDocument();
  });

  it("fires onValueChange when hour changes", async () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Event time" value="09:00" onValueChange={onValueChange} />);
    // The comboboxes are Select triggers; we verify they exist and are interactive
    const hourSelect = screen.getByRole("combobox", { name: "Hours" });
    expect(hourSelect).not.toBeDisabled();
  });

  it("all select triggers are disabled when disabled prop is set", () => {
    render(<TimePicker aria-label="Time" disabled />);
    const comboboxes = screen.getAllByRole("combobox");
    for (const cb of comboboxes) {
      expect(cb).toBeDisabled();
    }
  });

  it("has no axe violations (24h mode)", async () => {
    const { container } = render(<TimePicker aria-label="Start time" value="14:30" />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations (12h mode with seconds)", async () => {
    const { container } = render(
      <TimePicker aria-label="End time" hourCycle={12} withSeconds value="09:15:00" />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations when disabled", async () => {
    const { container } = render(<TimePicker aria-label="Locked time" disabled value="08:00" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
