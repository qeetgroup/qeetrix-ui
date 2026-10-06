import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { DatePicker, DateRangePicker } from "@/components/DatePicker/date-picker";
import { Field, FieldLabel } from "@/components/Input/field";

/*
 * Deterministic dates. Every value below is built from local parts, and any test whose outcome
 * depends on which month the calendar opens on pins "today" with a faked `Date` — only `Date`, so
 * timers, transitions and `waitFor` keep running on the real clock. The pinned today is years
 * away from every value on purpose: a picker that opened on today's month instead of the
 * value's (the defect behind the old `2026-08-17` failures) cannot pass by coincidence.
 */
const FAR_TODAY = new Date(2031, 2, 15, 12, 0); // Sat 15 Mar 2031

function pinToday(today: Date = FAR_TODAY) {
  vi.useFakeTimers({ toFake: ["Date"], now: today });
}

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

describe("DatePicker form participation", () => {
  const formOf = () => screen.getByRole("form", { name: "when" }) as HTMLFormElement;
  const submitted = (key: string) => new FormData(formOf()).getAll(key);

  /*
   * The submitted value is the *local* calendar day, which is the day the trigger displays.
   * `toISOString()` converts to UTC first, so it posts the previous day for every user east of
   * Greenwich and the next day for a late-evening selection west of it. The runner's timezone is
   * not pinned, so two instants are asserted — local midnight and local late evening — which
   * between them differ from the UTC date under any non-zero offset, in either direction.
   */
  it.each([
    ["local midnight", new Date(2026, 7, 4), "2026-08-04"],
    ["local late evening", new Date(2026, 7, 4, 23, 30), "2026-08-04"],
  ])("submits %s as the local calendar day", (_label, date, expected) => {
    render(
      <form aria-label="when">
        <DatePicker name="due" defaultValue={date} aria-label="Due" />
      </form>,
    );
    expect(submitted("due")).toEqual([expected]);
  });

  it("submits an empty string when nothing is selected", () => {
    render(
      <form aria-label="when">
        <DatePicker name="due" aria-label="Due" />
      </form>,
    );
    expect(submitted("due")).toEqual([""]);
  });

  it("submits the newly picked day after a selection", async () => {
    // Today is pinned years away: the calendar has to open on the value's month for "17" to
    // mean 17 August. This used to read the real clock and broke once August 2026 had passed.
    pinToday();
    try {
      render(
        <form aria-label="when">
          <DatePicker name="due" defaultValue={new Date(2026, 7, 4)} aria-label="Due" />
        </form>,
      );
      fireEvent.click(screen.getByRole("button", { name: /Due/ }));
      const dayCells = (await screen.findAllByRole("button")).filter(
        (b) => b.textContent?.trim() === "17",
      );
      expect(dayCells).toHaveLength(1);
      fireEvent.click(dayCells[0]);
      await waitFor(() => expect(submitted("due")).toEqual(["2026-08-17"]));
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the selected date in the trigger's name when a Field labels it", () => {
    render(
      <Field>
        <FieldLabel>Start date</FieldLabel>
        <DatePicker name="start" defaultValue={new Date(2026, 7, 4)} />
      </Field>,
    );
    // The Field label is prepended, not substituted: the selection must stay audible. The name
    // is the concatenation of the two referenced elements, label first.
    const trigger = screen.getByRole("button", { name: /^Start date .*2026/ });
    expect(trigger.getAttribute("aria-labelledby")?.split(" ")).toHaveLength(2);
  });
});

describe("DateRangePicker form participation", () => {
  const submitted = (key: string) =>
    new FormData(screen.getByRole("form", { name: "window" }) as HTMLFormElement).getAll(key);

  it("submits both ends of the range under one name, from then to", () => {
    render(
      <form aria-label="window">
        <DateRangePicker
          name="period"
          defaultValue={{ from: new Date(2026, 7, 1), to: new Date(2026, 7, 31) }}
          aria-label="Period"
        />
      </form>,
    );
    expect(submitted("period")).toEqual(["2026-08-01", "2026-08-31"]);
  });

  it("keeps the pair two entries when the end is unset", () => {
    render(
      <form aria-label="window">
        <DateRangePicker
          name="period"
          defaultValue={{ from: new Date(2026, 7, 1), to: undefined }}
          aria-label="Period"
        />
      </form>,
    );
    // Position carries meaning, so the open end submits as "" rather than being dropped.
    expect(submitted("period")).toEqual(["2026-08-01", ""]);
  });
});

/* SSR-002. `Intl.DateTimeFormat` with no explicit locale resolves the *ambient* one, which
 * differs between the process that rendered the HTML and the browser that hydrates it. The
 * trigger's date is visible text, so a mismatch makes React throw the server's subtree away. */
describe("DatePicker locale", () => {
  const day = new Date(2026, 0, 1);
  const german = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(day);

  it("formats the first render in en-US, whatever the host is set to", () => {
    // The server pass is the one the browser has to reproduce, so it is formatted in a fixed
    // locale rather than the host's.
    const html = renderToStaticMarkup(<DatePicker value={day} />);
    expect(html).toContain(">Jan 1, 2026<");
  });

  it("formats the trigger in the locale it is given", () => {
    render(<DatePicker value={day} locale="de-DE" />);
    expect(screen.getByRole("button")).toHaveTextContent(german);
  });

  it("renders the same text before and after mount when a locale is given", () => {
    // This is the property that makes the fix worth having: pass `locale` and there is no
    // switch at all, so the server bytes and the hydration bytes are the same bytes.
    const html = renderToStaticMarkup(<DatePicker value={day} locale="de-DE" />);
    expect(html).toContain(`>${german}<`);
    render(<DatePicker value={day} locale="de-DE" />);
    expect(screen.getByRole("button")).toHaveTextContent(german);
  });

  it("formats both ends of a range in the locale it is given", () => {
    const to = new Date(2026, 0, 31);
    const expected = `${german} – ${new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(to)}`;
    const html = renderToStaticMarkup(<DateRangePicker value={{ from: day, to }} locale="de-DE" />);
    expect(html).toContain(expected);
    render(<DateRangePicker value={{ from: day, to }} locale="de-DE" />);
    expect(screen.getByRole("button")).toHaveTextContent(expected);
  });

  it("formats a range's first render in en-US too", () => {
    const html = renderToStaticMarkup(
      <DateRangePicker value={{ from: day, to: new Date(2026, 0, 31) }} />,
    );
    expect(html).toContain("Jan 1, 2026 – Jan 31, 2026");
  });
});

/* ── Which month the calendar opens on ─────────────────────────────────────────────────── */
describe("DatePicker opening month", () => {
  beforeEach(() => pinToday());
  afterEach(() => vi.useRealTimers());

  it("opens on the selected value's month, not today's", async () => {
    render(<DatePicker defaultValue={new Date(2026, 7, 4)} aria-label="Due" />);
    fireEvent.click(screen.getByRole("button", { name: /Due/ }));
    expect(await screen.findByRole("grid", { name: /August 2026/ })).toBeInTheDocument();
    // …with the selected day as the focus target.
    const selected = screen.getByRole("button", { name: /August 4.*selected/ });
    await waitFor(() => expect(selected).toHaveFocus());
  });

  it("opens on today's month when there is no value", async () => {
    render(<DatePicker aria-label="Due" />);
    fireEvent.click(screen.getByRole("button", { name: /Due/ }));
    expect(await screen.findByRole("grid", { name: /March 2031/ })).toBeInTheDocument();
  });

  it("follows a controlled value to its month on every open", async () => {
    const { rerender } = render(<DatePicker value={new Date(2026, 7, 4)} aria-label="Due" />);
    const trigger = screen.getByRole("button", { name: /Due/ });
    fireEvent.click(trigger);
    expect(await screen.findByRole("grid", { name: /August 2026/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("grid"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());

    rerender(<DatePicker value={new Date(2027, 0, 9)} aria-label="Due" />);
    fireEvent.click(trigger);
    expect(await screen.findByRole("grid", { name: /January 2027/ })).toBeInTheDocument();
  });

  it("opens a range on the month its range starts", async () => {
    render(
      <DateRangePicker
        defaultValue={{ from: new Date(2026, 9, 28), to: new Date(2026, 10, 3) }}
        aria-label="Period"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Period/ }));
    expect(await screen.findByRole("grid", { name: /October 2026/ })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: /November 2026/ })).toBeInTheDocument();
  });
});

