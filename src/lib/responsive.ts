/** Qeetrix uses Tailwind v4's default mobile-first breakpoint ladder. */
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

/** Minimum-width media query matching a Tailwind breakpoint prefix. */
function minWidthQuery(breakpoint: Breakpoint) {
  return `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
}

/** Width below a Tailwind breakpoint, useful for behavioral adaptation only. */
function belowWidthQuery(breakpoint: Breakpoint) {
  return `(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`;
}

export type { Breakpoint };
export { BREAKPOINTS, belowWidthQuery, minWidthQuery };
