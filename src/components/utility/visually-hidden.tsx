import type * as React from "react";

import { cn } from "@/lib/utils";

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {}

/**
 * Renders content that is visually hidden but remains accessible to screen readers.
 * Use whenever an interactive element needs a text label that should not appear on screen.
 */
function VisuallyHidden({ className, ...props }: VisuallyHiddenProps) {
  return <span data-slot="visually-hidden" className={cn("sr-only", className)} {...props} />;
}

export type { VisuallyHiddenProps };
export { VisuallyHidden };
