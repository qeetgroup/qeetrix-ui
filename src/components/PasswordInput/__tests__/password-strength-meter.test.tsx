import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  PasswordStrengthMeter,
  scorePassword,
} from "@/components/PasswordInput/password-strength-meter";

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

  it("hides the label visually when hideLabel=true, but still announces it", () => {
    render(<PasswordStrengthMeter value="Hello123!" hideLabel />);
    // The bar alone carries no text, so the label moves to the visually-hidden layer rather
    // than leaving the live region silent.
    const label = screen.getByText(/Weak|Fair|Good|Strong/);
    expect(label.closest(".sr-only")).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Password strength: (Weak|Fair|Good|Strong)/,
    );
  });

  it("announces what the label is about, not only the bare word", () => {
    render(<PasswordStrengthMeter value="abc" />);
    expect(screen.getByRole("status")).toHaveTextContent("Password strength: Weak");
  });

  it("accepts a translated status prefix", () => {
    render(
      <PasswordStrengthMeter
        value="abc"
        statusPrefix="Sicherheit:"
        labels={["", "Schwach", "Mittel", "Gut", "Stark"]}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Sicherheit: Schwach");
  });

  it("does not rely on colour: the filled-segment count tracks the score", () => {
    const { container, rerender } = render(<PasswordStrengthMeter value="" score={1} />);
    const filled = () =>
      container.querySelectorAll("[data-slot=password-strength-meter-segment][data-filled]").length;
    expect(filled()).toBe(1);
    rerender(<PasswordStrengthMeter value="" score={3} />);
    expect(filled()).toBe(3);
    rerender(<PasswordStrengthMeter value="" score={4} />);
    expect(filled()).toBe(4);
    // The segments are decorative; the text is the accessible channel.
    expect(
      container.querySelector("[data-slot=password-strength-meter-segment]")?.parentElement,
    ).toHaveAttribute("aria-hidden", "true");
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
