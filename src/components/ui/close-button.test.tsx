import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CloseButton } from "@/components/ui/close-button";

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
