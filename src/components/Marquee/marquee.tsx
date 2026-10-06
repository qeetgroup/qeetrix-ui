"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Physical direction the content travels. */
  direction?: "left" | "right";
  /** Seconds for one full cycle. */
  speed?: number;
  /** Pause while the pointer is over the marquee. Focus inside it always pauses. */
  pauseOnHover?: boolean;
  /**
   * Stop the motion. Controlled: wire it to a visible pause button when the marquee runs for
   * more than five seconds beside other content — WCAG 2.2.2 asks for a way to stop it that
   * does not depend on hovering.
   */
  paused?: boolean;
  /** Gap between repeated content, in px. */
  gap?: number;
}

/**
 * Continuous scrolling ticker — logo walls, status tickers.
 *
 * Motion is kept to what the pattern needs: linear, slow by default, and it stops whenever the
 * user engages — pointer over it (`pauseOnHover`), keyboard focus inside it (always), or the
 * controlled `paused` prop.
 *
 * **Reduced motion.** Under `prefers-reduced-motion: reduce` it does not move at all: the
 * duplicate copy is removed, the edge fade is dropped and the single copy wraps, so every item
 * is visible and reachable instead of being clipped at the edge. This is CSS, so it holds from
 * the first paint, before hydration.
 *
 * The second copy exists only to make the loop seamless. It is `aria-hidden` and `inert`, so a
 * screen reader hears the content once and Tab never lands on an invisible duplicate link.
 * Under `dir="rtl"` the track keeps its physical order, so the loop stays seamless in both
 * directions.
 */
function Marquee({
  direction = "left",
  speed = 20,
  pauseOnHover = true,
  paused = false,
  gap = 24,
  className,
  children,
  ...props
}: MarqueeProps) {
  const style = {
    "--qx-marquee-duration": `${speed}s`,
    "--qx-marquee-gap": `${gap}px`,
  } as React.CSSProperties;

  return (
    <div
      data-slot="marquee"
      data-direction={direction}
      data-paused={paused || undefined}
      className={cn(
        "group relative flex w-full overflow-hidden rtl:flex-row-reverse",
        "mask-[linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]",
        "motion-reduce:mask-none",
        className,
      )}
      style={style}
      {...props}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          data-slot={i === 0 ? "marquee-content" : undefined}
          aria-hidden={i === 1 || undefined}
          inert={i === 1 || undefined}
          className={cn(
            "flex shrink-0 items-center",
            direction === "left" ? "animate-qx-marquee-left" : "animate-qx-marquee-right",
            "group-focus-within:paused",
            pauseOnHover && "group-hover:paused",
            paused && "paused",
            "motion-reduce:animate-none",
            i === 0
              ? "motion-reduce:min-w-0 motion-reduce:shrink motion-reduce:flex-wrap"
              : "motion-reduce:hidden",
          )}
          style={{ gap: "var(--qx-marquee-gap)", paddingInlineEnd: "var(--qx-marquee-gap)" }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

export type { MarqueeProps };
export { Marquee };
