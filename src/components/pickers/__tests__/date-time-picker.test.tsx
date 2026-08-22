import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { DateTimePicker } from "@/components/pickers/date-time-picker";

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
