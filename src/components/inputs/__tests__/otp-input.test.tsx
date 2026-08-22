import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Field, FieldLabel } from "@/components/inputs/field";
import { OTPInput } from "@/components/inputs/otp-input";
import { DirectionProvider } from "@/providers/direction-provider";

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

describe("OTPInput form participation", () => {
  const data = () => new FormData(screen.getByRole("form", { name: "verify" }) as HTMLFormElement);

  it("submits the joined code as one value, not one per box", () => {
    render(
      <form aria-label="verify">
        <OTPInput name="code" defaultValue="123456" aria-label="Code" />
      </form>,
    );
    expect([...data().entries()]).toEqual([["code", "123456"]]);
  });

  it("submits the code as it is typed", () => {
    render(
      <form aria-label="verify">
        <OTPInput name="code" length={3} aria-label="Code" />
      </form>,
    );
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "4" } });
    fireEvent.change(inputs[1], { target: { value: "2" } });
    expect(data().get("code")).toBe("42");
  });

  it("keeps the digit boxes out of the submission", () => {
    const { container } = render(
      <form aria-label="verify">
        <OTPInput name="code" defaultValue="99" length={2} aria-label="Code" />
      </form>,
    );
    for (const box of container.querySelectorAll('[data-slot="otp-input-digit"]')) {
      expect(box).not.toHaveAttribute("name");
    }
  });

  it("takes its group name from a Field label instead of the built-in fallback", () => {
    render(
      <Field>
        <FieldLabel>Verification code</FieldLabel>
        <OTPInput name="code" length={2} />
      </Field>,
    );
    expect(screen.getByRole("group", { name: "Verification code" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "One-time code" })).toBeNull();
  });

  it("keeps the built-in group name when there is no Field label", () => {
    render(<OTPInput length={2} />);
    expect(screen.getByRole("group", { name: "One-time code" })).toBeInTheDocument();
  });
});

describe("OTPInput direction", () => {
  it("mirrors box navigation in rtl", () => {
    render(
      <DirectionProvider direction="rtl">
        <OTPInput length={4} aria-label="Code" />
      </DirectionProvider>,
    );
    expect(screen.getByRole("group")).toHaveAttribute("data-direction", "rtl");
    const boxes = screen.getAllByRole("textbox");
    boxes[0].focus();
    // The digits keep their order; only the spatial mapping mirrors, so the key pointing at
    // the next box under `dir="rtl"` is ArrowLeft.
    fireEvent.keyDown(boxes[0], { key: "ArrowLeft" });
    expect(boxes[1]).toHaveFocus();
    fireEvent.keyDown(boxes[1], { key: "ArrowRight" });
    expect(boxes[0]).toHaveFocus();
  });

  it("keeps the ltr mapping when nothing declares a direction", () => {
    render(<OTPInput length={4} aria-label="Code" />);
    expect(screen.getByRole("group")).toHaveAttribute("data-direction", "ltr");
    const boxes = screen.getAllByRole("textbox");
    boxes[0].focus();
    fireEvent.keyDown(boxes[0], { key: "ArrowRight" });
    expect(boxes[1]).toHaveFocus();
  });
});
