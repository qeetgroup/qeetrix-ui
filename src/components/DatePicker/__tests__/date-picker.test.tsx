import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { DatePicker, DateRangePicker } from "@/components/DatePicker/date-picker";
import { Field, FieldLabel } from "@/components/Input/field";

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
    render(
      <form aria-label="when">
        <DatePicker name="due" defaultValue={new Date(2026, 7, 4)} aria-label="Due" />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Due/ }));
    const dayCells = (await screen.findAllByRole("button")).filter(
      (b) => b.textContent?.trim() === "17",
    );
    fireEvent.click(dayCells[0]);
    await waitFor(() => expect(submitted("due")).toEqual(["2026-08-17"]));
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
