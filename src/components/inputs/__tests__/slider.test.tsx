import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Slider } from "@/components/inputs/slider";

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
