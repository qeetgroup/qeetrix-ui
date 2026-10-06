import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * One status language across Alert, Banner and Callout: the opaque `<status>-subtle` surface, a
 * hairline mixed from the status hue (`--qx-component-alert-border-*`), the status hue on the
 * icon only, and neutral text. Prose stays readable at 8:1+ instead of being painted the status
 * colour, and the four statuses carry identical visual weight.
 */
const alertVariants = cva(
  [
    "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-(--qx-component-alert-padding-block) text-sm",
    // The icon column exists only when an icon is a direct child, and the icon's gutter is part
    // of that column — so an alert without an icon has no phantom indent.
    "has-[>svg]:grid-cols-[calc(var(--spacing)*7)_1fr] [&>svg]:size-4 [&>svg]:translate-y-0.5",
    // A trailing AlertAction gets its own column, beside the text rather than under it.
    "has-[>[data-slot=alert-action]]:grid-cols-[0_1fr_auto] has-[>svg]:has-[>[data-slot=alert-action]]:grid-cols-[calc(var(--spacing)*7)_1fr_auto]",
  ],
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground [&>svg]:text-muted-foreground",
        info: "border-(--qx-component-alert-border-info) bg-info-subtle text-foreground [&>svg]:text-info-text",
        success:
          "border-(--qx-component-alert-border-success) bg-success-subtle text-foreground [&>svg]:text-success-text",
        warning:
          "border-(--qx-component-alert-border-warning) bg-warning-subtle text-foreground [&>svg]:text-warning-text",
        // `destructive` is the library-wide name for this tone (Button, Badge, Link,
        // DropdownMenu). `danger` predates it and keeps working — see
        // docs/standards/component-api.md § Variant vocabulary.
        destructive:
          "border-(--qx-component-alert-border-danger) bg-destructive-subtle text-foreground [&>svg]:text-destructive-text",
        danger:
          "border-(--qx-component-alert-border-danger) bg-destructive-subtle text-foreground [&>svg]:text-destructive-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/** The alert's own props plus its `variant` surface. */
type AlertProps = React.ComponentProps<"div"> & VariantProps<typeof alertVariants>;

/**
 * An inline, assertive status message (`role="alert"`). Put a lucide icon first for the status
 * glyph, then `AlertTitle` / `AlertDescription`, and optionally an `AlertAction`.
 *
 * `role="alert"` interrupts. For a message that is present when the page loads, or one that is
 * informational rather than urgent, pass `role="status"` (polite) or `role={undefined}`.
 */
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
      className={cn(
        "col-start-2 font-heading text-sm font-medium tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 text-sm text-(--qx-component-alert-description) [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Trailing actions for an Alert — a "Retry" or "View details" button, or a dismiss IconButton.
 * Sits in its own column at the inline end, vertically centred against the message.
 */
function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "col-start-3 row-span-2 row-start-1 flex items-center gap-2 self-center ps-3",
        className,
      )}
      {...props}
    />
  );
}

export type { AlertProps };
export { Alert, AlertAction, AlertDescription, AlertTitle, alertVariants };
