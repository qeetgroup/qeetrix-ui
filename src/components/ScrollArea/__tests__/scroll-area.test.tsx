import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ScrollArea } from "@/components/ScrollArea/scroll-area";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("ScrollArea", () => {
  it("renders children inside the viewport", () => {
    render(
      <ScrollArea className="h-32 w-64">
        <p>Scrollable content</p>
      </ScrollArea>,
    );
    expect(screen.getByText("Scrollable content")).toBeInTheDocument();
  });

  it("renders the root slot", () => {
    const { container } = render(
      <ScrollArea>
        <div>content</div>
      </ScrollArea>,
    );
    expect(container.querySelector('[data-slot="scroll-area"]')).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <ScrollArea aria-label="Content region" className="h-32 w-64">
        <p>Content</p>
      </ScrollArea>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
