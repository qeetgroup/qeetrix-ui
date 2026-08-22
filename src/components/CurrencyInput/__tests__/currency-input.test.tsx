import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CurrencyInput } from "@/components/CurrencyInput/currency-input";
import { DirectionProvider } from "@/providers/direction-provider";

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

describe("CurrencyInput locale", () => {
  it("accepts the decimal separator the locale writes", () => {
    const onValueChange = vi.fn();
    render(
      <CurrencyInput
        aria-label="Amount"
        currency="EUR"
        locale="de-DE"
        onValueChange={onValueChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1234,56" } });
    expect(onValueChange).toHaveBeenLastCalledWith(1234.56);
  });

  it("does not silently truncate an ambiguous amount", () => {
    // Number.parseFloat("1.5") is 1.5, which in German is one thousand five hundred. Neither
    // reading may be guessed for money.
    const onValueChange = vi.fn();
    render(
      <CurrencyInput
        aria-label="Amount"
        currency="EUR"
        locale="de-DE"
        onValueChange={onValueChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1.5" } });
    expect(onValueChange).toHaveBeenLastCalledWith(undefined);
  });

  it("takes its locale from a DirectionProvider", () => {
    const onValueChange = vi.fn();
    render(
      <DirectionProvider locale="de-DE">
        <CurrencyInput aria-label="Amount" currency="EUR" onValueChange={onValueChange} />
      </DirectionProvider>,
    );
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "9,5" } });
    expect(onValueChange).toHaveBeenLastCalledWith(9.5);
  });

  it("lets an explicit locale prop beat the provider", () => {
    const onValueChange = vi.fn();
    render(
      <DirectionProvider locale="de-DE">
        <CurrencyInput
          aria-label="Amount"
          currency="USD"
          locale="en-US"
          onValueChange={onValueChange}
        />
      </DirectionProvider>,
    );
    // "9,5" is not a number in en-US: a group separator followed by one digit.
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "9,5" } });
    expect(onValueChange).toHaveBeenLastCalledWith(undefined);
  });

  it("accepts the digits an Arabic-Indic locale writes", () => {
    const onValueChange = vi.fn();
    render(
      <CurrencyInput
        aria-label="Amount"
        currency="EGP"
        locale="ar-EG"
        onValueChange={onValueChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "\u0661\u0662\u0663\u0664" },
    });
    expect(onValueChange).toHaveBeenLastCalledWith(1234);
  });
});

// Uncontrolled, the reflect-external-value effect compared a parsed number against an undefined
// `value`, found them different, and reset the text — so the field cleared itself after every
// keystroke and the component was controlled-only without saying so.
describe("CurrencyInput uncontrolled", () => {
  it("keeps what the user typed when no value prop is given", () => {
    render(<CurrencyInput currency="USD" />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "1500" } });
    expect(input).toHaveValue("1500");

    fireEvent.change(input, { target: { value: "1500.25" } });
    expect(input).toHaveValue("1500.25");
  });

  it("still lets a controlled value win", () => {
    const { rerender } = render(
      <CurrencyInput currency="USD" value={10} onValueChange={() => {}} />,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("10");

    rerender(<CurrencyInput currency="USD" value={20} onValueChange={() => {}} />);
    expect(input).toHaveValue("20");
  });
});
