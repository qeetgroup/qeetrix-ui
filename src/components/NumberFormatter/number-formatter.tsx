import type * as React from "react";

import { cn } from "@/lib/utils";

interface NumberFormatterProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "prefix"> {
  value: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  /** BCP-47 locale(s) for `Intl.NumberFormat`. */
  locale?: string | string[];
  /** `"compact"` renders 1.2K / 3.4M, etc. */
  notation?: Intl.NumberFormatOptions["notation"];
  /** Fixed number of fraction digits. */
  decimals?: number;
  /** Escape hatch for any other `Intl.NumberFormat` option. */
  options?: Intl.NumberFormatOptions;
}

/**
 * Display-only, locale-aware number formatter (wraps `Intl.NumberFormat`).
 *
 * `tabular-nums` keeps columns of figures aligned. `dir="auto"` isolates the number from the
 * text around it, the way `<bdi>` does: inside right-to-left copy an `en-US` "-42%" or
 * "$1,200/mo" would otherwise have its sign and units reordered by the bidi algorithm. Pass
 * `dir` to override.
 */
function NumberFormatter({
  value,
  prefix,
  suffix,
  locale,
  notation = "standard",
  decimals,
  options,
  className,
  ...props
}: NumberFormatterProps) {
  const opts: Intl.NumberFormatOptions = { notation, ...options };
  if (decimals != null) {
    opts.minimumFractionDigits = decimals;
    opts.maximumFractionDigits = decimals;
  }
  const formatted = new Intl.NumberFormat(locale, opts).format(value);

  return (
    <span
      data-slot="number-formatter"
      dir="auto"
      className={cn("tabular-nums", className)}
      {...props}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export type { NumberFormatterProps };
export { NumberFormatter };
