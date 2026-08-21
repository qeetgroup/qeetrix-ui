import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Button } from "@/components/actions/button";
import { VisuallyHidden } from "@/components/utility/visually-hidden";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("VisuallyHidden", () => {
  it("renders children as a span", () => {
    render(<VisuallyHidden>Hidden label</VisuallyHidden>);
    const el = screen.getByText("Hidden label");
    expect(el.tagName).toBe("SPAN");
  });

  it("applies sr-only class", () => {
    render(<VisuallyHidden>Screen reader text</VisuallyHidden>);
    const el = screen.getByText("Screen reader text");
    expect(el).toHaveClass("sr-only");
  });

  it("forwards data-slot attribute", () => {
    render(<VisuallyHidden>Label</VisuallyHidden>);
    const el = screen.getByText("Label");
    expect(el).toHaveAttribute("data-slot", "visually-hidden");
  });

  it("has no axe violations when used as a button label", async () => {
    const { container } = render(
      <Button>
        <VisuallyHidden>Close dialog</VisuallyHidden>
      </Button>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
