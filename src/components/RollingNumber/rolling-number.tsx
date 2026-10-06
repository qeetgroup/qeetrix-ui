"use client";

import * as React from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { DURATION } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface RollingNumberProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  value: number;
  /** Animation duration in ms. Defaults to the `linger` motion token (600ms). */
  duration?: number;
  decimals?: number;
  locale?: string | string[];
}

/**
 * Animates numeric value changes with an eased count-up/down — a KPI tile, a running total.
 *
 * - **Screen readers hear the result, not the animation.** The counting digits are
 *   `aria-hidden`; a visually hidden copy holds only the target value, and the polite live
 *   region (override with `aria-live`) announces it once per change instead of every frame.
 * - **Reduced motion** jumps straight to the new value. The motion is scripted, so it is
 *   handled here rather than by the stylesheet's reduced-motion rule.
 * - **Retargeting** mid-animation continues from the number on screen, never jumping back.
 * - `tabular-nums` keeps the width steady while digits change, and `dir="auto"` isolates the
 *   number from surrounding right-to-left text so a sign or separator never reorders.
 */
function RollingNumber({
  value,
  duration = DURATION.linger,
  decimals = 0,
  locale,
  className,
  ...props
}: RollingNumberProps) {
  const [display, setDisplay] = React.useState(value);
  // What is on screen right now — the start of the next animation, even mid-flight.
  const shownRef = React.useRef(value);
  const rafRef = React.useRef<number | undefined>(undefined);
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    if (reduced || duration <= 0) {
      shownRef.current = value;
      setDisplay(value);
      return;
    }
    const from = shownRef.current;
    if (from === value) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3; // easeOutCubic — decelerates into the value
      const next = t === 1 ? value : from + (value - from) * eased;
      shownRef.current = next;
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, reduced]);

  // One formatter per locale/precision rather than one per animation frame. Keyed on the joined
  // locale list, so an inline `locale={["hi-IN", "en-IN"]}` does not rebuild it every render.
  const localeKey = Array.isArray(locale) ? locale.join(",") : locale;
  const formatter = React.useMemo(
    () =>
      new Intl.NumberFormat(localeKey ? localeKey.split(",") : undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [localeKey, decimals],
  );

  return (
    <span
      data-slot="rolling-number"
      aria-live="polite"
      dir="auto"
      className={cn("tabular-nums", className)}
      {...props}
    >
      <span aria-hidden="true">{formatter.format(display)}</span>
      <span className="sr-only">{formatter.format(value)}</span>
    </span>
  );
}

export type { RollingNumberProps };
export { RollingNumber };
