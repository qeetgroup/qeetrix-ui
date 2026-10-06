import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Slider } from "@/components/Slider/slider";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Slider", () => {
  it("exposes a named slider control with its value", () => {
    render(<Slider aria-label="Volume" defaultValue={[30]} />);
    // Base UI puts the accessible name on the group wrapper; the thumb's hidden
    // range <input> (role=slider) carries the value. The thumb starts
    // visibility:hidden until it can measure a position, and jsdom has no
    // layout, so include hidden elements when querying for it.
    expect(screen.getByRole("group", { name: "Volume" })).toBeInTheDocument();
    const s = screen.getByRole("slider", { hidden: true });
    expect(s).toHaveAttribute("aria-valuenow", "30");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Slider aria-label="Volume" defaultValue={[30]} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Slider range thumbs", () => {
  it("names each thumb of a range slider on its own", () => {
    render(
      <Slider
        aria-label="Price"
        defaultValue={[20, 80]}
        getAriaLabel={(i) => (i === 0 ? "Minimum price" : "Maximum price")}
      />,
    );
    // The thumbs are visibility:hidden until Base UI measures the track (jsdom has no layout),
    // and accessible-name computation skips hidden nodes — so read the attribute directly.
    const thumbs = screen.getAllByRole("slider", { hidden: true });
    expect(thumbs).toHaveLength(2);
    expect(thumbs[0]).toHaveAttribute("aria-label", "Minimum price");
    expect(thumbs[1]).toHaveAttribute("aria-label", "Maximum price");
    expect(thumbs[0]).toHaveAttribute("aria-valuenow", "20");
    expect(thumbs[1]).toHaveAttribute("aria-valuenow", "80");
  });

  it("keeps the shared aria-label when no per-thumb names are given", () => {
    render(<Slider aria-label="Price" defaultValue={[20, 80]} />);
    for (const thumb of screen.getAllByRole("slider", { hidden: true })) {
      expect(thumb).toHaveAttribute("aria-label", "Price");
    }
  });

  it("announces value text instead of the bare number", () => {
    render(
      <Slider
        aria-label="Budget"
        defaultValue={[40]}
        getAriaValueText={(_formatted, value) => `₹${value},000`}
      />,
    );
    expect(screen.getByRole("slider", { hidden: true })).toHaveAttribute(
      "aria-valuetext",
      "₹40,000",
    );
  });

  it("has no axe violations as a named range", async () => {
    const { container } = render(
      <Slider
        aria-label="Price"
        defaultValue={[20, 80]}
        getAriaLabel={(i) => (i === 0 ? "Minimum price" : "Maximum price")}
      />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Slider styling contract", () => {
  it("draws the thumb as a surface disc in a brand ring, focused from its inner input", () => {
    const { container } = render(<Slider aria-label="Volume" defaultValue={[30]} />);
    const thumb = container.querySelector("[data-slot=slider-thumb]");
    expect(thumb?.className).toMatch(/(^|\s)border-border-brand(\s|$)/);
    expect(thumb?.className).toMatch(/(^|\s)bg-surface(\s|$)/);
    // The focusable element is the hidden range input inside the thumb, so the ring keys off
    // :has(:focus-visible) — `focus-visible:` on the thumb div itself never matches.
    expect(thumb?.className).toMatch(/(^|\s)has-focus-visible:focus-ring(\s|$)/);
    expect(thumb?.className).not.toMatch(/bg-white/);
  });

  it("keeps the rail visible in both themes rather than a near-invisible muted fill", () => {
    const { container } = render(<Slider aria-label="Volume" defaultValue={[30]} />);
    const track = container.querySelector("[data-slot=slider-track]");
    expect(track?.className).toMatch(/(^|\s)bg-border-strong(\s|$)/);
    expect(track?.className).not.toMatch(/(^|\s)bg-muted(\s|$)/);
  });
});
