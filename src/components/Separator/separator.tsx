"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Two weights, one hierarchy:
 *
 *   - `default` — the border role. Divides sections, groups and toolbars.
 *   - `muted`   — the subtle border role, one step quieter. Divides items *inside* a section
 *                 (rows of a list, entries in a menu, metadata in a card) where a default rule
 *                 would draw more lines than the content.
 *
 * Both are decorative (well under 3:1 by design): a separator supports grouping that spacing
 * and headings already express, it is never the only signal. In forced-colours mode both
 * resolve to `CanvasText`, so the structure survives a high-contrast theme.
 */
const separatorVariants = cva(
  "shrink-0 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch forced-colors:bg-[CanvasText]",
  {
    variants: {
      variant: {
        default: "bg-border",
        muted: "bg-border-subtle",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type SeparatorProps = SeparatorPrimitive.Props & VariantProps<typeof separatorVariants>;

/**
 * A 1px rule with `role="separator"` and `aria-orientation`. Horizontal by default (full
 * width); `orientation="vertical"` stretches to the height of a flex row — inside a block or
 * grid parent give it a height (`h-4`) yourself.
 */
function Separator({ className, orientation = "horizontal", variant, ...props }: SeparatorProps) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      data-variant={variant ?? "default"}
      orientation={orientation}
      className={cn(separatorVariants({ variant }), className)}
      {...props}
    />
  );
}

export type { SeparatorProps };
export { Separator, separatorVariants };
