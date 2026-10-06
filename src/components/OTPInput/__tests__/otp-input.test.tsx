import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Field, FieldError, FieldLabel } from "@/components/Input/field";
import { OTPInput } from "@/components/OTPInput/otp-input";
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
  it("keeps the code in number order under rtl, so the arrows follow the screen", () => {
    // A code is a number and numbers read left to right in Arabic and Hebrew too: mirroring the
    // boxes made a code copied from an SMS read backwards. The row is reversed under RTL so the
    // first digit stays on the left, and ArrowRight is the next digit in both directions.
    render(
      <DirectionProvider direction="rtl">
        <OTPInput length={4} defaultValue="1234" aria-label="Code" />
      </DirectionProvider>,
    );
    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("data-direction", "rtl");
    expect(group.className).toMatch(/data-\[direction=rtl\]:flex-row-reverse/);
    const boxes = screen.getAllByRole("textbox");
    boxes[0].focus();
    fireEvent.keyDown(boxes[0], { key: "ArrowRight" });
    expect(boxes[1]).toHaveFocus();
    fireEvent.keyDown(boxes[1], { key: "ArrowLeft" });
    expect(boxes[0]).toHaveFocus();
  });

  it("keeps the ltr mapping when nothing declares a direction", () => {
    render(<OTPInput length={4} defaultValue="1234" aria-label="Code" />);
    expect(screen.getByRole("group")).toHaveAttribute("data-direction", "ltr");
    const boxes = screen.getAllByRole("textbox");
    boxes[0].focus();
    fireEvent.keyDown(boxes[0], { key: "ArrowRight" });
    expect(boxes[1]).toHaveFocus();
  });
});

describe("OTPInput one-time-code behaviour", () => {
  it("spreads an autofilled code that lands in one box across all of them", () => {
    const onComplete = vi.fn();
    render(<OTPInput aria-label="Code" onComplete={onComplete} />);
    const boxes = screen.getAllByRole("textbox") as HTMLInputElement[];
    // iOS "From Messages" and password managers insert the whole code into the focused box.
    fireEvent.change(boxes[0], { target: { value: "482913" } });
    expect(boxes.map((b) => b.value).join("")).toBe("482913");
    expect(onComplete).toHaveBeenCalledWith("482913");
  });

  it("does not truncate autofill with a per-box maxLength", () => {
    render(<OTPInput aria-label="Code" />);
    for (const box of screen.getAllByRole("textbox")) {
      expect(box).not.toHaveAttribute("maxlength");
      expect(box).toHaveAttribute("autocomplete", "one-time-code");
      expect(box).toHaveAttribute("inputmode", "numeric");
    }
  });

  it("keeps the new keystroke when typing beside an existing digit", () => {
    const onChange = vi.fn();
    render(<OTPInput length={4} defaultValue="1" onChange={onChange} aria-label="Code" />);
    const boxes = screen.getAllByRole("textbox");
    fireEvent.change(boxes[0], { target: { value: "17" } });
    expect(onChange).toHaveBeenLastCalledWith("7");
  });

  it("pastes a whole code from the first box, wherever it was pasted", () => {
    render(<OTPInput length={4} defaultValue="12" aria-label="Code" />);
    const boxes = screen.getAllByRole("textbox") as HTMLInputElement[];
    fireEvent.paste(boxes[1], { clipboardData: { getData: () => "9 8 7 6" } });
    expect(boxes.map((b) => b.value).join("")).toBe("9876");
  });

  it("continues a pasted fragment from the box it was pasted into", () => {
    render(<OTPInput length={6} defaultValue="12" aria-label="Code" />);
    const boxes = screen.getAllByRole("textbox") as HTMLInputElement[];
    fireEvent.paste(boxes[2], { clipboardData: { getData: () => "34" } });
    expect(boxes.map((b) => b.value).join("")).toBe("1234");
    expect(boxes[4]).toHaveFocus();
  });

  it("never lets focus land beyond the first empty box, so the code has no holes", () => {
    render(<OTPInput length={6} defaultValue="12" aria-label="Code" />);
    const boxes = screen.getAllByRole("textbox");
    boxes[4].focus();
    expect(boxes[2]).toHaveFocus();
  });

  it("still advances focus as each digit is typed", () => {
    render(<OTPInput length={3} aria-label="Code" />);
    const boxes = screen.getAllByRole("textbox");
    boxes[0].focus();
    fireEvent.change(boxes[0], { target: { value: "4" } });
    expect(boxes[1]).toHaveFocus();
    fireEvent.change(boxes[1], { target: { value: "2" } });
    expect(boxes[2]).toHaveFocus();
  });

  it("is a single tab stop on the typing position", () => {
    render(<OTPInput length={4} defaultValue="12" aria-label="Code" />);
    const tabbable = screen.getAllByRole("textbox").map((b) => b.getAttribute("tabindex"));
    expect(tabbable).toEqual(["-1", "-1", "0", "-1"]);
  });

  it("honours autoFocus on the first box", () => {
    render(<OTPInput length={4} autoFocus aria-label="Code" />);
    expect(screen.getAllByRole("textbox")[0]).toHaveFocus();
  });

  it("marks every box invalid inside an errored Field", () => {
    render(
      <Field>
        <FieldLabel>Code</FieldLabel>
        <OTPInput length={2} />
        <FieldError>That code has expired.</FieldError>
      </Field>,
    );
    for (const box of screen.getAllByRole("textbox")) {
      expect(box).toHaveAttribute("aria-invalid", "true");
    }
  });

  it("draws decorative group separators without adding boxes or names", async () => {
    const { container } = render(<OTPInput length={6} groupSize={3} aria-label="Code" />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
    const separators = container.querySelectorAll("[data-slot=otp-input-separator]");
    expect(separators).toHaveLength(1);
    expect(separators[0]).toHaveAttribute("aria-hidden", "true");
    expect(await a11y(container)).toHaveNoViolations();
  });
});
