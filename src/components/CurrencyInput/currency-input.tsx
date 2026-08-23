"use client";

import * as React from "react";
import { Input } from "@/components/Input/input";
import { numberSymbols, parseLocaleNumber } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";

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
}

/**
 * Numeric amount entry with a locale-aware currency symbol. Emits a `number`.
 *
 * Input is accepted in the locale's own notation: `1234,56` in `de-DE`, `12,34,567` in
 * `en-IN`, Arabic-Indic digits in `ar-EG`. Parsing goes through `parseLocaleNumber`, which
 * returns `undefined` rather than a rescaled guess for anything ambiguous — a German `1.5` is
 * one point five to `Number.parseFloat` and one thousand five hundred to a German reader, and
 * money may not be guessed at.
 */
function CurrencyInput({
  value,
  onValueChange,
  currency = "USD",
  locale,
  className,
  disabled,
  ...props
}: CurrencyInputProps) {
  const contextLocale = useLocale();
  // `undefined` is passed through on purpose: Intl reads it as the runtime's own locale.
  const resolvedLocale = locale ?? contextLocale;
  const symbol = symbolFor(currency, resolvedLocale);
  const [text, setText] = React.useState(value != null ? String(value) : "");

  // Reflect external (controlled) value changes that don't match the current text. Read back
  // through the locale parser, or a `de-DE` field would fight the user on every keystroke:
  // `Number("1234,56")` is NaN, which never equals `value`.
  //
  // The controlled guard is load-bearing. Without it an *uncontrolled* field cleared itself after
  // every keystroke: `value` is undefined, the parsed text is a number, they differ, so the effect
  // reset the text to "". The component was effectively controlled-only and nothing said so.
  const isControlled = value !== undefined;
  React.useEffect(() => {
    if (!isControlled) return;
    const parsed = text === "" ? undefined : parseLocaleNumber(text, resolvedLocale);
    const current = parsed === undefined || Number.isNaN(parsed) ? undefined : parsed;
    if (value !== current) setText(value != null ? String(value) : "");
  }, [isControlled, value, text, resolvedLocale]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      setText("");
      onValueChange?.(undefined);
      return;
    }

    // Accept the characters this locale actually writes numbers with, rather than a fixed
    // ASCII shape. Rejecting the keystroke outright made the field look frozen to anyone
    // whose decimal separator is not a dot.
    const { decimal, group, minus, digits } = numberSymbols(resolvedLocale);
    const allowed = new Set([decimal, minus, "-", "(", ")", ...group, ...digits]);
    const typeable = [...raw].every((character) => /\d/.test(character) || allowed.has(character));
    if (!typeable) return;

    setText(raw);
    const parsed = parseLocaleNumber(raw, resolvedLocale);
    // NaN covers both "still typing" (`"1,"`) and "not a number", and both mean the same
    // thing to the caller: there is no committed amount yet.
    onValueChange?.(Number.isNaN(parsed) ? undefined : parsed);
  };

  return (
    <div
      data-slot="currency-input"
      className={cn("relative inline-flex w-full items-center", className)}
    >
      <span className="pointer-events-none absolute inset-s-2.5 text-sm text-muted-foreground tabular-nums">
        {symbol}
      </span>
      <Input
        inputMode="decimal"
        disabled={disabled}
        value={text}
        onChange={handleChange}
        className="ps-7 text-end tabular-nums"
        {...props}
      />
    </div>
  );
}

export type { CurrencyInputProps };
export { CurrencyInput };
