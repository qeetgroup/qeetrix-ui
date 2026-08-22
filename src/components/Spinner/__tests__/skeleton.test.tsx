import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Skeleton } from "@/components/Spinner/skeleton";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Skeleton", () => {
  it("renders a placeholder with the skeleton slot", () => {
    render(<Skeleton data-testid="sk" className="h-4 w-24" />);
    expect(screen.getByTestId("sk")).toHaveAttribute("data-slot", "skeleton");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
