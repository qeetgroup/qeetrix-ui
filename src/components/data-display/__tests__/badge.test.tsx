import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Badge } from "@/components/data-display/badge";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "success",
  "warning",
  "destructive",
  "muted",
] as const;

// One distinguishing class per variant proves the variant styling is wired up. `default` reads
// its tone from the badge component token; the rest still use the bridge utilities directly.
const VARIANT_CLASS: Record<(typeof VARIANTS)[number], string> = {
  default: "bg-[var(--qx-component-badge-default-background)]",
  secondary: "bg-secondary",
  outline: "text-foreground",
  success: "bg-success/10",
  warning: "bg-warning/10",
  destructive: "bg-destructive/10",
  muted: "bg-muted",
};

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
