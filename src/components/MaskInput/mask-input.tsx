"use client";

import * as React from "react";

import { Input } from "@/components/Input/input";

// ── Types ────────────────────────────────────────────────────────────────────

type InputSlotType = "#" | "A" | "*";

type SlotDef = { type: InputSlotType; char?: undefined } | { type: "literal"; char: string };

export interface MaskInputProps
  extends Omit<
    React.ComponentProps<"input">,
    "value" | "onChange" | "type" | "placeholder" | "defaultValue"
  > {
  /** The mask string. `#` = digit, `A` = alpha, `*` = alphanumeric, other = literal. */
  mask: string;
  /** Controlled formatted value. */
  value?: string;
  /** Uncontrolled initial formatted value. */
  defaultValue?: string;
  /**
   * Fires on every change.
   * @param raw - accepted characters only (no literals)
   * @param formatted - the masked display string
   */
  onValueChange?: (raw: string, formatted: string) => void;
  placeholder?: string;
  className?: string;
}

// ── parseMask ────────────────────────────────────────────────────────────────

/**
 * Parse a mask string into an array of slot definitions.
 *
 * | char | meaning |
 * |------|---------|
 * | `#`  | digit (0–9) |
 * | `A`  | alpha (a–z A–Z) |
 * | `*`  | alphanumeric |
 * | other | literal (auto-inserted, not editable) |
 */
export function parseMask(mask: string): { slots: SlotDef[] } {
  const slots: SlotDef[] = Array.from(mask).map((char) => {
    if (char === "#" || char === "A" || char === "*") {
      return { type: char };
    }
    return { type: "literal", char };
  });
  return { slots };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function matchesSlot(char: string, type: InputSlotType): boolean {
  if (type === "#") return /\d/.test(char);
  if (type === "A") return /[a-zA-Z]/.test(char);
  return /[a-zA-Z0-9]/.test(char); // "*"
}

function isInputSlot(s: SlotDef): s is { type: InputSlotType; char?: undefined } {
  return s.type !== "literal";
}

/**
 * Format `rawChars` with the mask, inserting literals automatically.
 * Stops as soon as `rawChars` are exhausted, so trailing literals are never
 * appended beyond the last user-typed character.
 */
export function applyMask(rawChars: string[], mask: string): string {
  const { slots } = parseMask(mask);
  let result = "";
  let rawIdx = 0;

  for (const slot of slots) {
    if (rawIdx >= rawChars.length) break;
    if (slot.type === "literal") {
      result += slot.char;
    } else {
      result += rawChars[rawIdx];
      rawIdx++;
    }
  }

  return result;
}

/**
 * Greedy extraction: scan `input` for characters that match the next expected
 * input-slot type in order. Literal characters (hyphens, slashes, spaces, …)
 * are skipped automatically because they don't satisfy a slot's type check.
 *
 * **Known limitation:** when a literal character shares its character class
 * with the adjacent input-slot type (e.g. the `1` in `+1 (###)…`), the greedy
 * scanner may consume it as a slot char. Prefer masks where literals are
 * non-alphanumeric (e.g. use `+## (###)…` so the country code is user-typed).
 */
function extractRaw(input: string, mask: string): string[] {
  const { slots } = parseMask(mask);
  const inputSlots = slots.filter(isInputSlot);
  const raw: string[] = [];
  let slotIdx = 0;

  for (const char of input) {
    if (slotIdx >= inputSlots.length) break;
    const slot = inputSlots[slotIdx];
    if (matchesSlot(char, slot.type)) {
      raw.push(char);
      slotIdx++;
    }
  }

  return raw;
}

/** Replace each input-slot char with `_`; keep literals as-is. */
function derivePlaceholder(mask: string): string {
  return Array.from(mask)
    .map((char) => (char === "#" || char === "A" || char === "*" ? "_" : char))
    .join("");
}

// ── MaskInput ────────────────────────────────────────────────────────────────

/**
 * `MaskInput` — a single `<Input>` element that formats user input according
 * to a declarative mask string.
 *
 * ```tsx
 * <MaskInput mask="+1 (###) ###-####" onValueChange={(raw, fmt) => …} />
 * <MaskInput mask="##/##/####" placeholder="DD/MM/YYYY" />
 * <MaskInput mask="AA## #### #### ####" aria-label="IBAN" />
 * <MaskInput mask="####-####-####-####" aria-label="Card number" />
 * ```
 *
 * Mask characters:
 * - `#` — accepts a single digit (0–9)
 * - `A` — accepts a single letter (a–z A–Z)
 * - `*` — accepts any alphanumeric character
 * - Any other character — treated as a literal (auto-inserted, non-editable)
 *
 * The component can be used in **controlled** mode by providing `value`
 * (formatted string) and `onValueChange`, or in **uncontrolled** mode via
 * `defaultValue`. `onValueChange` receives both the raw string (accepted
 * characters only, no literals) and the formatted string.
 *
 * `inputMode` is inferred automatically: `"numeric"` when all input slots are
 * `#`, `"text"` otherwise. Override via the `inputMode` prop.
 */
function MaskInput({
  mask,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  className,
  ...rest
}: MaskInputProps) {
  const { slots } = React.useMemo(() => parseMask(mask), [mask]);

  const inputSlots = React.useMemo(() => slots.filter(isInputSlot), [slots]);

  const slotCount = inputSlots.length;

  const autoInputMode = React.useMemo<"numeric" | "text">(
    () => (inputSlots.every((s) => s.type === "#") ? "numeric" : "text"),
    [inputSlots],
  );

  const [internalRaw, setInternalRaw] = React.useState<string[]>(() => {
    const init = defaultValue ?? "";
    const { slots: initSlots } = parseMask(mask);
    const count = initSlots.filter(isInputSlot).length;
    return extractRaw(init, mask).slice(0, count);
  });

  const isControlled = value !== undefined;
  const displayValue = isControlled ? value : applyMask(internalRaw, mask);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newRaw = extractRaw(e.target.value, mask).slice(0, slotCount);
    const formatted = applyMask(newRaw, mask);

    if (!isControlled) {
      setInternalRaw(newRaw);
    }

    onValueChange?.(newRaw.join(""), formatted);
  }

  return (
    <Input
      data-slot="mask-input"
      type="text"
      inputMode={autoInputMode}
      value={displayValue}
      placeholder={placeholder ?? derivePlaceholder(mask)}
      onChange={handleChange}
      className={className}
      {...rest}
    />
  );
}

export { MaskInput };
