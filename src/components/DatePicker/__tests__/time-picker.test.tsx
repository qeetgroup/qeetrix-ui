import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { TimePicker } from "@/components/DatePicker/time-picker";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

/** The minute column's rendered option labels, in order. */
async function minuteOptions(): Promise<string[]> {
  fireEvent.click(screen.getByRole("combobox", { name: "Minutes" }));
  const list = await screen.findByRole("listbox");
  return Array.from(list.querySelectorAll('[role="option"]')).map((o) => o.textContent ?? "");
}

const everyMinute = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

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

/*
 * `minuteStep` normalisation (INPUT-001).
 *
 * A `0` or negative step used to make the option loop non-terminating. There is no way to
 * observe a non-terminating synchronous render from inside the same worker — a timer cannot
 * interrupt it — so a regression here surfaces as a hung test file rather than a failed
 * assertion. The assertions below therefore pin the normalised *result*; the hang is what they
 * prevent, not what they report.
 */
describe("TimePicker minuteStep normalisation", () => {
  it("treats a zero step as every minute instead of looping forever", async () => {
    render(<TimePicker aria-label="Time" value="09:00" minuteStep={0} />);
    expect(await minuteOptions()).toEqual(everyMinute);
  });

  it("treats a negative step as every minute", async () => {
    render(<TimePicker aria-label="Time" value="09:00" minuteStep={-5} />);
    expect(await minuteOptions()).toEqual(everyMinute);
  });

  it("treats NaN and Infinity as every minute rather than a one-option column", async () => {
    const { unmount } = render(
      <TimePicker aria-label="Time" value="09:00" minuteStep={Number.NaN} />,
    );
    expect(await minuteOptions()).toEqual(everyMinute);
    unmount();

    render(<TimePicker aria-label="Time" value="09:00" minuteStep={Number.POSITIVE_INFINITY} />);
    expect(await minuteOptions()).toEqual(everyMinute);
  });

  it("never emits a fractional minute label", async () => {
    render(<TimePicker aria-label="Time" value="09:00" minuteStep={0.1} />);
    const options = await minuteOptions();
    expect(options).toEqual(everyMinute);
    expect(options.some((o) => o.includes("."))).toBe(false);
  });

  it("rounds a fractional step to the nearest whole minute", async () => {
    render(<TimePicker aria-label="Time" value="09:00" minuteStep={7.4} />);
    expect(await minuteOptions()).toEqual(["00", "07", "14", "21", "28", "35", "42", "49", "56"]);
  });

  it("clamps a step above 30 so the column keeps more than one option", async () => {
    render(<TimePicker aria-label="Time" value="09:00" minuteStep={90} />);
    expect(await minuteOptions()).toEqual(["00", "30"]);
  });

  it("honours a valid divisor exactly", async () => {
    render(<TimePicker aria-label="Time" value="09:15" minuteStep={15} />);
    expect(await minuteOptions()).toEqual(["00", "15", "30", "45"]);
  });
});

describe("TimePicker off-grid values", () => {
  it("offers the current minute when a non-divisor step steps over it", async () => {
    render(<TimePicker aria-label="Time" value="09:05" minuteStep={7} />);
    expect(await minuteOptions()).toEqual([
      "00",
      "05",
      "07",
      "14",
      "21",
      "28",
      "35",
      "42",
      "49",
      "56",
    ]);
  });

  it("displays its own value rather than an empty minute column", () => {
    render(<TimePicker aria-label="Time" value="09:05" minuteStep={7} />);
    expect(screen.getByRole("combobox", { name: "Minutes" })).toHaveTextContent("05");
  });

  it("adds nothing when the current minute is already on the grid", async () => {
    render(<TimePicker aria-label="Time" value="09:15" minuteStep={15} />);
    expect(await minuteOptions()).toHaveLength(4);
  });

  it("adds the off-grid minute after the step has been clamped", async () => {
    render(<TimePicker aria-label="Time" value="10:07" minuteStep={90} />);
    expect(await minuteOptions()).toEqual(["00", "07", "30"]);
  });

  it("ignores an out-of-range minute rather than rendering it as an option", async () => {
    render(<TimePicker aria-label="Time" value="09:99" minuteStep={30} />);
    expect(await minuteOptions()).toEqual(["00", "30"]);
  });

  it("emits an on-grid minute once the user picks one", async () => {
    const onValueChange = vi.fn();
    render(
      <TimePicker aria-label="Time" value="09:05" minuteStep={7} onValueChange={onValueChange} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: "Minutes" }));
    const list = await screen.findByRole("listbox");
    const option = Array.from(list.querySelectorAll('[role="option"]')).find(
      (o) => o.textContent === "14",
    );
    await user.click(option as Element);
    expect(onValueChange).toHaveBeenCalledWith("09:14");
  });
});

