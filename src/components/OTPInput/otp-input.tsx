"use client";

import * as React from "react";
import { FieldHiddenInput, useFieldControl } from "@/components/Input/field";
import { useControllableState } from "@/hooks/use-controllable-state";
import { fieldSurface } from "@/internal/field-styles";
import type { MessagesFor } from "@/lib/messages";
import { otpInputMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useResolvedDirection } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

interface OTPInputProps {
  /** Number of digit boxes. Defaults to 6 (RFC 6238 / standard OTP). */
  length?: number;
  /** Controlled value — the joined digit string, 0..length chars long. */
  value?: string;
  /** Initial value when uncontrolled. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Fires when every box is filled with a digit. */
  onComplete?: (value: string) => void;
  /** Submits the joined code under this name. Omit and nothing is serialised. */
  name?: string;
  /** Associate the submitted value with a form it is not nested inside, by form `id`. */
  form?: string;
  /**
   * Marks every digit box `required`. Unlike most composites this *is* browser-enforced:
   * the boxes are real, focusable text inputs, so an empty code blocks submission and
   * `:invalid` matches.
   */
  required?: boolean;
  /** Applied to the group, so a `Field` label and description resolve against it. */
  id?: string;
  /**
   * Visually split the boxes into groups of this size — `3` renders a 6-digit code as
   * `123 – 456`, which is easier to read back and to copy from a phone. The divider is
   * decorative: the code is still one value and one sequence of boxes.
   */
  groupSize?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"otpInput">;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}

/**
 * OTPInput renders `length` single-digit boxes used for entering MFA codes
 * (TOTP, email OTP, SMS OTP). It auto-advances on input, supports
 * backspace-to-prev, arrow-key navigation, and pastes a full code into
 * any box. Only digits are accepted; non-digit input is filtered.
 *
 * One-time-code semantics: every box is `autocomplete="one-time-code"` with a numeric keypad
 * (`inputMode="numeric"`), and there is no per-box `maxLength`, so an SMS or password-manager
 * autofill that drops the whole code into one box is spread across all of them rather than
 * truncated to its first digit. Focus can never land beyond the first empty box — clicking box
 * five of an empty code focuses box one — so the code is always contiguous and never submits
 * with a hole in it.
 *
 * Keyboard: the code is one tab stop (a roving tabindex on the typing position), so Tab and
 * Shift+Tab move past it in one step; ArrowLeft/ArrowRight, Home and End move between filled
 * boxes, and Backspace on an empty box clears and returns to the previous.
 *
 * Direction: a code is a number, and numbers read left to right in every script, so under RTL
 * the first digit stays on the left (the row is reversed, and the group still aligns to the
 * inline start) and ArrowRight still means "next digit". Mirroring the boxes made a code copied
 * from an SMS read backwards on screen.
 *
 * Controlled or uncontrolled: pass `value` to own the joined string, or `defaultValue` and let
 * the component own it. `onChange` fires with the new joined string on every edit in both modes.
 * `onComplete` fires once when all boxes are filled.
 *
 * Forms: implements the composite-field contract (see `field.tsx`). Inside a `Field` the group
 * takes the label, description and error association; `name` submits the joined code as one
 * value; and `required` is genuine constraint validation because the digit boxes are native
 * inputs. The individual boxes are never named for submission — a six-part code posted as six
 * fields is not what a server asked for.
 */
