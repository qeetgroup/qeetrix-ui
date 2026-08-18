import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const containerVariants = cva("mx-auto w-full", {
  variants: {
    size: {
      prose: "max-w-2xl",
      content: "max-w-4xl",
      wide: "max-w-6xl",
      full: "max-w-none",
    },
    gutters: {
      true: "px-4 sm:px-6 lg:px-8",
      false: "",
    },
  },
  defaultVariants: {
    size: "content",
    gutters: true,
  },
});

interface ContainerProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof containerVariants> {}

/**
 * Centered responsive content shell. Use `prose` for readable text, `content`
 * for standard pages, `wide` for operational layouts, and `full` only when the
 * parent owns the width. Nested content owns its own internal padding.
 */
function Container({ className, size, gutters, ...props }: ContainerProps) {
  return (
    <div
      data-slot="container"
      data-size={size ?? "content"}
      className={cn(containerVariants({ size, gutters }), className)}
      {...props}
    />
  );
}

export type { ContainerProps };
export { Container, containerVariants };
