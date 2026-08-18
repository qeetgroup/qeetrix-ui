import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircleIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin shrink-0 text-muted-foreground", {
  variants: {
    size: {
      sm: "size-4",
      default: "size-5",
      lg: "size-6",
      xl: "size-8",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

function Spinner({
  className,
  size,
  label = "Loading",
  ...props
}: Omit<React.ComponentProps<typeof LoaderCircleIcon>, "size"> &
  VariantProps<typeof spinnerVariants> & { label?: string }) {
  return (
    <LoaderCircleIcon
      data-slot="spinner"
      role="status"
      aria-label={label}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  );
}

export { Spinner, spinnerVariants };
