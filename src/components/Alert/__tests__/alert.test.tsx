import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Alert, AlertDescription, AlertTitle } from "@/components/Alert/alert";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

const VARIANTS = ["default", "info", "success", "warning", "danger"] as const;

// One distinguishing class per variant proves the variant styling is wired up.
const VARIANT_CLASS: Record<(typeof VARIANTS)[number], string> = {
  default: "text-card-foreground",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

describe("Alert", () => {
  it("renders with the alert role plus title and description slots", () => {
    render(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Something needs your attention.</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-slot", "alert");
    expect(screen.getByText("Heads up")).toHaveAttribute("data-slot", "alert-title");
    expect(screen.getByText("Something needs your attention.")).toHaveAttribute(
      "data-slot",
      "alert-description",
    );
  });

  it.each(VARIANTS)("renders the %s variant with its variant styling", (variant) => {
    render(
      <Alert variant={variant}>
        <AlertTitle>{variant}</AlertTitle>
      </Alert>,
    );
    expect(screen.getByRole("alert")).toHaveClass(VARIANT_CLASS[variant]);
  });

  it("merges a custom className and forwards props", () => {
    render(
      <Alert className="custom-x" data-testid="alert">
        <AlertTitle>Title</AlertTitle>
      </Alert>,
    );
    const alert = screen.getByTestId("alert");
    expect(alert).toHaveClass("custom-x");
    expect(alert).toHaveAttribute("role", "alert");
  });

  it("has no axe violations across all variants", async () => {
    const { container } = render(
      VARIANTS.map((variant) => (
        <Alert key={variant} variant={variant}>
          <AlertTitle>{variant} title</AlertTitle>
          <AlertDescription>{variant} description</AlertDescription>
        </Alert>
      )),
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
