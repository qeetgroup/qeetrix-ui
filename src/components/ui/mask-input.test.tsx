import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { applyMask, MaskInput, parseMask } from "@/components/ui/mask-input";

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
