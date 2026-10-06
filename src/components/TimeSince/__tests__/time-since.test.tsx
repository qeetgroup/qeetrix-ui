import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { TimeSince } from "@/components/TimeSince/time-since";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("TimeSince", () => {
  it("renders a <time> with a relative label and dateTime", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { container } = render(<TimeSince value={fiveMinAgo} refreshIntervalMs={0} />);
    const time = container.querySelector("time");
    expect(time).not.toBeNull();
    expect(time).toHaveAttribute("datetime", fiveMinAgo);
    expect(time?.textContent).toMatch(/ago|now/i);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <TimeSince value={new Date().toISOString()} refreshIntervalMs={0} />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

/* SSR-002. `Intl` with no explicit locale or zone resolves the ambient ones, which differ
 * between the process that rendered the HTML and the browser that hydrates it. */
describe("TimeSince locale and time zone", () => {
  const value = "2026-01-01T20:00:00.000Z";

  it("formats the first render in UTC and en-US, whatever the host is set to", () => {
    // The server pass is the one the browser has to reproduce, so it is formatted in fixed
    // settings rather than the host's. 20:00 UTC stays 20:00, and stays on 1 January.
    const html = renderToStaticMarkup(<TimeSince value={value} />);

    expect(html).toContain('title="Jan 1, 2026, 8:00 PM"');
    expect(html).toContain(">Jan 1, 2026<");
  });

  it("formats the absolute date and the tooltip in the zone it is given", () => {
    const { container } = render(
      <TimeSince value={value} locale="en-GB" timeZone="Asia/Kolkata" refreshIntervalMs={0} />,
    );
    const time = container.querySelector("time");

    // 20:00 UTC is 01:30 the next morning in Asia/Kolkata.
    expect(time).toHaveAttribute("title", "2 Jan 2026, 01:30");
    // `datetime` stays the instant, in UTC, whatever is displayed.
    expect(time).toHaveAttribute("datetime", value);
  });

  it("puts the relative label in the locale it is given", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const { container } = render(
      <TimeSince value={fiveMinutesAgo} locale="de-DE" refreshIntervalMs={0} />,
    );

    expect(container.querySelector("time")?.textContent).toBe("vor 5 Minuten");
  });
});

/* A pinned clock (Date only): every label below is a fixed distance from a fixed "now". */
describe("TimeSince relative-time semantics", () => {
  const NOW = new Date("2026-03-15T12:00:00.000Z").getTime();
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: NOW }));
  afterEach(() => vi.useRealTimers());

  const label = (offsetMs: number, locale = "en-US") => {
    const { container, unmount } = render(
      <TimeSince value={NOW + offsetMs} locale={locale} timeZone="UTC" refreshIntervalMs={0} />,
    );
    const text = container.querySelector("time")?.textContent;
    unmount();
    return text;
  };

  it.each([
    [-4_000, "now"],
    [4_000, "now"],
    [-45_000, "45 seconds ago"],
    // The rounded amount decides the unit: never "60 seconds ago" or "24 hours ago".
    [-59_600, "1 minute ago"],
    [-89 * 60_000, "1 hour ago"],
    [-23.6 * 3_600_000, "1 day ago"],
    [-5 * 60_000, "5 minutes ago"],
    [5 * 60_000, "in 5 minutes"],
    [-3 * 86_400_000, "3 days ago"],
  ])("labels %d ms as %s", (offset, expected) => {
    expect(label(offset)).toBe(expected);
  });

  it("measures elapsed time rather than naming calendar days", () => {
    // Hours stay hours below a day, and a day stays "1 day ago": `numeric: "auto"` would say
    // "yesterday", a calendar claim that is wrong whenever the elapsed day spans one midnight
    // less than it seems.
    expect(label(-22 * 3_600_000)).toBe("22 hours ago");
    expect(label(-26 * 3_600_000)).not.toMatch(/yesterday/i);
  });

  it("localises 'now' too", () => {
    expect(label(-2_000, "de-DE")).toBe("jetzt");
  });

  it("switches to the absolute date past absoluteAfterDays", () => {
    const { container } = render(
      <TimeSince
        value={NOW - 40 * 86_400_000}
        locale="en-US"
        timeZone="UTC"
        refreshIntervalMs={0}
      />,
    );
    expect(container.querySelector("time")?.textContent).toBe("Feb 3, 2026");
  });

  it("omits datetime for an unparseable value instead of writing an invalid one", () => {
    const { container } = render(<TimeSince value="not a date" refreshIntervalMs={0} />);
    const time = container.querySelector("time");
    expect(time).toHaveTextContent("not a date");
    expect(time).not.toHaveAttribute("datetime");
  });
});
