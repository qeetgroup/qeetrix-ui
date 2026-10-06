import { render, screen } from "@testing-library/react";
import { InfoIcon } from "lucide-react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/Alert/alert";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

const VARIANTS = ["default", "info", "success", "warning", "danger"] as const;

// One distinguishing class per variant proves the variant styling is wired up: the opaque
// semantic status surface, not a `/10` derivation of the fill.
const VARIANT_CLASS: Record<(typeof VARIANTS)[number], string> = {
  default: "text-card-foreground",
  info: "bg-info-subtle",
  success: "bg-success-subtle",
  warning: "bg-warning-subtle",
  danger: "bg-destructive-subtle",
};

const STATUS_BORDER: Record<Exclude<(typeof VARIANTS)[number], "default">, string> = {
  info: "border-(--qx-component-alert-border-info)",
  success: "border-(--qx-component-alert-border-success)",
  warning: "border-(--qx-component-alert-border-warning)",
  danger: "border-(--qx-component-alert-border-danger)",
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

  it.each(Object.keys(STATUS_BORDER) as (keyof typeof STATUS_BORDER)[])(
    "%s keeps prose neutral and puts the status hue on the icon and the hairline only",
    (variant) => {
      render(
        <Alert variant={variant}>
          <InfoIcon />
          <AlertTitle>Title</AlertTitle>
          <AlertDescription>Body</AlertDescription>
        </Alert>,
      );
      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("text-foreground", STATUS_BORDER[variant]);
      // The old recipe painted every word in the status colour.
      expect(alert.className).not.toMatch(/(^|\s)text-(info|success|warning|destructive)(\s|$)/);
      expect(screen.getByText("Body")).toHaveClass("text-(--qx-component-alert-description)");
    },
  );

  it("reads its block padding from the density-aware component token", () => {
    render(<Alert>x</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("py-(--qx-component-alert-padding-block)");
  });

  it("has no phantom icon gutter: the icon column only exists when an svg is a direct child", () => {
    render(<Alert>x</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("grid-cols-[0_1fr]");
    // The gutter belongs to the icon column, not to a column gap that also applies without one.
    expect(alert.className).not.toMatch(/(^|\s)gap-x-/);
  });

  it("puts AlertAction in its own trailing slot", () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Sync failed</AlertTitle>
        <AlertAction>
          <button type="button">Retry</button>
        </AlertAction>
      </Alert>,
    );
    const action = screen.getByRole("button", { name: "Retry" }).parentElement;
    expect(action).toHaveAttribute("data-slot", "alert-action");
    expect(action).toHaveClass("col-start-3");
  });

  it("lets a non-urgent alert opt out of the assertive role", () => {
    render(
      <Alert role="status">
        <AlertTitle>Saved</AlertTitle>
      </Alert>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("data-slot", "alert");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
          <InfoIcon aria-hidden />
          <AlertTitle>{variant} title</AlertTitle>
          <AlertDescription>{variant} description</AlertDescription>
          <AlertAction>
            <button type="button">Act on {variant}</button>
          </AlertAction>
        </Alert>
      )),
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
