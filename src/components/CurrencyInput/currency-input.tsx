"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";
import { useFieldControl } from "@/components/Input/field";
import { fieldGroupInput, fieldGroupSurface } from "@/internal/field-styles";
import { numberSymbols, parseLocaleNumber } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";

/** Bidi controls `Intl` writes into RTL numbers (U+061C before an Arabic minus, for one). */
const BIDI_CONTROLS = /[‎‏؜‪-‮⁦-⁩]/g;

function symbolFor(currency: string, locale?: string) {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

/** "Indian rupee", "Euro" — what a screen reader should hear instead of a glyph. */
function currencyName(currency: string, locale?: string) {
  try {
    return new Intl.DisplayNames(locale ? [locale] : undefined, { type: "currency" }).of(currency);
  } catch {
    return currency;
  }
}

/** The minor-unit count the currency is written with: 2 for USD, 0 for JPY, 3 for KWD. */
function minorDigits(currency: string, locale?: string) {
  try {
    return (
      new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

function decimalsOf(value: number) {
  const text = String(Math.abs(value));
  if (text.includes("e")) return 0;
  const at = text.indexOf(".");
  return at < 0 ? 0 : Math.min(text.length - at - 1, 20);
}

interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "prefix"> {
  value?: number;
  onValueChange?: (value: number | undefined) => void;
  /** ISO 4217 code — drives the leading symbol (₹ for INR, $ for USD, …). */
  currency?: string;
  /**
   * BCP 47 locale for the symbol *and* for the characters the field accepts. Omitted, the
   * nearest `DirectionProvider`'s locale is used, then the runtime's own.
   */
  locale?: string;
  /**
   * Write the amount the way the locale prints money once the field loses focus — grouping and
   * the currency's minor units (`1500` → `1,500.00`, `12,34,567.00` in `en-IN`, `1.500,00` in
   * `de-DE`, `1,500` for JPY). Digits the user typed beyond the minor units are kept, never
   * rounded away. The emitted number is unaffected. Defaults to `true`.
   */
  formatOnBlur?: boolean;
}

/**
 * Numeric amount entry with a locale-aware currency symbol. Emits a `number`.
 *
 * Input is accepted in the locale's own notation: `1234,56` in `de-DE`, `12,34,567` in
 * `en-IN`, Arabic-Indic digits in `ar-EG`. Parsing goes through `parseLocaleNumber`, which
 * returns `undefined` rather than a rescaled guess for anything ambiguous — a German `1.5` is
 * one point five to `Number.parseFloat` and one thousand five hundred to a German reader, and
 * money may not be guessed at.
 *
 * The symbol is an inline addon on the field surface, so a long one (`CHF`, `R$`, `د.إ.‏`) can
 * never overlap the amount. It is hidden from assistive technology; the currency's name
 * ("Indian rupee") is added to the input's description instead, so the unit is announced. Inside
 * a `Field`, the input takes the Field's label, description, error and invalid state.
 */
function CurrencyInput({
  value,
  onValueChange,
  currency = "USD",
  locale,
  formatOnBlur = true,
  className,
  disabled,
  onBlur,
  onFocus,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-errormessage": ariaErrormessage,
  "aria-invalid": ariaInvalid,
  ...props
}: CurrencyInputProps) {
  const contextLocale = useLocale();
  // `undefined` is passed through on purpose: Intl reads it as the runtime's own locale.
  const resolvedLocale = locale ?? contextLocale;
  const symbol = symbolFor(currency, resolvedLocale);
  const name = currencyName(currency, resolvedLocale);
  const nameId = React.useId();
  const focusedRef = React.useRef(false);

  const display = React.useCallback(
    (amount: number, grouped: boolean) => {
      const minor = grouped ? minorDigits(currency, resolvedLocale) : 0;
      try {
        return new Intl.NumberFormat(resolvedLocale, {
          useGrouping: grouped,
          minimumFractionDigits: minor,
          maximumFractionDigits: Math.max(minor, decimalsOf(amount)),
        }).format(amount);
      } catch {
        return String(amount);
      }
    },
    [currency, resolvedLocale],
  );

  const [text, setText] = React.useState(() => (value != null ? display(value, formatOnBlur) : ""));

  // Reflect external (controlled) value changes that don't match the current text. Read back
  // through the locale parser, or a `de-DE` field would fight the user on every keystroke:
  // `Number("1234,56")` is NaN, which never equals `value`. Written back in the locale's own
  // notation too — `String(1234.5)` is not a German number.
  //
  // The controlled guard is load-bearing. Without it an *uncontrolled* field cleared itself after
  // every keystroke: `value` is undefined, the parsed text is a number, they differ, so the effect
  // reset the text to "". The component was effectively controlled-only and nothing said so.
  const isControlled = value !== undefined;
  React.useEffect(() => {
    if (!isControlled) return;
    const parsed = text === "" ? undefined : parseLocaleNumber(text, resolvedLocale);
    const current = parsed === undefined || Number.isNaN(parsed) ? undefined : parsed;
    if (value !== current) {
      setText(value != null ? display(value, formatOnBlur && !focusedRef.current) : "");
    }
  }, [isControlled, value, text, resolvedLocale, display, formatOnBlur]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      setText("");
      onValueChange?.(undefined);
      return;
    }

    // Accept the characters this locale actually writes numbers with, rather than a fixed
    // ASCII shape. Rejecting the keystroke outright made the field look frozen to anyone
    // whose decimal separator is not a dot. Bidi controls are invisible and arrive with the
    // field's own formatted text, so they never count against a keystroke.
    const { decimal, group, minus, digits } = numberSymbols(resolvedLocale);
    const allowed = new Set([decimal, minus, "-", "(", ")", ...group, ...digits]);
    const typeable = [...raw.replace(BIDI_CONTROLS, "")].every(
      (character) => /\d/.test(character) || allowed.has(character),
    );
    if (!typeable) return;

    setText(raw);
    const parsed = parseLocaleNumber(raw, resolvedLocale);
    // NaN covers both "still typing" (`"1,"`) and "not a number", and both mean the same
    // thing to the caller: there is no committed amount yet.
    onValueChange?.(Number.isNaN(parsed) ? undefined : parsed);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    focusedRef.current = false;
    if (formatOnBlur && text !== "") {
      const parsed = parseLocaleNumber(text, resolvedLocale);
      if (!Number.isNaN(parsed)) setText(display(parsed, true));
    }
    onBlur?.(e);
  };

  const field = useFieldControl({
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
    "aria-errormessage": ariaErrormessage,
    "aria-invalid": ariaInvalid,
  });
  const showName = Boolean(name) && name !== symbol;
  const describedBy =
    [field["aria-describedby"], showName ? nameId : undefined].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div
      data-slot="currency-input"
      className={cn(
        fieldGroupSurface,
        "relative flex h-(--qx-component-input-height) items-stretch",
        className,
      )}
    >
      <span
        aria-hidden="true"
        data-slot="currency-input-symbol"
        className="flex shrink-0 items-center ps-2.5 text-sm whitespace-nowrap text-muted-foreground tabular-nums select-none"
      >
        {symbol}
      </span>
      <InputPrimitive
        inputMode="decimal"
        // The amount takes its own direction from its content: a plain `1'234.50` stays in
        // number order inside an RTL form (the bidi algorithm would otherwise split it at the
        // apostrophe into `234.50'1`), while Intl's own RTL output — which leads with an Arabic
        // letter mark — still resolves right to left.
        dir="auto"
        disabled={disabled}
        value={text}
        onChange={handleChange}
        onFocus={(e) => {
          focusedRef.current = true;
          onFocus?.(e);
        }}
        onBlur={handleBlur}
        id={field.id}
        aria-label={ariaLabel}
        aria-labelledby={field["aria-labelledby"]}
        aria-describedby={describedBy}
        aria-errormessage={field["aria-errormessage"]}
        aria-invalid={field["aria-invalid"]}
        className={cn(
          fieldGroupInput,
          "h-full w-full rounded-[inherit] ps-2 pe-2.5 text-end tabular-nums",
        )}
        {...props}
      />
      {showName && (
        <span id={nameId} data-slot="currency-input-name" className="sr-only">
          {name}
        </span>
      )}
    </div>
  );
}

export type { CurrencyInputProps };
export { CurrencyInput };
