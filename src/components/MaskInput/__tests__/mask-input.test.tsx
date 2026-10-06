import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { applyMask, MaskInput, parseMask } from "@/components/MaskInput/mask-input";

const a11y = (c: Element) => axe(c, { rules: { "color-contrast": { enabled: false } } });

// ── parseMask ────────────────────────────────────────────────────────────────

describe("parseMask", () => {
  it("parses a digit mask", () => {
    const { slots } = parseMask("##-##");
    expect(slots).toHaveLength(5);
    expect(slots[0]).toEqual({ type: "#" });
    expect(slots[1]).toEqual({ type: "#" });
    expect(slots[2]).toEqual({ type: "literal", char: "-" });
    expect(slots[3]).toEqual({ type: "#" });
    expect(slots[4]).toEqual({ type: "#" });
  });

  it("parses an IBAN prefix mask (alpha + digit slots, space literal)", () => {
    const { slots } = parseMask("AA## ####");
    expect(slots).toHaveLength(9);
    expect(slots[0]).toEqual({ type: "A" });
    expect(slots[1]).toEqual({ type: "A" });
    expect(slots[2]).toEqual({ type: "#" });
    expect(slots[3]).toEqual({ type: "#" });
    expect(slots[4]).toEqual({ type: "literal", char: " " });
    expect(slots[5]).toEqual({ type: "#" });
    expect(slots[6]).toEqual({ type: "#" });
    expect(slots[7]).toEqual({ type: "#" });
    expect(slots[8]).toEqual({ type: "#" });
  });

  it("parses a mixed alphanumeric mask", () => {
    const { slots } = parseMask("*#A");
    expect(slots).toHaveLength(3);
    expect(slots[0]).toEqual({ type: "*" });
    expect(slots[1]).toEqual({ type: "#" });
    expect(slots[2]).toEqual({ type: "A" });
  });
});

// ── applyMask ────────────────────────────────────────────────────────────────

describe("applyMask", () => {
  it("formats a full digit mask", () => {
    expect(applyMask(["1", "2", "3", "4"], "##-##")).toBe("12-34");
  });

  it("formats a partial IBAN prefix mask", () => {
    expect(applyMask(["G", "B", "2", "9", "1", "2", "3", "4"], "AA## ####")).toBe("GB29 1234");
  });

  it("stops filling after rawChars are exhausted (no trailing literals)", () => {
    // Only 2 chars — the '-' literal at position 2 should NOT appear
    expect(applyMask(["1", "2"], "##-##")).toBe("12");
  });

  it("returns empty string for empty rawChars", () => {
    expect(applyMask([], "##-##")).toBe("");
  });

  it("formats a credit-card mask", () => {
    const raw = "1234567890123456".split("");
    expect(applyMask(raw, "####-####-####-####")).toBe("1234-5678-9012-3456");
  });

  it("formats a date mask", () => {
    expect(applyMask(["2", "5", "1", "2", "2", "0", "2", "5"], "##/##/####")).toBe("25/12/2025");
  });
});

// ── MaskInput ────────────────────────────────────────────────────────────────