/* ── Selection, clearing and bounds ─────────────────────────────────────────────────────── */
describe("DatePicker selection", () => {
  const dayButton = (name: RegExp) => screen.getByRole("button", { name });

  it("confirms, rather than empties, when the selected day is picked again", async () => {
    const onValueChange = vi.fn();
    render(
      <form aria-label="when">
        <DatePicker
          name="due"
          defaultValue={new Date(2026, 7, 4)}
          onValueChange={onValueChange}
          aria-label="Due"
        />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Due/ }));
    fireEvent.click(await screen.findByRole("button", { name: /August 4.*selected/ }));
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toEqual(new Date(2026, 7, 4));
    expect(
      new FormData(screen.getByRole("form", { name: "when" }) as HTMLFormElement).get("due"),
    ).toBe("2026-08-04");
  });

  it("offers Clear only when clearable and set, and Clear empties the value", async () => {
    const onValueChange = vi.fn();
    const { unmount } = render(
      <DatePicker defaultValue={new Date(2026, 7, 4)} aria-label="Plain" />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Plain/ }));
    await screen.findByRole("grid");
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
    unmount();

    render(
      <form aria-label="when">
        <DatePicker
          name="due"
          clearable
          defaultValue={new Date(2026, 7, 4)}
          onValueChange={onValueChange}
          aria-label="Due"
        />
      </form>,
    );
    const trigger = screen.getByRole("button", { name: /Due/ });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("button", { name: "Clear" }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(undefined);
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(trigger).toHaveTextContent("Pick a date");
    expect(
      new FormData(screen.getByRole("form", { name: "when" }) as HTMLFormElement).get("due"),
    ).toBe("");
  });

  it("disables days outside min/max and stops navigation at their months", async () => {
    render(
      <DatePicker
        defaultValue={new Date(2026, 7, 10)}
        min={new Date(2026, 7, 5)}
        max={new Date(2026, 7, 20)}
        aria-label="Due"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Due/ }));
    await screen.findByRole("grid", { name: /August 2026/ });
    expect(dayButton(/August 4,/)).toBeDisabled();
    expect(dayButton(/August 5,/)).toBeEnabled();
    expect(dayButton(/August 20,/)).toBeEnabled();
    expect(dayButton(/August 21,/)).toBeDisabled();
    expect(screen.getByRole("button", { name: /previous month/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: /next month/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("names unavailable days as such and does not let them be picked", async () => {
    const onValueChange = vi.fn();
    render(
      <DatePicker
        defaultValue={new Date(2026, 7, 10)}
        unavailable={[new Date(2026, 7, 14)]}
        onValueChange={onValueChange}
        aria-label="Due"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Due/ }));
    const taken = await screen.findByRole("button", { name: /August 14.*, unavailable$/ });
    expect(taken).toBeDisabled();
    expect(taken).toHaveAttribute("data-unavailable", "true");
    fireEvent.click(taken);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

/* ── Keyboard: the whole round trip, with user-event ────────────────────────────────────── */
describe("DatePicker keyboard", () => {
  it("opens from the keyboard, moves by day, picks with Enter and returns focus", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker
        defaultValue={new Date(2026, 7, 4)}
        onValueChange={onValueChange}
        aria-label="Due"
      />,
    );
    const trigger = screen.getByRole("button", { name: /Due/ });
    trigger.focus();
    await user.keyboard("{Enter}");
    const selected = await screen.findByRole("button", { name: /August 4.*selected/ });
    await waitFor(() => expect(selected).toHaveFocus());

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: /August 5,/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: /August 12,/ })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(new Date(2026, 7, 12));
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes on Escape without changing the value, and returns focus", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker
        defaultValue={new Date(2026, 7, 4)}
        onValueChange={onValueChange}
        aria-label="Due"
      />,
    );
    const trigger = screen.getByRole("button", { name: /Due/ });
    await user.click(trigger);
    await screen.findByRole("grid");
    await user.keyboard("{ArrowRight}{Escape}");
    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(onValueChange).not.toHaveBeenCalled();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});

