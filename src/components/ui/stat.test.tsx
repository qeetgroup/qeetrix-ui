import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Stat } from "@/components/ui/stat";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Stat", () => {
  it("renders label, value and delta", () => {
    render(<Stat label="MRR" value="$12,400" delta="+8%" trend="up" hint="vs last month" />);
    expect(screen.getByText("MRR")).toBeInTheDocument();
    expect(screen.getByText("$12,400")).toBeInTheDocument();
    expect(screen.getByText("+8%")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Stat label="MRR" value="$12,400" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
