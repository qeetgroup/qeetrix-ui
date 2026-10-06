"use client";

import * as React from "react";

import { Input } from "@/components/Input/input";
import { cn } from "@/lib/utils";

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
 * Mask-aligned extraction: walk `input` and the mask together, collecting the characters that
 * fill input slots.
 *
 * A character that equals the literal the mask expects at that position is the literal itself
 * and is consumed as such — that is what keeps the `1` of `+1 (###) …` from being read as the
 * first digit every time the user types into an already-formatted value. Any other character
 * skips forward over literals (they are auto-inserted) and is kept if the next input slot accepts
 * it, so raw pastes (`5551234567`) and pastes in a foreign format (`555.123.4567`) both work.
 */
function scanInput(input: string, mask: string): { raw: string[]; tail: string } {
  const { slots } = parseMask(mask);
  const raw: string[] = [];
  let pos = 0;
  // Literals the user typed after the last accepted character. `applyMask` stops at the last
  // raw character, so without this a typed literal vanished from the display — and the next
  // keystroke equal to it (the first `0` of `001234` after `AAAA0`) was read as the literal
  // again and swallowed: `HDFC0001234` came out as `HDFC01234`.
  let tail = "";

  for (const char of input) {
    if (pos >= slots.length) break;
    const slot = slots[pos];
    // Literals compare case-insensitively: `inv-` typed into `INV-####` is the prefix.
    if (slot.type === "literal" && slot.char.toLowerCase() === char.toLowerCase()) {
      tail += slot.char;
      pos++;
      continue;
    }
    let next = pos;
    while (next < slots.length && slots[next].type === "literal") next++;
    const target = slots[next];
    if (target && target.type !== "literal" && matchesSlot(char, target.type)) {
      raw.push(char);
      tail = "";
      pos = next + 1;
    }
  }

  return { raw, tail };
}

function extractRaw(input: string, mask: string): string[] {
  return scanInput(input, mask).raw;
}

/**
 * The displayed value: the mask applied to `raw`, then any literal the user typed past it.
 * A full value has no room for a tail, so one is dropped when `raw` fills every slot.
 */
function display(raw: string[], tail: string, mask: string, slotCount: number): string {
  return applyMask(raw, mask) + (raw.length < slotCount ? tail : "");
}

/**
 * Where the caret belongs in the formatted value once `count` raw characters precede it: just
 * after the `count`-th filled slot, or 0 when none do.
 */
