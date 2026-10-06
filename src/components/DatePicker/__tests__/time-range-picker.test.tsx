import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { TimeRangePicker } from "@/components/DatePicker/time-range-picker";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("TimeRangePicker", () => {
  it("renders the preset label on the trigger", () => {
    render(<TimeRangePicker defaultValue={{ preset: "7d", from: new Date(), to: new Date() }} />);
    expect(screen.getByRole("button", { name: /last 7 days/i })).toBeInTheDocument();
  });

  it("defaults to last 24 hours", () => {
    render(<TimeRangePicker />);
    expect(screen.getByRole("button", { name: /last 24 hours/i })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<TimeRangePicker />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/* SSR-002. `Intl.DateTimeFormat` with no explicit locale resolves the *ambient* one, which
 * differs between the process that rendered the HTML and the browser that hydrates it. A custom
 * range's dates are visible text, so a mismatch makes React throw the server's subtree away.
 * The formatter was built at module scope, which froze one locale for the whole process. */
describe("TimeRangePicker locale", () => {
  const custom = {
    preset: "custom",
    from: new Date(2026, 0, 1),
    to: new Date(2026, 0, 31),
  } as const;
  const german = (date: Date) =>
    new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(date);
  const germanRange = `${german(custom.from)} – ${german(custom.to)}`;

  it("formats the first render in en-US, whatever the host is set to", () => {
    // The server pass is the one the browser has to reproduce, so it is formatted in a fixed
    // locale rather than the host's.
    const html = renderToStaticMarkup(<TimeRangePicker defaultValue={{ ...custom }} />);
    expect(html).toContain("Jan 1, 2026 – Jan 31, 2026");
  });

  it("formats a custom range in the locale it is given", () => {
    render(<TimeRangePicker defaultValue={{ ...custom }} locale="de-DE" />);
    expect(screen.getByRole("button")).toHaveTextContent(germanRange);
  });

  it("renders the same text before and after mount when a locale is given", () => {
    // The property that makes the fix worth having: pass `locale` and there is no switch at
    // all, so the server bytes and the hydration bytes are the same bytes.
    const html = renderToStaticMarkup(
      <TimeRangePicker defaultValue={{ ...custom }} locale="de-DE" />,
    );
    expect(html).toContain(germanRange);
    render(<TimeRangePicker defaultValue={{ ...custom }} locale="de-DE" />);
    expect(screen.getByRole("button")).toHaveTextContent(germanRange);
  });

  it("needs no locale for a preset, whose label is not a formatted date", () => {
    // The preset path never reaches a formatter, which is why the defect only ever showed on a
    // custom range — and why the label is identical in both passes.
    const html = renderToStaticMarkup(<TimeRangePicker />);
    expect(html).toContain("Last 24 hours");
  });
});

/*
 * SSR-002, the harder half. The default value used to be `{ preset: "24h", ...presetRange(…) }`
 * built inside the `useState` initializer, so *render* read the clock: the server and the browser
 * computed two different instants for the same component. It produced no visible mismatch, because
 * a preset's label is a constant string and its instants are never rendered — which is exactly why
 * it survived. So the assertion is the purity itself, instrumented rather than inferred: a `Date`
 * proxy that counts zero-argument constructions, which is what a clock read is.
 */
describe("TimeRangePicker clock", () => {
  const RealDate = Date;
  let reads = 0;

  /** Count clock reads without changing what the clock says. */
  function countClockReads() {
    reads = 0;
    vi.stubGlobal(
      "Date",
      new Proxy(RealDate, {
        construct(target, args) {
          if (args.length === 0) reads += 1;
          return new (target as DateConstructor)(...(args as []));
        },
      }),
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads no clock while rendering on the server", () => {
    countClockReads();
    renderToStaticMarkup(<TimeRangePicker />);
    expect(reads).toBe(0);
  });

  it("reads no clock while rendering in the browser either", () => {
    countClockReads();
    render(<TimeRangePicker />);
    expect(screen.getByRole("button")).toHaveTextContent("Last 24 hours");
    expect(reads).toBe(0);
  });

  it("reads the clock in the handler that commits, which is where it belongs", async () => {
    const onValueChange = vi.fn();
    render(<TimeRangePicker onValueChange={onValueChange} />);
    fireEvent.click(screen.getByRole("button", { name: /last 24 hours/i }));
    const hour = await screen.findByRole("button", { name: "Last hour" });

    // Instrumented only from here: the Calendar inside the popover reads the clock for its own
    // "today", which is not what this asserts. Starting the count after it has rendered also
    // anchors the two zero counts above — the same instrument does register a read.
    countClockReads();
    fireEvent.click(hour);
    expect(reads).toBeGreaterThan(0);

    const [emitted] = onValueChange.mock.calls[0];
    expect(emitted.preset).toBe("1h");
    // The window is anchored at the click, not at the mount.
    expect(emitted.to.getTime() - emitted.from.getTime()).toBe(36e5);
    expect(Math.abs(emitted.to.getTime() - RealDate.now())).toBeLessThan(5_000);
  });
});

/* Fixed dates; "today" is pinned (Date only) where the opening month depends on it. */
describe("TimeRangePicker custom ranges and presets", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date(2031, 2, 15, 12, 0) }));
  afterEach(() => vi.useRealTimers());

  it("opens on last month and this one when there is no custom range", async () => {
    render(<TimeRangePicker locale="en-US" />);
    fireEvent.click(screen.getByRole("button", { name: /last 24 hours/i }));
    expect(await screen.findByRole("grid", { name: "February 2031" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "March 2031" })).toBeInTheDocument();
  });

  it("opens on the custom range when there is one", async () => {
    render(
      <TimeRangePicker
        locale="en-US"
        defaultValue={{ preset: "custom", from: new Date(2026, 7, 1), to: new Date(2026, 7, 3) }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("grid", { name: "August 2026" })).toBeInTheDocument();
  });

  it("includes the whole last day of a custom range", async () => {
    const onValueChange = vi.fn();
    render(
      <TimeRangePicker
        locale="en-US"
        onValueChange={onValueChange}
        defaultValue={{ preset: "custom", from: new Date(2026, 7, 1), to: new Date(2026, 7, 1) }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(await screen.findByRole("button", { name: /August 3, 2026/ }));
    const emitted = onValueChange.mock.calls.at(-1)?.[0];
    expect(emitted.preset).toBe("custom");
    expect(emitted.from).toEqual(new Date(2026, 7, 1));
    // The last instant of 3 August, not its midnight — "Aug 1 – Aug 3" includes Aug 3.
    expect(emitted.to).toEqual(new Date(2026, 7, 3, 23, 59, 59, 999));
  });

  it("reports the selected preset as pressed, and only that one", async () => {
    render(<TimeRangePicker defaultValue={{ preset: "7d", from: new Date(), to: new Date() }} />);
    fireEvent.click(screen.getByRole("button", { name: /last 7 days/i }));
    await screen.findAllByRole("grid");
    const pressed = screen
      .getAllByRole("button", { pressed: true })
      .map((b) => b.textContent?.trim());
    expect(pressed).toEqual(["Last 7 days"]);
    expect(screen.getByRole("button", { name: "Last hour" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("disables days outside min/max", async () => {
    render(
      <TimeRangePicker
        locale="en-US"
        max={new Date(2026, 7, 10)}
        defaultValue={{ preset: "custom", from: new Date(2026, 7, 1), to: new Date(2026, 7, 3) }}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("button", { name: /August 11, 2026/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /August 10, 2026/ })).toBeEnabled();
  });
});

describe("TimeRangePicker trigger", () => {
  it("prefixes an aria-label to the current window, and can be disabled", () => {
    render(<TimeRangePicker aria-label="Log window" disabled />);
    const trigger = screen.getByRole("button", { name: "Log window, Last 24 hours" });
    expect(trigger).toBeDisabled();
  });

  it("keeps its data-slot", () => {
    render(<TimeRangePicker />);
    expect(screen.getByRole("button")).toHaveAttribute("data-slot", "time-range-picker");
  });
});
