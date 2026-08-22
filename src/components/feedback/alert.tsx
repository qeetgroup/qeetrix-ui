import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-x-3 gap-y-1 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[1.25rem_1fr] [&>svg]:size-4 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground [&>svg]:text-muted-foreground",
        info: "border-info/25 bg-info/10 text-info [&>svg]:text-info",
        success: "border-success/25 bg-success/10 text-success [&>svg]:text-success",
        warning: "border-warning/25 bg-warning/10 text-warning [&>svg]:text-warning",
        // `destructive` is the library-wide name for this tone (Button, Badge, Link,
        // DropdownMenu). `danger` predates it and keeps working — see
        // docs/standards/component-api.md § Variant vocabulary.
        destructive:
          "border-destructive/25 bg-destructive/10 text-destructive [&>svg]:text-destructive",
        danger: "border-destructive/25 bg-destructive/10 text-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/** The alert's own props plus its `variant` surface. */
type AlertProps = React.ComponentProps<"div"> & VariantProps<typeof alertVariants>;

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 font-heading text-sm font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("col-start-2 text-sm opacity-90 [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export type { AlertProps };
export { Alert, AlertDescription, AlertTitle, alertVariants };
