import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Separator } from "@/components/ui/separator";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Separator", () => {
  it("renders with separator semantics", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <span>Above</span>
        <Separator />
        <span>Below</span>
      </div>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
