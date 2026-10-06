import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { DateTimePicker } from "@/components/DatePicker/date-time-picker";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/Input/field";

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

/*
 * `minuteStep` reaches the option loop from this component too (INPUT-001). Normalisation lives
 * in TimePicker, so these assert the forwarding, not a second implementation. A regression is a
 * hung worker rather than a failed assertion — see the note in time-picker.test.tsx.
 */
describe("DateTimePicker minuteStep", () => {
  async function openMinuteOptions(step: number): Promise<string[]> {
    render(<DateTimePicker minuteStep={step} />);
    fireEvent.click(screen.getByRole("button", { name: /pick date & time/i }));
    fireEvent.click(await screen.findByRole("combobox", { name: /minutes/i }));
    const list = await screen.findByRole("listbox");
    return Array.from(list.querySelectorAll('[role="option"]')).map((o) => o.textContent ?? "");
  }

  it("does not hang on a zero step, falling back to every minute", async () => {
    expect(await openMinuteOptions(0)).toHaveLength(60);
  });

  it("does not hang on a negative step", async () => {
    expect(await openMinuteOptions(-1)).toHaveLength(60);
  });

  it("forwards a valid step unchanged", async () => {
    expect(await openMinuteOptions(20)).toEqual(["00", "20", "40"]);
  });

  it("uses its own default of 5 when the prop is omitted", async () => {
    render(<DateTimePicker />);
    fireEvent.click(screen.getByRole("button", { name: /pick date & time/i }));
    fireEvent.click(await screen.findByRole("combobox", { name: /minutes/i }));
    const list = await screen.findByRole("listbox");
    expect(list.querySelectorAll('[role="option"]')).toHaveLength(12);
  });
});

/* SSR-002. `Intl.DateTimeFormat` with no explicit locale resolves the *ambient* one, which
 * differs between the process that rendered the HTML and the browser that hydrates it. The
 * trigger's date and time are visible text, so a mismatch makes React throw the server's subtree
 * away. The formatter was memoised, which kept one wrong answer rather than fixing it. */
describe("DateTimePicker locale", () => {
  const instant = new Date(2026, 0, 1, 20, 0, 30);
  const german = (withSeconds: boolean) =>
    new Intl.DateTimeFormat("de-DE", {
      dateStyle: "medium",
      timeStyle: withSeconds ? "medium" : "short",
    }).format(instant);

  it("formats the first render in en-US, whatever the host is set to", () => {
    // The server pass is the one the browser has to reproduce, so it is formatted in a fixed
    // locale rather than the host's.
    const html = renderToStaticMarkup(<DateTimePicker value={instant} />);
    expect(html).toContain("Jan 1, 2026");
  });

  it("formats the trigger in the locale it is given", () => {
    render(<DateTimePicker value={instant} locale="de-DE" />);
    expect(screen.getByRole("button")).toHaveTextContent(german(false));
  });

  it("renders the same text before and after mount when a locale is given", () => {
    // The property that makes the fix worth having: pass `locale` and there is no switch at
    // all, so the server bytes and the hydration bytes are the same bytes.
    const html = renderToStaticMarkup(<DateTimePicker value={instant} locale="de-DE" />);
    expect(html).toContain(german(false));
    render(<DateTimePicker value={instant} locale="de-DE" />);
    expect(screen.getByRole("button")).toHaveTextContent(german(false));
  });

  it("keeps the seconds precision out of the locale's cache slot", () => {
    // Regression guard for the formatter cache: keyed on the locale alone, the second render
    // below would reuse the short-time formatter and silently drop the seconds.
    render(<DateTimePicker value={instant} locale="de-DE" />);
    expect(screen.getByRole("button")).toHaveTextContent(german(false));
    cleanup();
    render(<DateTimePicker value={instant} locale="de-DE" withSeconds />);
    expect(screen.getByRole("button")).toHaveTextContent(german(true));
    expect(german(true)).not.toBe(german(false));
  });
});