function caretAfterSlots(formatted: string, mask: string, count: number): number {
  if (count <= 0) return 0;
  const { slots } = parseMask(mask);
  let seen = 0;
  for (let i = 0; i < formatted.length && i < slots.length; i++) {
    if (slots[i].type !== "literal") {
      seen++;
      if (seen === count) return i + 1;
    }
  }
  return formatted.length;
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
 *
 * Editing behaves like a plain text field: the caret stays where the user was typing when the
 * value is reformatted, Backspace and Delete step over auto-inserted literals and remove the
 * character beyond them, and pasting either a raw or a formatted value works. A literal the user
 * types is kept (and compared case-insensitively), so `HDFC0001234` typed into `AAAA0******`
 * reads back unchanged. `onValueChange` fires when the accepted characters change, or when the
 * displayed value does (a typed literal) — never for a keystroke the mask rejected.
 *
 * Accessibility: it is one native textbox, so the value is announced as displayed. The derived
 * placeholder (`__/__/____`) is read aloud character by character and disappears on input, so
 * state the expected format in a `FieldDescription` ("DD/MM/YYYY") rather than relying on it.
 * Browser autofill and spellcheck are off by default, as a masked value is rarely what either
 * would offer; pass `autoComplete` (`"tel"`, `"cc-number"`, …) to opt back in.
 *
 * Direction: the value is `dir="ltr"` — a phone number or IBAN reads left to right in Arabic
 * and Hebrew too — and right-aligned inside an RTL form. Pass `dir` to override.
 */
function MaskInput({
  mask,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  className,
  onKeyDown,
  ref,
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
  const [internalTail, setInternalTail] = React.useState("");

  const isControlled = value !== undefined;
  // A controlled value is normalised through the mask, so a parent that hands back the raw
  // string (`"5551234567"`) still renders formatted, and a formatted one renders unchanged.
  const controlled = isControlled ? scanInput(value, mask) : null;
  const currentRaw = controlled ? controlled.raw.slice(0, slotCount) : internalRaw;
  const currentTail = controlled ? controlled.tail : internalTail;
  const displayValue = display(currentRaw, currentTail, mask, slotCount);

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const setRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );
  // Reformatting replaces the input's value, which sends the caret to the end. The caret
  // position is recorded in mask terms (how many raw characters precede it) and restored after
  // the formatted value is committed, so editing the middle of a value stays in the middle.
  const pendingCaret = React.useRef<number | null>(null);
  React.useLayoutEffect(() => {
    const caret = pendingCaret.current;
    const el = inputRef.current;
    pendingCaret.current = null;
    if (caret == null || !el || el.ownerDocument.activeElement !== el) return;
    el.setSelectionRange(caret, caret);
  });

  // Every edit re-renders, even one the mask rejected outright: React restores the controlled
  // value after the event, and only a render lets the caret be put back where it was.
  const [, rerender] = React.useReducer((n: number) => n + 1, 0);

  function commit(nextRaw: string[], caret: number | null, tail = "") {
    const formatted = display(nextRaw, tail, mask, slotCount);
    pendingCaret.current = caret;
    rerender();
    if (!isControlled) setInternalTail(tail);
    // A typed literal changes the display but not the accepted characters; it is still reported,
    // so a controlled parent that stores `formatted` keeps it.
    if (nextRaw.join("") === currentRaw.join("") && formatted === displayValue) return;
    if (!isControlled) setInternalRaw(nextRaw);
    onValueChange?.(nextRaw.join(""), formatted);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const scanned = scanInput(el.value, mask);
    const newRaw = scanned.raw.slice(0, slotCount);
    const tail = scanned.raw.length > slotCount ? "" : scanned.tail;
    const caretAt = el.selectionStart ?? el.value.length;
    const rawBeforeCaret = Math.min(extractRaw(el.value.slice(0, caretAt), mask).length, slotCount);
    const formatted = display(newRaw, tail, mask, slotCount);
    const caret =
      caretAt >= el.value.length
        ? formatted.length
        : caretAfterSlots(formatted, mask, rawBeforeCaret);
    commit(newRaw, caret, tail);
  }

  // Backspace / Delete next to an auto-inserted literal deletes the slot character beyond it,
  // rather than deleting the literal (which the mask would immediately put back, leaving the key
  // apparently dead).
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e);
    if (e.defaultPrevented || (e.key !== "Backspace" && e.key !== "Delete")) return;
    const el = e.currentTarget;
    const start = el.selectionStart;
    if (start == null || start !== el.selectionEnd) return;
    const back = e.key === "Backspace";
    const probe = back ? start - 1 : start;
    if (probe < 0 || probe >= displayValue.length || slots[probe]?.type !== "literal") return;

    let at = probe;
    while (at >= 0 && at < displayValue.length && slots[at]?.type === "literal") {
      at += back ? -1 : 1;
    }
    e.preventDefault();
    if (at < 0 || at >= displayValue.length) {
      // Only literals between the caret and the edge: move past them, delete nothing.
      const edge = back ? 0 : displayValue.length;
      el.setSelectionRange(edge, edge);
      return;
    }
    const rawIndex = slots.slice(0, at).filter(isInputSlot).length;
    const nextRaw = currentRaw.filter((_, i) => i !== rawIndex);
    const formatted = applyMask(nextRaw, mask);
    commit(nextRaw, back ? Math.min(at, formatted.length) : Math.min(start, formatted.length));
  }

  return (
    <Input
      ref={setRef}
      data-slot="mask-input"
      type="text"
      // Masked values — phone, card, IBAN, dates — are left-to-right data in every script. In an
      // RTL form the value keeps that order and is aligned to the form's start edge.
      dir="ltr"
      inputMode={autoInputMode}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      value={displayValue}
      placeholder={placeholder ?? derivePlaceholder(mask)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={cn("rtl:text-right", className)}
      {...rest}
    />
  );
}

export { MaskInput };
