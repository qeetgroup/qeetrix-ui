import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Skeleton } from "@/components/Spinner/skeleton";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("Skeleton", () => {
  it("renders a placeholder with the skeleton slot", () => {
    render(<Skeleton data-testid="sk" className="h-4 w-24" />);
    expect(screen.getByTestId("sk")).toHaveAttribute("data-slot", "skeleton");
  });

  it("paints from the skeleton token, which holds its weight on every surface in both themes", () => {
    render(<Skeleton data-testid="sk" />);
    const sk = screen.getByTestId("sk");
    expect(sk).toHaveClass("bg-(--qx-component-skeleton-background)");
    // The old opaque muted fill all but vanished on the light canvas and on a dark card.
    expect(sk).not.toHaveClass("bg-muted");
  });

  it("keeps an outline in forced-colors mode, where the fill is dropped", () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId("sk")).toHaveClass("forced-colors:border-[GrayText]");
  });

  it("lets className set the shape", () => {
    render(<Skeleton data-testid="sk" className="size-10 rounded-full" />);
    expect(screen.getByTestId("sk")).toHaveClass("rounded-full");
    expect(screen.getByTestId("sk")).not.toHaveClass("rounded-md");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
