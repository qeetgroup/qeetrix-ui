import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { AngleSlider } from "@/components/ui/angle-slider";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("AngleSlider", () => {
  it("exposes slider semantics", () => {
    render(<AngleSlider value={90} aria-label="Hue" />);
    const slider = screen.getByRole("slider", { name: "Hue" });
    expect(slider).toHaveAttribute("aria-valuenow", "90");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "360");
  });

  it("steps with arrow keys", () => {
    const onValueChange = vi.fn();
    render(<AngleSlider value={90} onValueChange={onValueChange} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenCalledWith(91);
  });

  it("has no axe violations", async () => {
    const { container } = render(<AngleSlider value={45} aria-label="Angle" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
