import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Container, containerVariants } from "@/components/layout/container";

const a11y = (container: Element) =>
  axe(container, { rules: { "color-contrast": { enabled: false } } });

describe("Container", () => {
  it("renders the standard content shell by default", () => {
    render(<Container>Content</Container>);
    const container = screen.getByText("Content");
    expect(container).toHaveAttribute("data-slot", "container");
    expect(container).toHaveAttribute("data-size", "content");
    expect(container.className).toContain("max-w-4xl");
    expect(container.className).toContain("sm:px-6");
  });

  it("supports prose, wide, full, and gutterless layouts", () => {
    expect(containerVariants({ size: "prose" })).toContain("max-w-2xl");
    expect(containerVariants({ size: "wide" })).toContain("max-w-6xl");
    expect(containerVariants({ size: "full", gutters: false })).toContain("max-w-none");
    expect(containerVariants({ size: "full", gutters: false })).not.toContain("px-4");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Container>Content</Container>);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
