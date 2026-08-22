import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ColorSwatch } from "@/components/ColorPicker/color-swatch";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("ColorSwatch", () => {
  it("renders with correct aria-label", () => {
    render(<ColorSwatch color="#FF0000" label="Red" />);
    expect(screen.getByRole("img", { name: "Red" })).toBeInTheDocument();
  });

  it("falls back to the color value as aria-label when no label is provided", () => {
    render(<ColorSwatch color="#FF0000" />);
    expect(screen.getByRole("img", { name: "#FF0000" })).toBeInTheDocument();
  });

  it("renders as button when onClick is provided", () => {
    const onClick = vi.fn();
    render(<ColorSwatch color="#FF0000" label="Red" onClick={onClick} />);
    expect(screen.getByRole("button", { name: "Red" })).toBeInTheDocument();
  });

  it("selected state has aria-pressed=true", () => {
    const onClick = vi.fn();
    render(<ColorSwatch color="#FF0000" label="Red" onClick={onClick} selected />);
    expect(screen.getByRole("button", { name: "Red" })).toHaveAttribute("aria-pressed", "true");
  });

  it("has no axe violations (interactive variant)", async () => {
    const onClick = vi.fn();
    const { container } = render(<ColorSwatch color="#FF0000" label="Red" onClick={onClick} />);
    expect(await a11y(container)).toHaveNoViolations();
  });

  it("has no axe violations (display variant)", async () => {
    const { container } = render(<ColorSwatch color="#FF0000" label="Red" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
