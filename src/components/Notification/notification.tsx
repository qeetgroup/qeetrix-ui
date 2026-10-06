"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
  CheckCircle2Icon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import type * as React from "react";

import type { MessagesFor } from "@/lib/messages";
import { notificationMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/**
 * An event card: the same anatomy as a Toast (which is a transient Notification) on a neutral
 * card. The status lives in the icon tile — subtle status surface, AA status glyph — so a feed
 * of mixed events reads as one calm list rather than a column of coloured boxes; the tinted
 * whole-card treatment belongs to Alert, which is about one message, not a stream.
 */
const notificationVariants = cva(
  "group/notification relative flex rounded-lg border border-border bg-card text-card-foreground shadow-rest",
  {
    variants: {
      variant: {
        info: "",
        success: "",
        warning: "",
        // `destructive` is the library-wide name for this tone; `error` predates it and
        // keeps working — see docs/standards/component-api.md § Variant vocabulary.
        destructive: "",
        error: "",
      },
      size: {
        default: "gap-3 p-4",
        sm: "gap-2.5 px-3 py-2.5",
      },
    },
    defaultVariants: { variant: "info", size: "default" },
  },
);

const notificationIconVariants = cva("flex shrink-0 items-center justify-center rounded-md", {
  variants: {
    variant: {
      info: "bg-info-subtle text-info-text",
      success: "bg-success-subtle text-success-text",
      warning: "bg-warning-subtle text-warning-text",
      destructive: "bg-destructive-subtle text-destructive-text",
      error: "bg-destructive-subtle text-destructive-text",
    },
    size: {
      default: "size-8 [&>svg]:size-4",
      sm: "size-6 [&>svg]:size-3.5",
    },
  },
  defaultVariants: { variant: "info", size: "default" },
});

const DEFAULT_ICONS = {
  info: InfoIcon,
  success: CheckCircle2Icon,
  warning: TriangleAlertIcon,
  destructive: XCircleIcon,
  error: XCircleIcon,
} as const;

interface NotificationProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof notificationVariants> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Override the default per-variant icon. Pass `null` to hide it. */
  icon?: React.ReactNode;
  /** Renders a close button and fires this on activation. */
  onClose?: () => void;
  /** Action node (e.g. a `Button` or link) shown under the description. */
  action?: React.ReactNode;
  /** Replaces the icon with a spinner and marks the card busy. */
  loading?: boolean;
  /** When it happened — a relative time or a `<time>` element — shown opposite the title. */
  time?: React.ReactNode;
  /**
   * Marks the event unread: a Qeet dot before the title and a semibold title. The dot is
   * decorative; announce unread state in `title` or the surrounding list if it matters.
   */
  unread?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"notification">;
}

/**
 * Inline notification card (icon + title + description + close + action), suited
 * for a notification list/feed. Stateless — the caller owns read/unread state.
 * `destructive`/`error` are announced assertively (`role=alert`); the rest are polite
 * (`role=status`). In a long feed, pass `role={undefined}` so every card is not a live region.
 */
function Notification({
  className,
  variant = "info",
  size,
  title,
  description,
  icon,
  onClose,
  action,
  loading,
  time,
  unread,
  messages: messageOverrides,
  children,
  ...props
}: NotificationProps) {
  const messages = useMessages("notification", notificationMessages, messageOverrides);
  const resolvedVariant = variant ?? "info";
  const Icon = DEFAULT_ICONS[resolvedVariant];
  const showIcon = icon !== null;
  const urgent = resolvedVariant === "destructive" || resolvedVariant === "error";

  return (
    <div
      data-slot="notification"
      data-variant={resolvedVariant}
      data-unread={unread || undefined}
      role={urgent ? "alert" : "status"}
      // `role=alert` implies assertive; the explicit value keeps a polite `status` from being
      // upgraded and an `alert` from being downgraded by an ancestor's aria-live.
      aria-live={urgent ? "assertive" : "polite"}
      aria-busy={loading || undefined}
      className={cn(notificationVariants({ variant: resolvedVariant, size }), className)}
      {...props}
    >
      {showIcon && (
        <span
          data-slot="notification-icon"
          aria-hidden
          className={notificationIconVariants({ variant: resolvedVariant, size })}
        >
          {icon ?? (loading ? <Loader2Icon className="animate-spin" /> : <Icon />)}
        </span>
      )}
      <div
        data-slot="notification-content"
        // Centre the first line on the icon tile: (32 - 20) / 2 and (24 - 20) / 2.
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-0.5",
          showIcon && (size === "sm" ? "pt-0.5" : "pt-1.5"),
        )}
      >
        {(title || time) && (
          <div className="flex items-baseline gap-2">
            {unread && (
              <span
                data-slot="notification-unread"
                aria-hidden
                className="size-1.5 shrink-0 -translate-y-px self-center rounded-full bg-border-brand forced-color-adjust-none forced-colors:bg-[CanvasText]"
              />
            )}
            {title && (
              <div
                data-slot="notification-title"
                className={cn(
                  "min-w-0 flex-1 text-sm wrap-break-word text-foreground",
                  unread ? "font-semibold" : "font-medium",
                )}
              >
                {title}
              </div>
            )}
            {time && (
              <div
                data-slot="notification-time"
                className="ms-auto shrink-0 text-xs text-muted-foreground tabular-nums"
              >
                {time}
              </div>
            )}
          </div>
        )}
        {description && (
          <div
            data-slot="notification-description"
            className="text-sm wrap-break-word text-muted-foreground"
          >
            {description}
          </div>
        )}
        {children}
        {action && (
          <div data-slot="notification-action" className="flex flex-wrap items-center gap-2 pt-2">
            {action}
          </div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          data-slot="notification-close"
          aria-label={messages.dismiss}
          onClick={onClose}
          className="-me-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast ease-standard hover:bg-surface-interactive hover:text-foreground focus-visible:focus-ring"
        >
          <XIcon aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}

export type { NotificationProps };
export { Notification, notificationIconVariants, notificationVariants };
