"use client";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  DURATION,
  type DurationToken,
  EASING,
  type TransitionOptions,
  transition,
} from "@/lib/motion";

/**
 * Motion helpers that collapse to no-motion when the user prefers reduced motion:
 * `duration(token)` → ms (0 when reduced) and `transition(props, opts)` → a CSS
 * transition string (`"none"` when reduced). `reduced` exposes the raw preference.
 */
export function useMotion() {
  const reduced = usePrefersReducedMotion();
  return {
    reduced,
    EASING,
    duration: (token: DurationToken = "standard") => (reduced ? 0 : DURATION[token]),
    transition: (properties: string | string[], opts?: TransitionOptions) =>
      reduced ? "none" : transition(properties, opts),
  };
}
