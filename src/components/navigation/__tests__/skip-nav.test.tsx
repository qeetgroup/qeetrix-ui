import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SkipNav, SkipNavContent } from "@/components/navigation/skip-nav";

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