/* Fixed dates; "today" is pinned (Date only) wherever the opening month could depend on it. */
const FAR_TODAY = new Date(2031, 2, 15, 12, 0);

describe("DateTimePicker forms", () => {
  const formData = () =>
    new FormData(screen.getByRole("form", { name: "joining" }) as HTMLFormElement);

  it("submits the local datetime-local string under its name", () => {
    render(
      <form aria-label="joining">
        <DateTimePicker name="at" defaultValue={new Date(2026, 7, 4, 9, 5)} aria-label="At" />
        <DateTimePicker
          name="precise"
          withSeconds
          defaultValue={new Date(2026, 7, 4, 23, 59, 7)}
          aria-label="Precise"
        />
        <DateTimePicker name="empty" aria-label="Empty" />
      </form>,
    );
    expect(formData().get("at")).toBe("2026-08-04T09:05");
    expect(formData().get("precise")).toBe("2026-08-04T23:59:07");
    expect(formData().get("empty")).toBe("");
  });

  it("takes its name, description and invalid state from a Field", () => {
    render(
      <Field invalid>
        <FieldLabel>Joining</FieldLabel>
        <DateTimePicker defaultValue={new Date(2026, 7, 4, 9, 30)} />
        <FieldDescription>Local time at the office.</FieldDescription>
        <FieldError>Joining must be on a working day.</FieldError>
      </Field>,
    );
    const trigger = screen.getByRole("button", { name: /^Joining .*2026/ });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger.getAttribute("aria-describedby")?.split(" ")).toContain(
      screen.getByText("Local time at the office.").id,
    );
  });

  it("does not duplicate the Field's control id in the popover's time columns", async () => {
    render(
      <Field>
        <FieldLabel>Joining</FieldLabel>
        <DateTimePicker defaultValue={new Date(2026, 7, 4, 9, 30)} />
      </Field>,
    );
    const trigger = screen.getByRole("button", { name: /^Joining/ });
    fireEvent.click(trigger);
    const hours = await screen.findByRole("combobox", { name: "Hours" });
    expect(hours.id).not.toBe(trigger.id);
    expect(document.querySelectorAll(`[id="${trigger.id}"]`)).toHaveLength(1);
  });
});

describe("DateTimePicker bounds and opening month", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: FAR_TODAY }));
  afterEach(() => vi.useRealTimers());

  it("opens on the value's month", async () => {
    render(<DateTimePicker defaultValue={new Date(2026, 7, 4, 9, 30)} aria-label="At" />);
    fireEvent.click(screen.getByRole("button", { name: /At/ }));
    expect(await screen.findByRole("grid", { name: "August 2026" })).toBeInTheDocument();
  });

  it("moves a time picked on min's day up to min", async () => {
    const onValueChange = vi.fn();
    render(
      <DateTimePicker
        defaultValue={new Date(2026, 7, 5, 10, 0)}
        min={new Date(2026, 7, 4, 14, 0)}
        onValueChange={onValueChange}
        aria-label="At"
        locale="en-US"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /At/ }));
    // The selected time (10:00) is kept when the day changes, which is before min on min's day.
    fireEvent.click(await screen.findByRole("button", { name: /August 4, 2026/ }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(new Date(2026, 7, 4, 14, 0));
    expect(screen.getByRole("button", { name: /August 3, 2026/ })).toBeDisabled();
  });

  it("keeps the day and its time when the selected day is picked again", async () => {
    const onValueChange = vi.fn();
    render(
      <DateTimePicker
        defaultValue={new Date(2026, 7, 4, 9, 30)}
        onValueChange={onValueChange}
        aria-label="At"
        locale="en-US"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /At/ }));
    fireEvent.click(await screen.findByRole("button", { name: /August 4, 2026, selected/ }));
    await waitFor(() =>
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith(new Date(2026, 7, 4, 9, 30)),
    );
  });
});
