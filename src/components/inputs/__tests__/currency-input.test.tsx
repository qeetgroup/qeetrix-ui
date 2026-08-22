import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CurrencyInput } from "@/components/inputs/currency-input";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

describe("CurrencyInput", () => {
  it("renders the locale currency symbol", () => {
    render(<CurrencyInput aria-label="Amount" currency="INR" locale="en-IN" />);
    expect(screen.getByText("₹")).toBeInTheDocument();
  });

  it("emits a number on input", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Amount" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1500" } });
    expect(onValueChange).toHaveBeenCalledWith(1500);
  });

  it("rejects non-numeric input", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Amount" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "abc" } });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <CurrencyInput aria-label="Amount" currency="INR" locale="en-IN" />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
