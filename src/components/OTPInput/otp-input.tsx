"use client";

import * as React from "react";
import { FieldHiddenInput, useFieldControl } from "@/components/Input/field";
import { useControllableState } from "@/hooks/use-controllable-state";
import { logicalDirectionForKey } from "@/lib/direction";
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

  const emit = (next: string[]) => {
    const joined = next.join("");
    setValue(joined);
    if (joined.length === length && next.every((d) => d !== "")) {
      onComplete?.(joined);
    }
  };

  const handleChange = (idx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Strip non-digits; if the input fires for a paste (rare since onPaste
    // pre-empts), take only the last digit so the box never holds >1 char.
    const cleaned = raw.replace(/\D/g, "");
    const digit = cleaned.slice(-1);
    const next = [...digits];
    next[idx] = digit;
    emit(next);
    if (digit && idx < length - 1) focusAt(idx + 1);
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
      // The boxes sit on the inline axis, so the key that points at the next box is
      // ArrowLeft under `dir="rtl"`. The digits themselves keep their order — only the
      // spatial mapping mirrors.
      e.preventDefault();
      focusAt(logicalDirectionForKey(e.key, direction) === "inline-end" ? idx + 1 : idx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusAt(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusAt(length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const slice = text.slice(0, length);
    const next = Array.from({ length }, (_, i) => slice[i] ?? "");
    emit(next);
    focusAt(Math.min(slice.length, length - 1));
  };

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
      className={cn("flex min-w-0 items-center gap-2 border-0 p-0", className)}
    >
      <FieldHiddenInput name={name} value={value} form={form} disabled={disabled} />
      {boxKeys.map((boxKey, i) => (
        <input
          key={boxKey}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={1}
          value={digits[i] ?? ""}
          onChange={handleChange(i)}
          onKeyDown={handleKeyDown(i)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          disabled={disabled}
          required={required}
          aria-label={messages.digit(i + 1, length)}
          aria-invalid={field["aria-invalid"]}
          data-slot="otp-input-digit"
          className={cn(
            "h-12 w-10 rounded-lg border border-input bg-transparent text-center font-mono text-lg outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/disabled",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/disabled disabled:opacity-disabled",
            "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            "dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/disabled dark:aria-invalid:ring-destructive/40",
            "sm:w-12",
          )}
        />
      ))}
    </fieldset>
  );
}

export type { OTPInputProps };
export { OTPInput };
