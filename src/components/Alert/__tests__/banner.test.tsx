import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Banner } from "@/components/Alert/banner";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const VARIANTS = ["default", "info", "success", "warning", "destructive", "danger"] as const;

describe("Banner", () => {
  it("renders a region and dismisses", () => {
    const onDismiss = vi.fn();
    render(
      <Banner variant="info" aria-label="Announcement" onDismiss={onDismiss}>
        Maintenance tonight
      </Banner>,
    );
    expect(screen.getByRole("region", { name: "Announcement" })).toHaveTextContent(
      "Maintenance tonight",
    );
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it.each(VARIANTS)("%s is a calm tinted bar, not a saturated fill", (variant) => {
    render(
      <Banner variant={variant} aria-label="Announcement">
        Notice
      </Banner>,
    );
    const banner = screen.getByRole("region");
    expect(banner).toHaveClass("text-foreground", "border-b");
    // The solid status fills (and the inverse default) dominated every screen.
    expect(banner.className).not.toMatch(
      /(^|\s)bg-(info|success|warning|destructive|foreground)(\s|$)/,
    );
  });

  it("shows a status icon for status variants and none for the neutral default", () => {
    const { container, rerender } = render(
      <Banner variant="warning" aria-label="Announcement">
        Notice
      </Banner>,
    );
    const icon = container.querySelector('[data-slot="banner-icon"]');
    expect(icon).toHaveClass("text-warning-text");
    expect(icon).toHaveAttribute("aria-hidden");

    rerender(<Banner aria-label="Announcement">Notice</Banner>);
    expect(container.querySelector('[data-slot="banner-icon"]')).toBeNull();

    rerender(
      <Banner variant="warning" icon={null} aria-label="Announcement">
        Notice
      </Banner>,
    );
    expect(container.querySelector('[data-slot="banner-icon"]')).toBeNull();
  });

  it("gives the dismiss button the foundation focus indicator", () => {
    render(
      <Banner aria-label="Announcement" onDismiss={() => {}}>
        Notice
      </Banner>,
    );
    expect(screen.getByRole("button", { name: "Dismiss" })).toHaveClass("focus-visible:focus-ring");
  });

  it("has no axe violations", async () => {
    const { container } = render(
      VARIANTS.map((variant) => (
        <Banner key={variant} variant={variant} aria-label={variant} onDismiss={() => {}}>
          Heads up <a href="#details">Details</a>
        </Banner>
      )),
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