/*
 * What the columns actually emit (TEST-002).
 *
 * The test this replaces was called "fires onValueChange when hour changes" and asserted that
 * the hour trigger was not disabled — it could not fail if the component emitted nothing, the
 * wrong string, or the wrong hour cycle. These drive the Select and assert the emitted value,
 * which is the component's whole contract: a canonical 24h string whatever the display.
 */
async function pick(column: string, label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: column }));
  const list = await screen.findByRole("listbox");
  const option = Array.from(list.querySelectorAll('[role="option"]')).find(
    (o) => o.textContent === label,
  );
  await user.click(option as Element);
}

/** Digits only — the Select trigger's text includes the chevron's own text fallback. */
const shown = (column: string) =>
  (screen.getByRole("combobox", { name: column }).textContent ?? "").replace(/\D/g, "");

describe("TimePicker emitted value", () => {
  it("emits the new hour and keeps the minutes", async () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Time" value="09:30" onValueChange={onValueChange} />);
    await pick("Hours", "14");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("14:30");
  });

  it("emits the new minute and keeps the hour", async () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Time" value="09:30" onValueChange={onValueChange} />);
    await pick("Minutes", "45");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("09:45");
  });

  it("emits seconds only when withSeconds is set", async () => {
    const withOut = vi.fn();
    const { unmount } = render(
      <TimePicker aria-label="Time" value="09:30:20" onValueChange={withOut} />,
    );
    await pick("Hours", "10");
    // The seconds column is not rendered, so they are not part of the value either.
    expect(withOut).toHaveBeenCalledExactlyOnceWith("10:30");
    unmount();

    const withIn = vi.fn();
    render(<TimePicker aria-label="Time" withSeconds value="09:30:20" onValueChange={withIn} />);
    await pick("Seconds", "45");
    expect(withIn).toHaveBeenCalledExactlyOnceWith("09:30:45");
  });

  it("starts from midnight when there is no value yet", async () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Time" onValueChange={onValueChange} />);
    expect(screen.getByRole("combobox", { name: "Hours" })).toHaveTextContent("HH");
    await pick("Minutes", "15");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("00:15");
  });
});

describe("TimePicker 12-hour display", () => {
  it("shows a 24h value on the 12h dial", () => {
    render(<TimePicker aria-label="Time" hourCycle={12} value="14:30" />);
    expect(shown("Hours")).toBe("2");
    expect(screen.getByRole("combobox", { name: "AM or PM" })).toHaveTextContent("PM");
  });

  it("still emits 24h when a 12h hour is picked in the afternoon", async () => {
    const onValueChange = vi.fn();
    render(
      <TimePicker aria-label="Time" hourCycle={12} value="14:30" onValueChange={onValueChange} />,
    );
    await pick("Hours", "10");
    // 10 with the period already PM is 22:00, not 10:00 — the displayed cycle must not leak
    // into the emitted value.
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("22:30");
  });

  it("moves the hour by twelve when the period changes", async () => {
    const onValueChange = vi.fn();
    render(
      <TimePicker aria-label="Time" hourCycle={12} value="14:30" onValueChange={onValueChange} />,
    );
    await pick("AM or PM", "AM");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("02:30");
  });

  it("treats midnight as 12 AM and noon as 12 PM", () => {
    const { unmount } = render(<TimePicker aria-label="Time" hourCycle={12} value="00:00" />);
    expect(shown("Hours")).toBe("12");
    expect(screen.getByRole("combobox", { name: "AM or PM" })).toHaveTextContent("AM");
    unmount();

    render(<TimePicker aria-label="Time" hourCycle={12} value="12:00" />);
    expect(shown("Hours")).toBe("12");
    expect(screen.getByRole("combobox", { name: "AM or PM" })).toHaveTextContent("PM");
  });
});

describe("TimePicker state ownership", () => {
  it("uncontrolled: the columns move to the picked time", async () => {
    render(<TimePicker aria-label="Time" defaultValue="09:30" />);
    await pick("Hours", "14");
    expect(shown("Hours")).toBe("14");
    expect(shown("Minutes")).toBe("30");
  });

  it("controlled: the columns do not move when the parent ignores the change", async () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="Time" value="09:30" onValueChange={onValueChange} />);
    await pick("Hours", "14");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("14:30");
    expect(shown("Hours")).toBe("09");
  });

  it("disabled: the columns cannot be opened, so nothing is emitted", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<TimePicker aria-label="Time" value="09:30" disabled onValueChange={onValueChange} />);
    await user.click(screen.getByRole("combobox", { name: "Hours" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
