import type * as React from "react";

import { skipNavMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";

interface SkipNavProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * Target to jump to. Defaults to `"#main-content"`. A bare id (`"content"`) is treated as a
   * fragment, so the link never becomes a relative URL by accident.
   */
  to?: string;
}

/**
 * First focusable element on the page — satisfies WCAG 2.4.1 (bypass blocks).
 *
 * Out of view until it receives focus, then it slides into the top inline-start corner above
 * everything else (`--qx-z-skip-nav`) as a Qeet overlay chip with the Qeet focus ring. It is
 * revealed on any focus, not only `:focus-visible`, so focus moved there by a screen reader or
 * a script still shows it. Hidden by transform rather than clipping: it stays in the
 * accessibility tree and the tab order, and showing it never reflows the page. The slide
 * collapses under reduced motion.
 *
 * Put it first in `<body>`, before the header:
 * ```tsx
 * <SkipNav />
 * <SkipNavContent>…page content…</SkipNavContent>
 * ```
 *
 * The default label is the catalogue's `skipNav.label`; pass children to translate it (SkipNav is
 * server-safe, so a `MessagesProvider` does not reach it).
 */
function SkipNav({
  to = "#main-content",
  children = skipNavMessages.label,
  className,
  ...props
}: SkipNavProps) {
  const href = /^[A-Za-z][\w.-]*$/.test(to) ? `#${to}` : to;
  return (
    <a
      data-slot="skip-nav"
      href={href}
      className={cn(
        "fixed inset-s-4 top-4 z-(--qx-z-skip-nav) -translate-y-[calc(100%+2rem)]",
        // The shadow only while shown: parked above the viewport, its blur still reached into the
        // top-start corner.
        "rounded-lg border border-border bg-surface-overlay px-4 py-2.5 text-foreground focus:shadow-popover",
        "font-ui text-label font-medium whitespace-nowrap",
        "transition-[translate,transform,box-shadow] duration-normal ease-enter",
        "focus:translate-y-0 focus-visible:focus-ring",
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
 * skip link can jump directly to the primary content area. Following the link moves the
 * browser's sequential-focus starting point into `<main>`, so the next Tab lands on its first
 * control. Render exactly one per page — it is the `main` landmark.
 */
function SkipNavContent({ id = "main-content", className, ...props }: SkipNavContentProps) {
  return <main data-slot="skip-nav-content" id={id} className={cn(className)} {...props} />;
}

export type { SkipNavContentProps, SkipNavProps };
export { SkipNav, SkipNavContent };
