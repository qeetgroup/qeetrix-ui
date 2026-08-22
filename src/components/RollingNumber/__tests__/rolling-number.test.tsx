import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { RollingNumber } from "@/components/RollingNumber/rolling-number";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("RollingNumber", () => {
  it("renders the formatted value", () => {
    render(<RollingNumber value={1234} locale="en-US" />);
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("exposes a polite live region", () => {
    render(<RollingNumber value={5} />);
    expect(screen.getByText("5")).toHaveAttribute("aria-live", "polite");
  });

  it("has no axe violations", async () => {
    const { container } = render(<RollingNumber value={1234} locale="en-US" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
