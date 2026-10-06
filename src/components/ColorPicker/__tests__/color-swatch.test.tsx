import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ColorSwatch } from "@/components/ColorPicker/color-swatch";
import { swatchTone } from "@/internal/swatch-tone";

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

describe("ColorSwatch selection indicator", () => {
  const check = (name: string) =>
    screen.getByRole("button", { name }).querySelector("[data-slot=color-swatch-check]");
  const classOf = (el: Element | null) => el?.getAttribute("class") ?? "";

  it("shows a check only when selected", () => {
    render(
      <>
        <ColorSwatch color="#F26D0E" label="Qeet" onClick={vi.fn()} selected />
        <ColorSwatch color="#111111" label="Ink" onClick={vi.fn()} />
      </>,
    );
    expect(check("Qeet")).not.toBeNull();
    expect(check("Ink")).toBeNull();
  });

  it("picks the glyph tone by the swatch's luminance", () => {
    render(
      <>
        <ColorSwatch color="#ffffff" label="White" onClick={vi.fn()} selected />
        <ColorSwatch color="#0f172a" label="Navy" onClick={vi.fn()} selected />
      </>,
    );
    expect(classOf(check("White"))).toContain("text-(--qx-component-color-picker-glyph-on-light)");
    expect(classOf(check("Navy"))).toContain("text-(--qx-component-color-picker-glyph-on-dark)");
  });

  it("gives an unmeasurable colour a halo, so the check reads on anything", () => {
    render(<ColorSwatch color="var(--brand)" label="Token" onClick={vi.fn()} selected />);
    expect(classOf(check("Token"))).toContain("drop-shadow");
  });

  it("keeps the swatch colour under forced colors and outlines the selection", () => {
    render(<ColorSwatch color="#10b981" label="Emerald" onClick={vi.fn()} selected />);
    const button = screen.getByRole("button", { name: "Emerald" });
    expect(button.className).toContain("forced-color-adjust-none");
    expect(button.className).toContain("outline-foreground");
    // The selection ring used to be a box-shadow `ring-*`, which forced colors strips.
    expect(button.className).not.toMatch(/(^|\s)ring-2(\s|$)/);
  });

  it("passes a title through", () => {
    render(<ColorSwatch color="#10b981" label="Emerald" title="#10b981" onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Emerald" })).toHaveAttribute("title", "#10b981");
  });

  it("does not borrow the disabled alpha for its border", () => {
    render(<ColorSwatch color="#10b981" label="Emerald" />);
    expect(screen.getByRole("img", { name: "Emerald" }).className).not.toMatch(/\/disabled/);
  });
});

describe("swatchTone", () => {
  it.each([
    ["#ffffff", "light"],
    ["#fff", "light"],
    ["#F26D0E", "light"],
    ["#f59e0b", "light"],
    ["#000000", "dark"],
    // Mid blue: luminance ≈0.235, so graphite (~4.6:1) beats white (~3.7:1).
    ["#3b82f6", "light"],
    ["#1d4ed8", "dark"],
    ["#0f172a", "dark"],
    ["#4338cacc", "dark"],
  ] as const)("%s → %s", (color, tone) => {
    expect(swatchTone(color)).toBe(tone);
  });

  it.each(["rgb(0 0 0)", "var(--x)", "red", "#12", ""])("%s cannot be measured", (color) => {
    expect(swatchTone(color)).toBe("unknown");
  });
});
