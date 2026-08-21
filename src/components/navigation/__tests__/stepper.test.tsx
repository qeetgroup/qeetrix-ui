import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Stepper } from "@/components/navigation/stepper";

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
