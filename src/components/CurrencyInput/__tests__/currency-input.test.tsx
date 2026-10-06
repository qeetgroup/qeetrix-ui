import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { CurrencyInput } from "@/components/CurrencyInput/currency-input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/Input/field";
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
    // At rest the amount is written the way the locale prints money.
    expect(input).toHaveValue("10.00");

    rerender(<CurrencyInput currency="USD" value={20} onValueChange={() => {}} />);
    expect(input).toHaveValue("20.00");
  });

  it("shows a controlled value verbatim when formatting is off", () => {
    render(
      <CurrencyInput currency="USD" value={10} onValueChange={() => {}} formatOnBlur={false} />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("10");
  });
});

describe("CurrencyInput formatting", () => {
  it("formats on blur with grouping and the currency's minor units", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Amount" locale="en-US" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Amount");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "1500" } });
    expect(input).toHaveValue("1500");
    fireEvent.blur(input);
    expect(input).toHaveValue("1,500.00");
    // The emitted number is the amount, not the formatting.
    expect(onValueChange).toHaveBeenLastCalledWith(1500);
  });

  it("formats in the locale's own notation, including lakh grouping", () => {
    render(<CurrencyInput aria-label="Amount" currency="INR" locale="en-IN" />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "1234567" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("12,34,567.00");
  });

  it("uses the currency's minor units — none for JPY", () => {
    render(<CurrencyInput aria-label="Amount" currency="JPY" locale="ja-JP" />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "1500" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("1,500");
  });

  it("never rounds away digits the user typed", () => {
    render(<CurrencyInput aria-label="Amount" locale="en-US" />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "10.555" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("10.555");
  });

  it("keeps accepting edits to its own formatted text", () => {
    const onValueChange = vi.fn();
    render(<CurrencyInput aria-label="Amount" locale="en-US" onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "1500" } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "1,500.50" } });
    expect(onValueChange).toHaveBeenLastCalledWith(1500.5);
  });

  it("leaves an unparseable draft alone on blur", () => {
    render(<CurrencyInput aria-label="Amount" locale="de-DE" currency="EUR" />);
    const input = screen.getByLabelText("Amount");
    fireEvent.change(input, { target: { value: "1.5" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("1.5");
  });
});

describe("CurrencyInput accessibility", () => {
  it("hides the symbol and describes the input with the currency's name", () => {
    render(<CurrencyInput aria-label="Amount" currency="INR" locale="en-IN" />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    expect(screen.getByText("₹")).toHaveAttribute("aria-hidden", "true");
    expect(input).toHaveAccessibleDescription(/Indian rupee/i);
  });

  it("takes its label, description and error from a Field", () => {
    render(
      <Field>
        <FieldLabel>Invoice total</FieldLabel>
        <CurrencyInput currency="EUR" locale="de-DE" />
        <FieldDescription>Including VAT.</FieldDescription>
        <FieldError>Enter an amount.</FieldError>
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Invoice total" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Including VAT\..*Enter an amount\..*Euro/);
  });
});