/* ── The calendar speaks the trigger's language ─────────────────────────────────────────── */
describe("DatePicker calendar locale", () => {
  beforeEach(() => pinToday());
  afterEach(() => vi.useRealTimers());

  it("formats the popover's calendar in the trigger's locale", async () => {
    render(<DatePicker defaultValue={new Date(2026, 9, 6)} locale="de-DE" aria-label="Datum" />);
    fireEvent.click(screen.getByRole("button", { name: /Datum/ }));
    const grid = await screen.findByRole("grid", { name: "Oktober 2026" });
    // Narrow weekday letters on screen, the full name as each header's label. (DayPicker hides
    // the header row from assistive technology: every day button names its full date.)
    const headers = Array.from(grid.querySelectorAll("thead th"));
    expect(headers.map((th) => th.getAttribute("aria-label"))).toContain("Dienstag");
    expect(headers.map((th) => th.textContent)).toEqual(["S", "M", "D", "M", "D", "F", "S"]);
    expect(screen.getByRole("button", { name: /^Dienstag, 6\. Oktober 2026/ })).toBeInTheDocument();
    expect(grid.closest("[data-slot=calendar]")).toHaveAttribute("lang", "de-DE");
  });
});

/* ── Narrow viewports ───────────────────────────────────────────────────────────────────── */
describe("DateRangePicker on a narrow viewport", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it("shows one month below the md breakpoint, two above it", async () => {
    window.matchMedia = ((query: string) => ({
      ...original(query),
      matches: query.includes("max-width"),
    })) as typeof window.matchMedia;
    const { unmount } = render(
      <DateRangePicker defaultValue={{ from: new Date(2026, 7, 4) }} aria-label="Period" />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Period/ }));
    await screen.findByRole("grid");
    expect(screen.getAllByRole("grid")).toHaveLength(1);
    unmount();

    window.matchMedia = original;
    render(<DateRangePicker defaultValue={{ from: new Date(2026, 7, 4) }} aria-label="Period" />);
    fireEvent.click(screen.getByRole("button", { name: /Period/ }));
    await screen.findAllByRole("grid");
    expect(screen.getAllByRole("grid")).toHaveLength(2);
  });
});
