"use client";

import * as React from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

interface RollingNumberProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  /** Animation duration in ms. */
  duration?: number;
  decimals?: number;
  locale?: string | string[];
}

/** Animates numeric value changes with an eased count-up/down. Honors reduced-motion. */
function RollingNumber({
  value,
  duration = 600,
  decimals = 0,
  locale,
  className,
  ...props
}: RollingNumberProps) {
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(value);
  const rafRef = React.useRef<number | undefined>(undefined);
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    if (reduced || duration <= 0) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3; // easeOutCubic
      setDisplay(from + (value - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, reduced]);

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display);

  return (
    <span
      data-slot="rolling-number"
      aria-live="polite"
      className={cn("tabular-nums", className)}
      {...props}
    >
      {formatted}
    </span>
  );
}

export type { RollingNumberProps };
export { RollingNumber };