describe("MaskInput", () => {
  it("renders an input element", () => {
    render(<MaskInput mask="##-##" aria-label="Short code" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows the derived placeholder by default (# and A replaced with _)", () => {
    render(<MaskInput mask="##/##/####" aria-label="Date" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.placeholder).toBe("__/__/____");
  });

  it("accepts a custom placeholder", () => {
    render(<MaskInput mask="##/##/####" placeholder="DD/MM/YYYY" aria-label="Date" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.placeholder).toBe("DD/MM/YYYY");
  });

  it("typing raw digits into a US phone mask yields the formatted value", () => {
    render(<MaskInput mask="+1 (###) ###-####" aria-label="Phone" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1234567890" } });
    expect(input.value).toBe("+1 (123) 456-7890");
  });

  it("calls onValueChange with the correct raw string and formatted string", () => {
    const onValueChange = vi.fn();
    render(<MaskInput mask="+1 (###) ###-####" onValueChange={onValueChange} aria-label="Phone" />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "1234567890" } });
    expect(onValueChange).toHaveBeenCalledWith("1234567890", "+1 (123) 456-7890");
  });

  it("formats a date input correctly", () => {
    const onValueChange = vi.fn();
    render(<MaskInput mask="##/##/####" onValueChange={onValueChange} aria-label="Date" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "25122025" } });
    expect(input.value).toBe("25/12/2025");
    expect(onValueChange).toHaveBeenCalledWith("25122025", "25/12/2025");
  });

  it("strips non-matching characters (alphas in a digit-only mask)", () => {
    const onValueChange = vi.fn();
    render(<MaskInput mask="##-##" onValueChange={onValueChange} aria-label="Code" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    // "ab12cd34" — letters are filtered; only digits pass the '#' slots
    fireEvent.change(input, { target: { value: "ab12cd34" } });
    expect(input.value).toBe("12-34");
    expect(onValueChange).toHaveBeenCalledWith("1234", "12-34");
  });

  it("clamps input to the number of available input slots", () => {
    render(<MaskInput mask="##-##" aria-label="Code" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "123456789" } });
    // mask has only 4 digit slots → only the first 4 digits are used
    expect(input.value).toBe("12-34");
  });

  it("accepts a controlled value and renders it as-is", () => {
    render(<MaskInput mask="##/##/####" value="25/12/2025" aria-label="Date" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("25/12/2025");
  });

  it("uses inputMode=numeric when all slots are digit slots", () => {
    render(<MaskInput mask="####-####-####-####" aria-label="Card" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("inputmode", "numeric");
  });

  it("uses inputMode=text when the mask has non-digit input slots", () => {
    render(<MaskInput mask="AA## ####" aria-label="IBAN" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("inputmode", "text");
  });

  it("has no axe violations", async () => {
    const { container } = render(<MaskInput mask="##/##/####" aria-label="Date of birth" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});

// ── Editing behaviour ────────────────────────────────────────────────────────

describe("MaskInput editing", () => {
  it("types one key at a time into a mask whose literal is a digit", async () => {
    // The greedy extractor used to read the `1` of `+1 (` as the first digit on every keystroke
    // after the first, so typing 555 produced "+1 (155".
    const user = userEvent.setup();
    render(<MaskInput mask="+1 (###) ###-####" aria-label="Phone" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    await user.type(input, "5551234567");
    expect(input.value).toBe("+1 (555) 123-4567");
  });

  it("keeps the caret where the user is typing when the value is reformatted", async () => {
    const user = userEvent.setup();
    render(<MaskInput mask="####-####" defaultValue="1234-5678" aria-label="Code" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(2, 2);
    await user.keyboard("9");
    // The 9 lands after "12"; everything shifts right and the overflow drops off the end.
    expect(input.value).toBe("1293-4567");
    expect(input.selectionStart).toBe(3);
  });

  it("Backspace after a literal deletes the character before it", () => {
    const onValueChange = vi.fn();
    render(
      <MaskInput mask="##-##" defaultValue="12-34" onValueChange={onValueChange} aria-label="C" />,
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(3, 3); // just after the "-"
    fireEvent.keyDown(input, { key: "Backspace" });
    expect(input.value).toBe("13-4");
    expect(onValueChange).toHaveBeenLastCalledWith("134", "13-4");
  });

  it("Delete before a literal deletes the character after it", () => {
    render(<MaskInput mask="##-##" defaultValue="12-34" aria-label="C" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(2, 2); // just before the "-"
    fireEvent.keyDown(input, { key: "Delete" });
    expect(input.value).toBe("12-4");
  });

  it("accepts a paste in a foreign format", () => {
    render(<MaskInput mask="(###) ###-####" aria-label="Phone" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "555.123.4567" } });
    expect(input.value).toBe("(555) 123-4567");
  });

  it("formats a controlled raw value", () => {
    render(<MaskInput mask="##/##/####" value="25122025" aria-label="Date" />);
    expect(screen.getByRole("textbox")).toHaveValue("25/12/2025");
  });

  it("does not report a change when the mask rejected the keystroke", () => {
    const onValueChange = vi.fn();
    render(
      <MaskInput mask="##-##" defaultValue="12" onValueChange={onValueChange} aria-label="C" />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "12a" } });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("forwards a consumer ref to the input", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<MaskInput mask="##" ref={ref} aria-label="C" />);
    expect(ref.current).toBe(screen.getByRole("textbox"));
  });

  it("turns off autofill and spellcheck by default, but lets them be opted into", () => {
    const { rerender } = render(<MaskInput mask="##" aria-label="C" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("autocomplete", "off");
    expect(screen.getByRole("textbox")).toHaveAttribute("spellcheck", "false");
    rerender(<MaskInput mask="##" aria-label="C" autoComplete="tel" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("autocomplete", "tel");
  });
});

describe("MaskInput typed literals (integration pass)", () => {
  it("keeps a typed literal, so the next equal character fills a slot (IFSC)", async () => {
    // `0` is a literal in AAAA0******. Typed key by key, the literal used to vanish from the
    // display and the code's own leading zeros were then read as the literal again.
    const user = userEvent.setup();
    render(<MaskInput mask="AAAA0******" aria-label="IFSC" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    await user.type(input, "HDFC0001234");
    expect(input.value).toBe("HDFC0001234");
  });

  it("matches a literal regardless of case", async () => {
    const user = userEvent.setup();
    render(<MaskInput mask="INV-####" aria-label="Invoice" />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    await user.type(input, "inv-2024");
    expect(input.value).toBe("INV-2024");
  });

  it("round-trips a typed literal through a controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = React.useState("");
      return (
        <MaskInput
          mask="AAAA0******"
          aria-label="IFSC"
          value={value}
          onValueChange={(_raw, formatted) => setValue(formatted)}
        />
      );
    }
    render(<Controlled />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    await user.type(input, "SBIN0004321");
    expect(input.value).toBe("SBIN0004321");
  });
});
