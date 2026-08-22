import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Checkbox } from "@/components/selection/checkbox";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Checkbox", () => {
  it("toggles and reports the change", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Accept terms" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(box).toHaveAttribute("aria-checked", "false");
    fireEvent.click(box);
    expect(onCheckedChange).toHaveBeenCalled();
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("respects the disabled state", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Accept terms" disabled onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Accept terms" }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Checkbox aria-label="Accept terms" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