function OTPInput({
  length = 6,
  value: valueProp,
  defaultValue = "",
  onChange,
  onComplete,
  name,
  form,
  required,
  id,
  groupSize,
  autoFocus,
  disabled,
  messages: messageOverrides,
  className,
  ...aria
}: OTPInputProps) {
  const messages = useMessages("otpInput", otpInputMessages, messageOverrides);
  const [value, setValue] = useControllableState<string>({
    value: valueProp,
    defaultValue,
    onChange,
  });
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);
  const rootRef = React.useRef<HTMLFieldSetElement>(null);
  const direction = useResolvedDirection(rootRef);
  const uid = React.useId();

  const digits = React.useMemo(
    () => Array.from({ length }, (_, i) => value[i] ?? ""),
    [value, length],
  );
  // The typing position: the first empty box, or the last one once the code is complete. It is
  // the group's single tab stop.
  const activeIndex = Math.min(value.length, length - 1);

  // Stable per-position keys so React never remounts a box on re-render
  // (the index is positional but biome forbids using it directly as a key).
  const boxKeys = React.useMemo(
    () => Array.from({ length }, (_, i) => `${uid}-${i}`),
    [uid, length],
  );

  const focusAt = (idx: number) => {
    const i = Math.max(0, Math.min(length - 1, idx));
    const el = inputsRef.current[i];
    if (el) {
      el.focus();
      // Selecting on focus makes overtyping replace the digit cleanly.
      el.select();
    }
  };

  // The digits as of the last edit, ahead of the re-render: focus moves inside the change
  // handler, so the focus guard below must see the digit that was just typed.
  const latest = React.useRef(digits);
  latest.current = digits;

  const emit = (next: string[]) => {
    latest.current = Array.from({ length }, (_, i) => next.join("")[i] ?? "");
    const joined = next.join("");
    setValue(joined);
    if (joined.length === length && next.every((d) => d !== "")) {
      onComplete?.(joined);
    }
  };

  /** Write `text` into the boxes from `start`, then focus the box after it. */
  const distribute = (text: string, start: number) => {
    const next = [...latest.current];
    for (let i = 0; i < text.length && start + i < length; i++) next[start + i] = text[i] ?? "";
    emit(next);
    focusAt(Math.min(start + text.length, length - 1));
  };

  const handleChange = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, "");
    const previous = digits[idx] ?? "";
    let digit = cleaned;
    if (cleaned.length === 2 && previous && cleaned.includes(previous)) {
      // Typed over a digit the caret sat beside rather than one that was selected: keep the
      // new keystroke, not the old digit.
      digit = cleaned[0] === previous ? (cleaned[1] ?? "") : (cleaned[0] ?? "");
    } else if (cleaned.length > 1) {
      // More than one digit at once is autofill (iOS "From Messages", a password manager) or a
      // paste that bypassed onPaste. A full code fills from the first box wherever it landed.
      distribute(cleaned, cleaned.length >= length ? 0 : idx);
      return;
    }
    const next = [...digits];
    next[idx] = digit;
    emit(next);
    if (digit && idx < length - 1) focusAt(idx + 1);
  };

  // Keep the code contiguous: a box past the first empty one is never the typing position.
  const handleFocus = (idx: number) => (e: React.FocusEvent<HTMLInputElement>) => {
    const firstEmpty = latest.current.indexOf("");
    if (firstEmpty !== -1 && idx > firstEmpty) {
      focusAt(firstEmpty);
      return;
    }
    e.currentTarget.select();
  };

  const handleKeyDown = (idx: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[idx] === "" && idx > 0) {
        e.preventDefault();
        const next = [...digits];
        next[idx - 1] = "";
        emit(next);
        focusAt(idx - 1);
      }
      // Else: let the native backspace clear the current digit; the change handler
      // will pick that up and propagate.
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      // A code is a number, and numbers are written left to right in every script — Arabic and
      // Hebrew included — so the boxes keep that reading order under `dir="rtl"` (see the row
      // reversal below) and the arrow keys follow what is on screen: ArrowRight is always the
      // next digit.
      e.preventDefault();
      focusAt(e.key === "ArrowRight" ? idx + 1 : idx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusAt(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusAt(length - 1);
    }
  };

  const handlePaste = (idx: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    // A whole code replaces whatever is there; a fragment continues from the box it was
    // pasted into.
    distribute(text.slice(0, length), text.length >= length ? 0 : idx);
  };

  // `autoFocus` used to be accepted and dropped. It focuses the first box once, on mount.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only by design
  React.useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, []);

  const field = useFieldControl({
    id,
    "aria-label": aria["aria-label"],
    "aria-describedby": aria["aria-describedby"],
    "aria-invalid": aria["aria-invalid"],
  });
  // A Field label wins over the built-in fallback; without one the group still needs a name.
  const groupLabel = field["aria-labelledby"] ? undefined : (aria["aria-label"] ?? messages.label);

  return (
    <fieldset
      ref={rootRef}
      data-slot="otp-input"
      data-direction={direction}
      id={field.id}
      aria-label={groupLabel}
      aria-labelledby={field["aria-labelledby"]}
      aria-describedby={field["aria-describedby"]}
      aria-errormessage={field["aria-errormessage"]}
      aria-invalid={field["aria-invalid"]}
      className={cn(
        // Under RTL the row is reversed rather than given `dir="ltr"`: the digits read left to
        // right, as a number does, while the group still sits at the inline start of the form.
        "flex min-w-0 items-center gap-2 border-0 p-0 data-[direction=rtl]:flex-row-reverse data-[direction=rtl]:justify-end",
        className,
      )}
    >
      <FieldHiddenInput name={name} value={value} form={form} disabled={disabled} />
      {boxKeys.map((boxKey, i) => (
        <React.Fragment key={boxKey}>
          {groupSize && groupSize > 0 && i > 0 && i % groupSize === 0 ? (
            <span
              aria-hidden="true"
              data-slot="otp-input-separator"
              className="h-px w-2.5 shrink-0 rounded-full bg-border-strong"
            />
          ) : null}
          <input
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d*"
            value={digits[i] ?? ""}
            onChange={handleChange(i)}
            onKeyDown={handleKeyDown(i)}
            onPaste={handlePaste(i)}
            onFocus={handleFocus(i)}
            tabIndex={i === activeIndex ? 0 : -1}
            disabled={disabled}
            required={required}
            aria-label={messages.digit(i + 1, length)}
            aria-invalid={field["aria-invalid"]}
            data-slot="otp-input-digit"
            data-filled={digits[i] ? "" : undefined}
            className={cn(
              fieldSurface,
              // Wide enough for a thumb, and shrinking rather than overflowing in a narrow
              // column: up to 48px each, never below 32px. Height tracks density.
              "h-[calc(var(--qx-component-input-height)+1rem)] max-w-12 min-w-8 flex-1 basis-0 p-0 text-center font-mono text-lg tabular-nums",
            )}
          />
        </React.Fragment>
      ))}
    </fieldset>
  );
}

export type { OTPInputProps };
export { OTPInput };
