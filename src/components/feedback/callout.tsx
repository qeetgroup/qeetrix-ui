import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircleIcon, AlertTriangleIcon, CheckCircle2Icon, InfoIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

const calloutVariants = cva("flex gap-3 rounded-lg border-s-4 p-4 text-sm", {
  variants: {
    variant: {
      info: "border-info bg-info/10 text-info-foreground",
      success: "border-success bg-success/10 text-success-foreground",
      warning: "border-warning bg-warning/10 text-warning-foreground",
      error: "border-destructive bg-destructive/10 text-destructive",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

/** Returns the default icon element for each variant. */
function resolveDefaultIcon(variant: string): React.ReactNode {
  switch (variant) {
    case "success":
      return <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />;
    case "warning":
      return <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />;
    case "error":
      return <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />;
    default:
      return <InfoIcon className="mt-0.5 size-4 shrink-0" />;
  }
}

interface CalloutProps extends React.ComponentProps<"div">, VariantProps<typeof calloutVariants> {
  /** Custom icon. Omit to use the sensible per-variant default. */
  icon?: React.ReactNode;
  /** Optional bold heading rendered above children. */
  title?: string;
}

/**
 * Inline informational box with a coloured left-border accent.
 * Static — not dismissible (use Alert for dismissible notices).
 * Carries `role="note"` so it is announced but not treated as a live region.
 */
function Callout({ className, variant, icon, title, children, ...props }: CalloutProps) {
  const resolvedVariant = variant ?? "info";
  const renderedIcon = icon !== undefined ? icon : resolveDefaultIcon(resolvedVariant);

  return (
    <div
      data-slot="callout"
      role="note"
      className={cn(calloutVariants({ variant }), className)}
      {...props}
    >
      {renderedIcon}
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export type { CalloutProps };
export { Callout, calloutVariants };
