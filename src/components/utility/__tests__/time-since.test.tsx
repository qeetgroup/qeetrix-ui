import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { TimeSince } from "@/components/utility/time-since";

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
