import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Separator, separatorVariants } from "@/components/Separator/separator";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Separator", () => {
  it("renders with separator semantics", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("is horizontal and uses the default border role by default", () => {
    render(<Separator />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "horizontal");
    expect(sep).toHaveAttribute("data-variant", "default");
    expect(sep).toHaveClass("bg-border", "data-horizontal:h-px", "data-horizontal:w-full");
  });

  it("offers a quieter muted weight on the subtle border role", () => {
    render(<Separator variant="muted" />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("data-variant", "muted");
    expect(sep).toHaveClass("bg-border-subtle");
    expect(sep).not.toHaveClass("bg-border");
  });

  it("reports vertical orientation and stretches in a flex row", () => {
    render(<Separator orientation="vertical" />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "vertical");
    expect(sep).toHaveAttribute("data-orientation", "vertical");
    expect(sep).toHaveClass("data-vertical:w-px", "data-vertical:self-stretch");
  });

  it("survives forced-colours mode in both weights", () => {
    expect(separatorVariants({ variant: "default" })).toContain("forced-colors:bg-[CanvasText]");
    expect(separatorVariants({ variant: "muted" })).toContain("forced-colors:bg-[CanvasText]");
  });

  it("lets a consumer override the colour", () => {
    render(<Separator className="bg-border-strong" />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveClass("bg-border-strong");
    expect(sep).not.toHaveClass("bg-border");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <span>Above</span>
        <Separator />
        <span>Between</span>
        <Separator variant="muted" />
        <span>Below</span>
      </div>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
