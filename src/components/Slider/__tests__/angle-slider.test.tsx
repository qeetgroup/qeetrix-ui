import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { AngleSlider } from "@/components/Slider/angle-slider";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("AngleSlider", () => {
  it("exposes slider semantics", () => {
    render(<AngleSlider value={90} aria-label="Hue" />);
    const slider = screen.getByRole("slider", { name: "Hue" });
    expect(slider).toHaveAttribute("aria-valuenow", "90");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    // 0° and 360° are the same direction, so the largest reachable value is one step short of a
    // full turn — and `End` lands exactly there. It used to announce 360, which End never reached.
    expect(slider).toHaveAttribute("aria-valuemax", "359");
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

describe("AngleSlider keyboard range", () => {
  it("Home and End go to the ends, and End agrees with aria-valuemax", () => {
    const onValueChange = vi.fn();
    render(<AngleSlider defaultValue={90} step={5} onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "End" });
    expect(onValueChange).toHaveBeenLastCalledWith(355);
    expect(slider).toHaveAttribute("aria-valuemax", "355");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  it("Page Up / Page Down take ten steps and wrap around the dial", () => {
    const onValueChange = vi.fn();
    render(<AngleSlider value={355} onValueChange={onValueChange} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "PageUp" });
    expect(onValueChange).toHaveBeenLastCalledWith(5);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "PageDown" });
    expect(onValueChange).toHaveBeenLastCalledWith(345);
  });

  it("ignores keys when disabled or read-only, and leaves the tab order when disabled", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<AngleSlider value={10} disabled onValueChange={onValueChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.keyDown(slider, { key: "ArrowUp" });
    expect(slider).toHaveAttribute("tabindex", "-1");
    expect(slider).toHaveAttribute("aria-disabled", "true");
    expect(slider).toHaveAttribute("data-disabled");

    rerender(<AngleSlider value={10} readOnly onValueChange={onValueChange} />);
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowUp" });
    expect(screen.getByRole("slider")).toHaveAttribute("aria-readonly", "true");
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("AngleSlider naming and value text", () => {
  it("announces the angle with a degree sign by default", () => {
    render(<AngleSlider value={135} aria-label="Rotation" />);
    expect(screen.getByRole("slider", { name: "Rotation" })).toHaveAttribute(
      "aria-valuetext",
      "135°",
    );
  });

  it("takes a custom value text", () => {
    render(
      <AngleSlider
        value={90}
        aria-label="Wind"
        getAriaValueText={(v) => (v === 90 ? "East" : `${v}`)}
      />,
    );
    expect(screen.getByRole("slider", { name: "Wind" })).toHaveAttribute("aria-valuetext", "East");
  });

  it("can be named by a visible label instead of aria-label", () => {
    render(
      <>
        <span id="dial-label">Gradient angle</span>
        <AngleSlider value={0} aria-labelledby="dial-label" />
      </>,
    );
    const slider = screen.getByRole("slider", { name: "Gradient angle" });
    expect(slider).not.toHaveAttribute("aria-label");
  });

  it("does not scroll the page while dragged on touch", () => {
    render(<AngleSlider value={0} />);
    expect(screen.getByRole("slider").className).toMatch(/(^|\s)touch-none(\s|$)/);
  });

  it("draws a needle from the centre, so the angle reads as a direction", () => {
    const { container } = render(<AngleSlider value={90} />);
    const needle = container.querySelector<HTMLElement>("[data-slot=angle-slider-needle]");
    expect(needle).not.toBeNull();
    expect(needle?.style.transform).toBe("rotate(90deg)");
  });
});
