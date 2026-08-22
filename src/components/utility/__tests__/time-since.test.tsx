import { render } from "@testing-library/react";
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
