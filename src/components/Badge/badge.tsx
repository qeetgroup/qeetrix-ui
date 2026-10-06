import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Three kinds of badge, on purpose:
 *
 * - `default` — the one solid Qeet fill (counts, "New"). Use it sparingly; it is the loudest
 *   thing a badge can be.
 * - `brand` / `info` / `success` / `warning` / `destructive` — a quiet tint: the opaque subtle
 *   surface, the AA text step of the tone, and a hairline from the badge's own tokens so the
 *   shape survives on a white card (the subtle surfaces are 1.07:1 there).
 * - `secondary` / `outline` / `muted` — graphite, for metadata that should not compete.
 *
 * Every variant draws a border — transparent where it is not wanted — so forced-colors mode,
 * which paints borders in the system colour, keeps the badge's outline.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-(--qx-component-badge-corner) border px-2 py-0.5 font-ui text-xs font-medium whitespace-nowrap transition-colors duration-fast ease-standard [&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-(--qx-component-badge-default-background) text-(--qx-component-badge-default-foreground)",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground dark:border-border-strong",
        brand: "border-(--qx-component-badge-border-brand) bg-brand-subtle text-brand",
        info: "border-(--qx-component-badge-border-info) bg-info-subtle text-info-text",
        success: "border-(--qx-component-badge-border-success) bg-success-subtle text-success-text",
        warning: "border-(--qx-component-badge-border-warning) bg-warning-subtle text-warning-text",
        destructive:
          "border-(--qx-component-badge-border-danger) bg-destructive-subtle text-destructive-text",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
