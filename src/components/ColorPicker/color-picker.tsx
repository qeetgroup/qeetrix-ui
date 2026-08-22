"use client";

import type * as React from "react";

import { useFieldControl } from "@/components/Input/field";
import { useControllableState } from "@/hooks/use-controllable-state";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  /** Hex value like "#4F46E5" (3- or 6-digit). Empty string = no color set. Omit to go uncontrolled. */
  value?: string;
  /** Initial value when uncontrolled. Defaults to `""` (no colour set). */
  defaultValue?: string;
  onChange?: (hex: string) => void;
  /** Optional preset swatches rendered below the input row. */
  presets?: string[];
  /** Placeholder for the hex text input. */
  placeholder?: string;
  disabled?: boolean;
  /** Accessible label for the hex input. */
  ariaLabel?: string;
  className?: string;
  /** Submits the hex string under this name, from the visible hex input itself. */
  name?: string;
  /** Associate the submitted value with a form it is not nested inside, by form `id`. */
  form?: string;
  /**
   * Marks the hex input `required`. Browser-enforced, unlike most composites: the value lives
   * in a real, focusable text input rather than a hidden one.
   */
  required?: boolean;
  /** Applied to the hex input, so a `Field` label's `htmlFor` resolves to it. */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/**
 * The same grammar as {@link HEX_RE}, for the native `pattern` attribute — which is implicitly
 * anchored, so the assertions are dropped. Written out rather than derived from `HEX_RE.source`
 * so a future change to either is visible in review as a change to both.
 */
const HEX_PATTERN = "#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})";

/** A small, curated palette suitable for brand colours. Callers can
 *  pass a custom `presets` array to override. */
const DEFAULT_PRESETS: string[] = [
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#ec4899", // pink
  "#ef4444", // red
  "#f59e0b", // amber
  "#10b981", // emerald
  "#14b8a6", // teal
  "#0f172a", // slate-900
  "#ffffff", // white
];

function expandShortHex(hex: string): string {
  // #abc → #aabbcc so the native <input type="color"> receives a value
  // it can parse (it only accepts 6-digit).
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

function isValidHex(hex: string): boolean {
  return HEX_RE.test(hex);
}

/**
 * ColorPicker consolidates the (clickable-swatch + hex-text + native
 * picker) combo into one primitive. The swatch is a `<label>` wrapping
 * a hidden `<input type="color">` so clicking it opens the browser's
 * native colour picker; the visible hex text input lives next to it
 * for typing or pasting.
 *
 * `presets` renders below — small clickable squares for the most-used
 * brand colours. Pass an empty array to suppress them.
 *
 * Controlled or uncontrolled: pass `value` to own the hex string, or `defaultValue` and let the
 * component own it. `onChange` fires with the new string in both modes.
 *
 * Forms: implements the composite-field contract (see `field.tsx`), and is the one composite
 * that needs no hidden input — the hex text field *is* the form control, so `name`, `required`
 * and `pattern` are the browser's own. That means an unparseable hex blocks submission and
 * matches `:invalid`, in addition to the `aria-invalid` the component already reported.
 */
function ColorPicker({
  value: valueProp,
  defaultValue = "",
  onChange,
  presets = DEFAULT_PRESETS,
  placeholder = "#5b21b6",
  disabled,
  ariaLabel,
  className,
  name,
  form,
  required,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: ColorPickerProps) {
  const [value, setValue] = useControllableState<string>({
    value: valueProp,
    defaultValue,
    onChange,
  });
  const valid = isValidHex(value);
  // Native picker requires 6-digit; expand short hex on the fly.
  const nativeValue = valid ? expandShortHex(value) : "#000000";
  // A non-empty value that will not parse is invalid on its own account; `|| undefined` lets an
  // enclosing Field's invalid state through instead of overwriting it with a flat `false`.
  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid ?? ((value !== "" && !valid) || undefined),
  });

  return (
    <div data-slot="color-picker" className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <label
          className={cn(
            "relative grid size-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md border",
            disabled && "pointer-events-none opacity-disabled",
          )}
          aria-label="Open colour picker"
          style={{
            background: valid
              ? value
              : // Checkered pattern indicates "no colour set"
                "repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 50% / 12px 12px",
          }}
        >
          <input
            type="color"
            value={nativeValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            disabled={disabled}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          name={name}
          form={form}
          required={required}
          pattern={HEX_PATTERN}
          id={field.id}
          aria-label={field["aria-labelledby"] ? undefined : (ariaLabel ?? "Hex colour")}
          aria-labelledby={field["aria-labelledby"]}
          aria-describedby={field["aria-describedby"]}
          aria-errormessage={field["aria-errormessage"]}
          aria-invalid={field["aria-invalid"] ?? false}
          className={cn(
            "h-[var(--qx-control-height)] w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 font-mono text-sm transition-colors outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-disabled",
            "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          )}
        />
      </div>
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const isActive =
              valid && expandShortHex(value).toLowerCase() === expandShortHex(p).toLowerCase();
            return (
              <button
                key={p}
                type="button"
                onClick={() => setValue(p)}
                disabled={disabled}
                aria-label={`Set colour ${p}`}
                aria-pressed={isActive}
                title={p}
                className={cn(
                  "size-5 rounded-md border transition-transform",
                  "hover:scale-110",
                  isActive && "ring-2 ring-ring ring-offset-1",
                  disabled && "pointer-events-none opacity-disabled",
                )}
                style={{ background: p }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export type { ColorPickerProps };
export { ColorPicker };
