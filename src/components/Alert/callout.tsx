import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircleIcon, AlertTriangleIcon, CheckCircle2Icon, InfoIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Same status language as Alert — subtle surface, status hue on the icon, neutral text — told
 * apart by an inline-start accent rule in the status hue instead of a full hairline.
 *
 * The previous info/success/warning recipes set the text to `text-<status>-foreground`, the
 * label colour for a *solid* status fill: white on a 10% tint in light mode and near-black on a
 * dark tint in dark mode, so three of the five variants were unreadable in both themes.
 */
const calloutVariants = cva(
  "flex gap-3 rounded-lg border-s-[3px] p-4 text-sm text-foreground forced-colors:border",
  {
    variants: {
      variant: {
        info: "border-s-info bg-info-subtle",
        success: "border-s-success bg-success-subtle",
        warning: "border-s-warning bg-warning-subtle",
        // `destructive` is the library-wide name for this tone (Button, Badge, Link,
        // DropdownMenu). `error` predates it and keeps working — see
        // docs/standards/component-api.md § Variant vocabulary.
        destructive: "border-s-destructive bg-destructive-subtle",
        error: "border-s-destructive bg-destructive-subtle",
        /** A neutral note: no status, graphite accent. */
        muted: "border-s-muted-foreground bg-surface-subtle",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

type CalloutVariant = NonNullable<VariantProps<typeof calloutVariants>["variant"]>;

const ICON_TONE: Record<CalloutVariant, string> = {
  info: "text-info-text",
  success: "text-success-text",
  warning: "text-warning-text",
  destructive: "text-destructive-text",
  error: "text-destructive-text",
  muted: "text-muted-foreground",
};

/** Returns the default icon element for each variant. */
function resolveDefaultIcon(variant: string): React.ReactNode {
  switch (variant) {
    case "success":
      return <CheckCircle2Icon aria-hidden />;
    case "warning":
      return <AlertTriangleIcon aria-hidden />;
    case "destructive":
    case "error":
      return <AlertCircleIcon aria-hidden />;
    default:
      return <InfoIcon aria-hidden />;
  }
}

interface CalloutProps extends React.ComponentProps<"div">, VariantProps<typeof calloutVariants> {
  /** Custom icon. Omit to use the sensible per-variant default; pass `null` for none. */
  icon?: React.ReactNode;
  /** Optional bold heading rendered above children. */
  title?: string;
}

/**
 * Inline informational box with a coloured inline-start accent.
 * Static — not dismissible (use Alert for dismissible notices).
 * Carries `role="note"` so it is announced but not treated as a live region.
 */
function Callout({ className, variant, icon, title, children, ...props }: CalloutProps) {
  const resolvedVariant: CalloutVariant = variant ?? "info";
  const renderedIcon = icon !== undefined ? icon : resolveDefaultIcon(resolvedVariant);

  return (
    <div
      data-slot="callout"
      role="note"
      className={cn(calloutVariants({ variant }), className)}
      {...props}
    >
      {renderedIcon != null && renderedIcon !== false && (
        <span
          data-slot="callout-icon"
          aria-hidden
          className={cn(
            "flex h-5 shrink-0 items-center [&>svg]:size-4",
            ICON_TONE[resolvedVariant] ?? ICON_TONE.info,
          )}
        >
          {renderedIcon}
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        {title && (
          <p data-slot="callout-title" className="font-medium text-foreground">
            {title}
          </p>
        )}
        <div data-slot="callout-content" className="text-(--qx-component-alert-description)">
          {children}
        </div>
      </div>
    </div>
  );
}

export type { CalloutProps };
export { Callout, calloutVariants };
