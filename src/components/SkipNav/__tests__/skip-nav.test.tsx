import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SkipNav, SkipNavContent } from "@/components/SkipNav/skip-nav";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("SkipNav", () => {
  it("renders a link pointing to #main-content by default", () => {
    render(<SkipNav />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("accepts a custom target via the `to` prop", () => {
    render(<SkipNav to="#page-content">Skip to content</SkipNav>);
    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link).toHaveAttribute("href", "#page-content");
  });

  it("treats a bare id as a fragment rather than a relative URL", () => {
    render(<SkipNav to="page-content">Skip</SkipNav>);
    expect(screen.getByRole("link", { name: "Skip" })).toHaveAttribute("href", "#page-content");
  });

  it("leaves a path or URL target untouched", () => {
    render(<SkipNav to="/docs#main">Skip</SkipNav>);
    expect(screen.getByRole("link", { name: "Skip" })).toHaveAttribute("href", "/docs#main");
  });

  it("stays in the tab order and accessibility tree while out of view", () => {
    // Hidden by transform, not by clipping or display: it must remain the first tab stop.
    render(<SkipNav />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).not.toHaveClass("sr-only", "hidden", "invisible");
    expect(link).toHaveClass("fixed", "-translate-y-[calc(100%+2rem)]");
  });

  it("is revealed on any focus, above every layer, with the Qeet focus ring", () => {
    // `not-sr-only` used to reset `position` to static, so the revealed link pushed the page
    // down instead of floating over it.
    render(<SkipNav />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link).toHaveClass(
      "focus:translate-y-0",
      "z-(--qx-z-skip-nav)",
      "focus-visible:focus-ring",
    );
    expect(link.className).not.toMatch(/not-sr-only|ring-ring/);
  });
});

describe("SkipNavContent", () => {
  it("renders a main element with id main-content by default", () => {
    render(<SkipNavContent>Page content</SkipNavContent>);
    const region = screen.getByRole("main");
    expect(region).toHaveAttribute("id", "main-content");
  });

  it("accepts a custom id", () => {
    render(<SkipNavContent id="page-content">Page content</SkipNavContent>);
    const region = screen.getByRole("main");
    expect(region).toHaveAttribute("id", "page-content");
  });
});

describe("SkipNav + SkipNavContent combined", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <>
        <SkipNav />
        <SkipNavContent>
          <h1>Main content</h1>
          <p>Page body.</p>
        </SkipNavContent>
      </>,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
