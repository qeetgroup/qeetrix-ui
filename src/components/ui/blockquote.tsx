import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const blockquoteVariants = cva("border-s-2 border-border ps-4 text-foreground italic", {
  variants: {
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
  },
  defaultVariants: { size: "md" },
});

interface BlockquoteProps
  extends React.BlockquoteHTMLAttributes<HTMLQuoteElement>,
    VariantProps<typeof blockquoteVariants> {
  /** Attribution line rendered as a `<footer>` beneath the quote. */
  attribution?: React.ReactNode;
  /** Leading icon (e.g. a quote mark). */
  icon?: React.ReactNode;
}

/** Standalone pull-quote / testimonial — distinct from `Prose`-styled blockquotes. */
function Blockquote({ className, size, attribution, icon, children, ...props }: BlockquoteProps) {
  return (
    <blockquote
      data-slot="blockquote"
      className={cn(blockquoteVariants({ size }), className)}
      {...props}
    >
      {icon && (
        <span data-slot="blockquote-icon" className="mb-2 block text-muted-foreground not-italic">
          {icon}
        </span>
      )}
      <div className="[&>p]:m-0">{children}</div>
      {attribution && (
        <footer
          data-slot="blockquote-attribution"
          className="mt-2 text-sm text-muted-foreground not-italic"
        >
          {attribution}
        </footer>
      )}
    </blockquote>
  );
}

export type { BlockquoteProps };
export { Blockquote, blockquoteVariants };
