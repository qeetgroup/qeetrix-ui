import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Stepper } from "@/components/Stepper/stepper";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

const steps = [
  { label: "Account", description: "Create your account" },
  { label: "Profile" },
  { label: "Confirm" },
];

describe("Stepper", () => {
  it("renders all step labels", () => {
    render(<Stepper steps={steps} activeStep={1} />);
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("renders step descriptions", () => {
    render(<Stepper steps={steps} activeStep={0} />);
    expect(screen.getByText("Create your account")).toBeInTheDocument();
  });

  it("marks earlier steps as complete, active step as active, and later as upcoming", () => {
    render(<Stepper steps={steps} activeStep={1} />);
    const items = document.querySelectorAll('[data-slot="stepper"] [data-state]');
    expect(items[0]).toHaveAttribute("data-state", "complete");
    expect(items[1]).toHaveAttribute("data-state", "active");
    expect(items[2]).toHaveAttribute("data-state", "upcoming");
  });

  it("renders as an ordered list", () => {
    render(<Stepper steps={steps} activeStep={0} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<Stepper steps={steps} activeStep={0} />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

describe("Stepper states", () => {
  const withError = [
    { label: "Organisation" },
    { label: "Identity provider" },
    { label: "Verify domain", description: "TXT record not found", invalid: true },
    { label: "Invite admins" },
  ];

  it("announces completed steps, which colour and a check alone cannot", () => {
    const { container } = render(<Stepper steps={steps} activeStep={2} />);
    const items = container.querySelectorAll('[data-slot="stepper-step"]');
    expect(items[0]).toHaveTextContent("Completed");
    expect(items[1]).toHaveTextContent("Completed");
    expect(items[2]).not.toHaveTextContent("Completed");
  });

  it("marks the current step for assistive technology", () => {
    render(<Stepper steps={steps} activeStep={1} />);
    const current = screen.getByText("Profile").closest("li");
    expect(current).toHaveAttribute("aria-current", "step");
  });

  it("shows and announces an invalid step, whatever its position", () => {
    const { container } = render(<Stepper steps={withError} activeStep={2} />);
    const step = container.querySelectorAll('[data-slot="stepper-step"]')[2];
    expect(step).toHaveAttribute("data-invalid");
    // Still the current step: being wrong does not move the user.
    expect(step).toHaveAttribute("data-state", "active");
    expect(step).toHaveAttribute("aria-current", "step");
    expect(step).toHaveTextContent("Has errors");
    expect(step.querySelector('[data-slot="stepper-marker"]')).toHaveTextContent("!");
    expect(screen.getByText("Verify domain")).toHaveClass("text-destructive-text");
  });

  it("gives the current step the one solid Qeet marker, and completed steps the quiet tint", () => {
    const { container } = render(<Stepper steps={steps} activeStep={1} />);
    const markers = container.querySelectorAll('[data-slot="stepper-marker"]');
    expect(markers[0]).toHaveClass("bg-brand-subtle", "text-brand");
    expect(markers[1]).toHaveClass("bg-primary", "text-primary-foreground");
    expect(markers[2]).toHaveClass("text-muted-foreground");
    // No step label uses the 3:1 fill colour as text.
    expect(container.innerHTML).not.toContain("text-primary ");
  });

  it("draws the connector after a completed step in the brand border", () => {
    const { container } = render(<Stepper steps={steps} activeStep={1} />);
    const connectors = container.querySelectorAll('[data-slot="stepper-connector"]');
    expect(connectors).toHaveLength(2);
    expect(connectors[0]).toHaveClass("bg-border-brand");
    expect(connectors[1]).toHaveClass("bg-border");
  });

  it("lays out vertically on request", () => {
    const { container } = render(<Stepper steps={steps} activeStep={0} orientation="vertical" />);
    const list = container.querySelector('[data-slot="stepper"]');
    expect(list).toHaveAttribute("data-orientation", "vertical");
    expect(list).toHaveClass("flex-col");
  });

  it("translates its status strings", () => {
    const { container } = render(
      <Stepper
        steps={withError}
        activeStep={2}
        messages={{ complete: "Terminé", invalid: "Erreur" }}
      />,
    );
    const items = container.querySelectorAll('[data-slot="stepper-step"]');
    expect(items[0]).toHaveTextContent("Terminé");
    expect(items[2]).toHaveTextContent("Erreur");
  });

  it("has no axe violations vertically and with an error", async () => {
    const { container } = render(
      <Stepper steps={withError} activeStep={2} orientation="vertical" />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
