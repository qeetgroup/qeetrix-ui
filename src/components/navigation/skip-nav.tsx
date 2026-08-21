import type * as React from "react";

import { cn } from "@/lib/utils";

interface SkipNavProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Target id to jump to. Defaults to `"#main-content"`. */
  to?: string;
}

/**
 * First focusable element on the page — satisfies WCAG 2.4.1 (bypass blocks).
 * Visually hidden until focused; becomes visible on keyboard focus.
 *
 * Usage:
 * ```tsx
 * <SkipNav />
 * <SkipNavContent>…page content…</SkipNavContent>
 * ```
 */
function SkipNav({
  to = "#main-content",
  children = "Skip to main content",
  className,
  ...props
}: SkipNavProps) {
  return (
    <a
      data-slot="skip-nav"
      href={to}
      className={cn(
        // Hidden by default; revealed on keyboard focus
        "fixed top-4 left-4 sr-only",
        "focus-visible:not-sr-only focus-visible:z-(--qx-z-skip-nav) focus-visible:rounded-md",
        "focus-visible:bg-background focus-visible:px-4 focus-visible:py-2",
        "focus-visible:text-sm focus-visible:font-medium",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}

interface SkipNavContentProps extends React.HTMLAttributes<HTMLElement> {
  /** Must match the fragment used in `SkipNav`'s `to` prop. Defaults to `"main-content"`. */
  id?: string;
}

/**
 * Target landmark for `SkipNav`. Renders a `<main>` with a stable `id` so the
 * skip link can jump directly to the primary content area.
 */
function SkipNavContent({ id = "main-content", className, ...props }: SkipNavContentProps) {
  return <main data-slot="skip-nav-content" id={id} className={cn(className)} {...props} />;
}

export type { SkipNavContentProps, SkipNavProps };
export { SkipNav, SkipNavContent };
