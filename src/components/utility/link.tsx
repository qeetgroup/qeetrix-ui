import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const linkVariants = cva(
  "inline-flex items-center gap-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
  {
    variants: {
      variant: {
        default: "text-primary hover:text-primary/80",
        muted: "text-muted-foreground hover:text-foreground",
        destructive: "text-destructive hover:text-destructive/80",
      },
      underline: {
        hover: "underline-offset-4 hover:underline",
        always: "underline underline-offset-4",
        none: "",
      },
      size: {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      underline: "hover",
      size: "md",
    },
  },
);

interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {}

function Link({ className, variant, underline, size, ...props }: LinkProps) {
  return (
    <a
      data-slot="link"
      className={cn(linkVariants({ variant, underline, size }), className)}
      {...props}
    />
  );
}

export type { LinkProps };
export { Link, linkVariants };
