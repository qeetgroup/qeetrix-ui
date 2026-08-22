import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AspectRatio } from "@/components/AspectRatio/aspect-ratio";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("AspectRatio", () => {
  it("applies the ratio as an inline aspect-ratio style", () => {
    render(
      <AspectRatio ratio={16 / 9} data-testid="ar">
        <span>media</span>
      </AspectRatio>,
    );
    // jsdom normalises `aspect-ratio: 1.77…` to `"1.77… / 1"`, so compare the ratio.
    expect(parseFloat(screen.getByTestId("ar").style.aspectRatio)).toBeCloseTo(16 / 9);
  });

  it("defaults to a square and merges className", () => {
    render(
      <AspectRatio data-testid="ar" className="rounded-md">
        <span>media</span>
      </AspectRatio>,
    );
    const el = screen.getByTestId("ar");
    expect(parseFloat(el.style.aspectRatio)).toBe(1);
    expect(el).toHaveClass("rounded-md");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <AspectRatio ratio={16 / 9}>
        <img src="/media.jpg" alt="Landscape preview" className="size-full object-cover" />
      </AspectRatio>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
