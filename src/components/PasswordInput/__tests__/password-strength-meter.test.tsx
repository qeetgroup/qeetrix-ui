import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PasswordStrengthMeter, scorePassword } from "@/components/PasswordInput/password-strength-meter";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("scorePassword", () => {
  it("returns 0 for empty string", () => {
    expect(scorePassword("")).toBe(0);
  });
  it("returns 1 for a short simple password", () => {
    expect(scorePassword("abc")).toBe(1);
  });
  it("returns 4 for a long, diverse password (≥16 chars, all 4 classes)", () => {
    expect(scorePassword("Tr0ub4dor&3!xyzAB")).toBe(4);
  });
});

describe("PasswordStrengthMeter", () => {
  it("shows 'Strong' label for a strong password", () => {
    render(<PasswordStrengthMeter value="Tr0ub4dor&3!xyzAB" />);
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("shows 'Weak' label for a weak password", () => {
    render(<PasswordStrengthMeter value="abc" />);
    expect(screen.getByText("Weak")).toBeInTheDocument();
  });

  it("accepts an explicit score override (score=2 → Fair)", () => {
    render(<PasswordStrengthMeter value="" score={2} />);
    expect(screen.getByText("Fair")).toBeInTheDocument();
  });

  it("hides the label when hideLabel=true", () => {
    render(<PasswordStrengthMeter value="Hello123!" hideLabel />);
    expect(screen.queryByText(/Weak|Fair|Good|Strong/)).not.toBeInTheDocument();
  });

  it("renders feedback lines", () => {
    render(<PasswordStrengthMeter value="abc" feedback={["Add uppercase letters"]} />);
    expect(screen.getByText("Add uppercase letters")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<PasswordStrengthMeter value="Hello123!" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
