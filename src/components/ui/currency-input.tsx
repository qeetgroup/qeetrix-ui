"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  locale?: string;
}

/** Numeric amount entry with a locale-aware currency symbol. Emits a `number`. */
function CurrencyInput({
  value,
  onValueChange,
  currency = "USD",
  locale,
  className,
  disabled,
  ...props
}: CurrencyInputProps) {
  const symbol = symbolFor(currency, locale);
  const [text, setText] = React.useState(value != null ? String(value) : "");

  // Reflect external (controlled) value changes that don't match the current text.
  React.useEffect(() => {
    const parsed = text === "" ? undefined : Number(text);
    if (value !== parsed) setText(value != null ? String(value) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, text]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return;
    setText(raw);
    const n = raw === "" || raw === "-" || raw === "." ? undefined : Number(raw);
    onValueChange?.(n === undefined || Number.isNaN(n) ? undefined : n);
  };

  return (
    <div
      data-slot="currency-input"
      className={cn("relative inline-flex w-full items-center", className)}
    >
      <span className="pointer-events-none absolute start-2.5 text-sm text-muted-foreground tabular-nums">
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
