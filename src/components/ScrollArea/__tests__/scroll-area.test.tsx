import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ScrollArea, ScrollBar } from "@/components/ScrollArea/scroll-area";

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

  it("wraps children in Base UI's Content part, inside the viewport", () => {
    // Content is what re-measures when the content itself grows (a list loading more rows)
    // and what lets wide content overflow horizontally.
    const { container } = render(
      <ScrollArea>
        <p>Row</p>
      </ScrollArea>,
    );
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
    const content = viewport?.querySelector('[data-slot="scroll-area-content"]');
    expect(content).not.toBeNull();
    expect(content).toContainElement(screen.getByText("Row"));
  });

  it("shows the inset Qeet focus ring on the viewport, not the legacy halo", () => {
    const { container } = render(
      <ScrollArea>
        <p>Row</p>
      </ScrollArea>,
    );
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
    expect(viewport).toHaveClass("focus-visible:focus-ring-inset");
    expect(viewport?.className).not.toMatch(/ring-ring\/disabled|ring-3/);
  });

  it("drives the thumb from component tokens, engaged by the scrollbar's own state", () => {
    render(
      <ScrollArea>
        <ScrollBar orientation="vertical" keepMounted data-testid="bar" />
      </ScrollArea>,
    );
    const bar = screen.getAllByTestId("bar")[0];
    expect(bar.className).toContain(
      "[--qx-scroll-area-thumb:var(--qx-component-scroll-area-thumb)]",
    );
    expect(bar.className).toContain(
      "data-hovering:[--qx-scroll-area-thumb:var(--qx-component-scroll-area-thumb-hover)]",
    );
    expect(bar.className).toContain(
      "data-hovering:hover:[--qx-scroll-area-thumb:var(--qx-component-scroll-area-thumb-active)]",
    );
    const thumb = bar.querySelector('[data-slot="scroll-area-thumb"]');
    expect(thumb).toHaveClass("bg-(--qx-scroll-area-thumb)", "forced-colors:bg-[CanvasText]");
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
