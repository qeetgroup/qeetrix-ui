import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CloseButton } from "@/components/Button/close-button";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("CloseButton", () => {
  it("renders a button with default aria-label 'Close'", () => {
    render(<CloseButton />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("accepts a custom aria-label", () => {
    render(<CloseButton aria-label="Dismiss notification" />);
    expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
  });

  it("clicking fires onClick", () => {
    const onClick = vi.fn();
    render(<CloseButton onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<CloseButton />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("CloseButton sizing and tone", () => {
  it("accepts the dense icon-xs size", () => {
    render(<CloseButton size="icon-xs" />);
    expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute("data-size", "icon-xs");
  });

  it("rests quieter than the content it dismisses", () => {
    render(<CloseButton />);
    const btn = screen.getByRole("button", { name: "Close" });
    expect(btn).toHaveClass("text-muted-foreground", "hover:text-foreground");
  });

  it("lets a consumer class win over the default tone", () => {
    render(<CloseButton className="text-foreground" />);
    const btn = screen.getByRole("button", { name: "Close" });
    expect(btn).toHaveClass("text-foreground");
    expect(btn).not.toHaveClass("text-muted-foreground");
  });
});
