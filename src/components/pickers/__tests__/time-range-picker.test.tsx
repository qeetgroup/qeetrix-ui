import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { TimeRangePicker } from "@/components/pickers/time-range-picker";

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
