import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Badge } from "@/components/Badge/badge";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "brand",
  "info",
  "success",
  "warning",
  "destructive",
  "muted",
] as const;

// One distinguishing class per variant proves the variant styling is wired up. `default` reads
// its tone from the badge component token; the tinted tones use the opaque semantic status
// surfaces rather than a `/10` derivation of the fill.
const VARIANT_CLASS: Record<(typeof VARIANTS)[number], string> = {
  default: "bg-(--qx-component-badge-default-background)",
  secondary: "bg-secondary",
  outline: "text-foreground",
  brand: "bg-brand-subtle",
  info: "bg-info-subtle",
  success: "bg-success-subtle",
  warning: "bg-warning-subtle",
  destructive: "bg-destructive-subtle",
  muted: "bg-muted",
};

const TINTED = {
  brand: ["text-brand", "border-(--qx-component-badge-border-brand)"],
  info: ["text-info-text", "border-(--qx-component-badge-border-info)"],
  success: ["text-success-text", "border-(--qx-component-badge-border-success)"],
  warning: ["text-warning-text", "border-(--qx-component-badge-border-warning)"],
  destructive: ["text-destructive-text", "border-(--qx-component-badge-border-danger)"],
} as const;

describe("Badge", () => {
  it("renders its content inside a badge slot span", () => {
    render(<Badge>New</Badge>);
    const badge = screen.getByText("New");
    expect(badge).toHaveAttribute("data-slot", "badge");
    expect(badge.tagName).toBe("SPAN");
  });

  it.each(VARIANTS)("renders the %s variant with its variant styling", (variant) => {
    render(<Badge variant={variant}>{variant}</Badge>);
    expect(screen.getByText(variant)).toHaveClass(VARIANT_CLASS[variant]);
  });

  it.each(Object.keys(TINTED) as (keyof typeof TINTED)[])(
    "%s pairs the AA text step with its own hairline, never text-primary",
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>);
      const badge = screen.getByText(variant);
      expect(badge).toHaveClass(...TINTED[variant]);
      expect(badge).not.toHaveClass("text-primary");
    },
  );

  it.each(VARIANTS)("%s always draws a border, so forced-colors keeps the outline", (variant) => {
    render(<Badge variant={variant}>{variant}</Badge>);
    expect(screen.getByText(variant)).toHaveClass("border");
  });

  it("merges a custom className and forwards props", () => {
    render(
      <Badge className="custom-x" aria-label="status">
        S
      </Badge>,
    );
    const badge = screen.getByText("S");
    expect(badge).toHaveClass("custom-x");
    expect(badge).toHaveAttribute("aria-label", "status");
  });

  it("has no axe violations across all variants", async () => {
    const { container } = render(
      VARIANTS.map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      )),
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
