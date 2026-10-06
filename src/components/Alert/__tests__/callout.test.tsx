import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Callout } from "@/components/Alert/callout";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const VARIANTS = ["info", "success", "warning", "destructive", "error", "muted"] as const;

const ICON_TONE: Record<(typeof VARIANTS)[number], string> = {
  info: "text-info-text",
  success: "text-success-text",
  warning: "text-warning-text",
  destructive: "text-destructive-text",
  error: "text-destructive-text",
  muted: "text-muted-foreground",
};

describe("Callout", () => {
  it("renders with role='note'", () => {
    render(<Callout>Some info</Callout>);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("renders title and content", () => {
    render(<Callout title="Heads Up">This is the content</Callout>);
    expect(screen.getByText("Heads Up")).toBeInTheDocument();
    expect(screen.getByText("This is the content")).toBeInTheDocument();
  });

  it.each(VARIANTS)("%s renders readable neutral text on its status surface", (variant) => {
    render(
      <Callout variant={variant} title="Title">
        Body
      </Callout>,
    );
    const note = screen.getByRole("note");
    // Regression: info/success/warning used `text-<status>-foreground`, the label colour for a
    // solid fill — white on a pale tint in light mode, near-black on a dark tint in dark mode.
    expect(note.className).not.toMatch(/text-(info|success|warning|destructive)-foreground/);
    expect(note).toHaveClass("text-foreground");
    expect(screen.getByText("Body")).toHaveClass("text-(--qx-component-alert-description)");
  });

  it.each(VARIANTS)("%s tints only the icon", (variant) => {
    const { container } = render(<Callout variant={variant}>Body</Callout>);
    const icon = container.querySelector('[data-slot="callout-icon"]');
    expect(icon).toHaveClass(ICON_TONE[variant]);
    expect(icon).toHaveAttribute("aria-hidden");
    expect(icon?.querySelector("svg")).not.toBeNull();
  });

  it("renders no icon when icon={null}", () => {
    const { container } = render(<Callout icon={null}>Body</Callout>);
    expect(container.querySelector('[data-slot="callout-icon"]')).toBeNull();
  });

  it("renders a custom icon in the icon slot", () => {
    render(<Callout icon={<svg data-testid="custom" />}>Body</Callout>);
    expect(screen.getByTestId("custom").parentElement).toHaveAttribute("data-slot", "callout-icon");
  });

  it("has no axe violations across all variants", async () => {
    const { container } = render(
      VARIANTS.map((variant) => (
        <Callout key={variant} variant={variant} title={`${variant} note`}>
          Content
        </Callout>
      )),
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
