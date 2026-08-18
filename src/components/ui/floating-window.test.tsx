import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FloatingWindow } from "@/components/ui/floating-window";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("FloatingWindow", () => {
  it("renders a non-modal labelled dialog", () => {
    render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    const dialog = screen.getByRole("dialog", { name: "Helper" });
    expect(dialog).toHaveAttribute("aria-modal", "false");
  });

  it("hides when open is false", () => {
    render(
      <FloatingWindow title="Helper" open={false}>
        Body
      </FloatingWindow>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fires onClose", () => {
    const onClose = vi.fn();
    render(
      <FloatingWindow title="Helper" onClose={onClose}>
        Body
      </FloatingWindow>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<FloatingWindow title="Helper">Body</FloatingWindow>);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
