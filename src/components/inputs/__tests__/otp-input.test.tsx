import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { OTPInput } from "@/components/inputs/otp-input";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

describe("OTPInput", () => {
  it("renders 6 inputs by default", () => {
    render(<OTPInput value="" onChange={vi.fn()} aria-label="One-time code" />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("renders a custom number of inputs", () => {
    render(<OTPInput value="" onChange={vi.fn()} length={4} aria-label="PIN" />);
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
  });

  it("populates input boxes from the value prop", () => {
    render(<OTPInput value="123456" onChange={vi.fn()} aria-label="Code" />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(inputs[0].value).toBe("1");
    expect(inputs[5].value).toBe("6");
  });

  it("calls onChange when a digit is typed", () => {
    const onChange = vi.fn();
    render(<OTPInput value="" onChange={onChange} aria-label="OTP" />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "7" } });
    expect(onChange).toHaveBeenCalledWith("7");
  });

  it("filters non-digit characters, and reports nothing when nothing changed", () => {
    const onChange = vi.fn();
    render(<OTPInput value="" onChange={onChange} aria-label="OTP" />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "a" } });
    // The letter is filtered out, so the box stays empty — that is the requirement.
    expect(inputs[0]).toHaveValue("");
    // And the value did not change, so onChange does not fire. A no-op notification would make a
    // consumer that debounces a verification request fire one for a keystroke that did nothing.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("accepts a defaultValue and owns the state when uncontrolled", () => {
    render(<OTPInput defaultValue="12" length={4} aria-label="OTP" />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveValue("1");
    expect(inputs[1]).toHaveValue("2");
    fireEvent.change(inputs[2], { target: { value: "3" } });
    expect(inputs[2]).toHaveValue("3");
  });

  it("calls onComplete when all boxes are filled", () => {
    const onComplete = vi.fn();
    const onChange = vi.fn();
    render(
      <OTPInput
        value="12345"
        onChange={onChange}
        onComplete={onComplete}
        length={6}
        aria-label="OTP"
      />,
    );
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[5], { target: { value: "6" } });
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("is disabled when disabled=true", () => {
    render(<OTPInput value="" onChange={vi.fn()} disabled aria-label="OTP" />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    inputs.forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it("has no axe violations", async () => {
    const { container } = render(
      <OTPInput value="123" onChange={vi.fn()} aria-label="Verification code" />,
    );
    expect(await a11y(container)).toHaveNoViolations();
  });
});
