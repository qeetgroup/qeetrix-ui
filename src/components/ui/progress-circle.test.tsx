import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ProgressCircle } from "@/components/ui/progress-circle";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("ProgressCircle", () => {
  it("renders with role progressbar", () => {
    render(<ProgressCircle value={50} aria-label="Upload progress" />);
    expect(screen.getByRole("progressbar", { name: "Upload progress" })).toBeInTheDocument();
  });

  it("has aria-valuenow matching the value prop", () => {
    render(<ProgressCircle value={72} aria-label="Storage" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "72");
  });

  it("clamps value above 100 to 100", () => {
    render(<ProgressCircle value={150} aria-label="Over limit" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("clamps value below 0 to 0", () => {
    render(<ProgressCircle value={-10} aria-label="Under limit" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("has no axe violations", async () => {
    const { container } = render(<ProgressCircle value={40} aria-label="Upload" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
