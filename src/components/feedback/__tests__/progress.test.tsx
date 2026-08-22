import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Progress } from "@/components/feedback/progress";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Progress", () => {
  it("exposes progressbar value", () => {
    render(<Progress value={40} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Progress value={40} aria-label="Upload" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
