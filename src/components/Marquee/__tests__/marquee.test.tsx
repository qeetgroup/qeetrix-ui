import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Marquee } from "@/components/Marquee/marquee";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Marquee", () => {
  it("renders its content (duplicated for a seamless loop)", () => {
    render(
      <Marquee aria-label="Partners">
        <span>Acme</span>
      </Marquee>,
    );
    expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <Marquee aria-label="Partners">
        <span>Acme</span>
      </Marquee>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
