import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * One status language across Alert, Banner and Callout. `emphasis="subtle"` (the default) is the
 * `<status>-subtle` surface, a hairline mixed from the status hue (`--qx-component-alert-border-*`),
 * a 3px inline-start accent and title in the status text colour, and neutral description prose —
 * clearly coloured, still calm enough for a dense screen. `emphasis="strong"` is a solid status fill
 * with a white label (near-black on amber) for messages that must not be missed: a blocking error,
 * a suspended account. Use it sparingly.
 */
/**
 * Text, icon, title and description in the label colour of a strong fill. Spelled out in full —
 * Tailwind only generates classes it can read literally in the source.
 */
const ON_FEEDBACK_STRONG =
  "text-on-feedback-strong [&>svg]:text-on-feedback-strong [&>[data-slot=alert-title]]:text-on-feedback-strong [&>[data-slot=alert-description]]:text-on-feedback-strong";
const ON_WARNING_STRONG =
  "text-on-warning-strong [&>svg]:text-on-warning-strong [&>[data-slot=alert-title]]:text-on-warning-strong [&>[data-slot=alert-description]]:text-on-warning-strong";

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
      emphasis: {
        subtle: "",
        strong: "",
      },
    },
    compoundVariants: [
      // Subtle: the status hue as an inline-start accent and on the title; prose stays neutral.
      {
        variant: "info",
        emphasis: "subtle",
        class: "border-s-[3px] border-s-info [&>[data-slot=alert-title]]:text-info-text",
      },
      {
        variant: "success",
        emphasis: "subtle",
        class: "border-s-[3px] border-s-success [&>[data-slot=alert-title]]:text-success-text",
      },
      {
        variant: "warning",
        emphasis: "subtle",
        class: "border-s-[3px] border-s-warning [&>[data-slot=alert-title]]:text-warning-text",
      },
      {
        variant: ["destructive", "danger"],
        emphasis: "subtle",
        class:
          "border-s-[3px] border-s-destructive [&>[data-slot=alert-title]]:text-destructive-text",
      },
      // Strong: a solid, theme-invariant status fill. Everything inside takes the on-fill label.
      {
        variant: "info",
        emphasis: "strong",
        class: `border-info-strong bg-info-strong ${ON_FEEDBACK_STRONG}`,
      },
      {
        variant: "success",
        emphasis: "strong",
        class: `border-success-strong bg-success-strong ${ON_FEEDBACK_STRONG}`,
      },
      {
        variant: "warning",
        emphasis: "strong",
        class: `border-warning-strong bg-warning-strong ${ON_WARNING_STRONG}`,
      },
      {
        variant: ["destructive", "danger"],
        emphasis: "strong",
        class: `border-destructive-strong bg-destructive-strong ${ON_FEEDBACK_STRONG}`,
      },
    ],
    defaultVariants: {
      variant: "default",
      emphasis: "subtle",
    },
  },
);

/** The alert's own props plus its `variant` and `emphasis` surface. */
type AlertProps = React.ComponentProps<"div"> & VariantProps<typeof alertVariants>;

/**
 * An inline, assertive status message (`role="alert"`). Put an `@qeetrix/icons` icon first for the status
 * glyph, then `AlertTitle` / `AlertDescription`, and optionally an `AlertAction`.
 *
 * `role="alert"` interrupts. For a message that is present when the page loads, or one that is
 * informational rather than urgent, pass `role="status"` (polite) or `role={undefined}`.
 */
function Alert({ className, variant, emphasis, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      data-emphasis={emphasis ?? "subtle"}
      role="alert"
      className={cn(alertVariants({ variant, emphasis }), className)}
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
