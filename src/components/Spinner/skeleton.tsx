import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A loading placeholder block. Size and shape come from `className` (`h-4 w-32`,
 * `size-10 rounded-full`).
 *
 * The resting colour is `--qx-component-skeleton-background`, a translucent foreground tint, so
 * a placeholder keeps the same weight on canvas, card, popover and sunken surfaces in both
 * themes. The shimmer sweep is defined once in `base.css` and stops under reduced motion; in
 * forced-colors mode the background is dropped, so the block keeps a GrayText outline.
 *
 * A skeleton has no text of its own. Mark the region it stands in for as busy
 * (`aria-busy="true"`) or render a Spinner with a label alongside, so assistive tech hears
 * that content is loading.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-(--qx-component-skeleton-background) forced-colors:border forced-colors:border-[GrayText]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
