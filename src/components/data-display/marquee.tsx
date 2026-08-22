"use client";

import type * as React from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "left" | "right";
  /** Seconds for one full cycle. */
  speed?: number;
  pauseOnHover?: boolean;
  /** Gap between repeated content, in px. */
  gap?: number;
}

/** Continuous scrolling ticker. Pauses for `prefers-reduced-motion`. */
function Marquee({
  direction = "left",
  speed = 20,
  pauseOnHover = true,
  gap = 24,
  className,
  children,
  ...props
}: MarqueeProps) {
  const reduced = usePrefersReducedMotion();
  const style = {
    "--qx-marquee-duration": `${speed}s`,
    "--qx-marquee-gap": `${gap}px`,
  } as React.CSSProperties;

  return (
    <div
      data-slot="marquee"
      className={cn(
        "group relative flex w-full overflow-hidden mask-[linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]",
        className,
      )}
      style={style}
      {...props}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          aria-hidden={i === 1 || undefined}
          className={cn(
            "flex shrink-0 items-center",
            direction === "left" ? "animate-qx-marquee-left" : "animate-qx-marquee-right",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
            reduced && "animate-none",
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
