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

const notificationVariants = cva("relative flex gap-3 rounded-lg border p-4 shadow-rest", {
  variants: {
    variant: {
      info: "border-info/30 bg-info/10 [--qx-noti-accent:var(--info)]",
      success: "border-success/30 bg-success/10 [--qx-noti-accent:var(--success)]",
      warning: "border-warning/30 bg-warning/10 [--qx-noti-accent:var(--warning)]",
      // `destructive` is the library-wide name for this tone; `error` predates it and
      // keeps working — see docs/standards/component-api.md § Variant vocabulary.
      destructive: "border-destructive/30 bg-destructive/10 [--qx-noti-accent:var(--destructive)]",
      error: "border-destructive/30 bg-destructive/10 [--qx-noti-accent:var(--destructive)]",
    },
  },
  defaultVariants: { variant: "info" },
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
  loading?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"notification">;
}

/**
 * Inline notification card (icon + title + description + close + action), suited
 * for a notification list/feed. Stateless — the caller owns read/unread state.
 * `error` is announced assertively (`role=alert`); the rest are polite.
 */
function Notification({
  className,
  variant = "info",
  title,
  description,
  icon,
  onClose,
  action,
  loading,
  messages: messageOverrides,
  children,
  ...props
}: NotificationProps) {
  const messages = useMessages("notification", notificationMessages, messageOverrides);
  const Icon = DEFAULT_ICONS[variant ?? "info"];
  const showIcon = icon !== null;

  return (
    <div
      data-slot="notification"
      role={variant === "destructive" || variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn(notificationVariants({ variant }), className)}
      {...props}
    >
      {showIcon && (
        <span
          data-slot="notification-icon"
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-(--qx-noti-accent)"
        >
          {icon ??
            (loading ? (
              <Loader2Icon aria-hidden className="size-5 animate-spin" />
            ) : (
              <Icon className="size-5" />
            ))}
        </span>
      )}
      <div data-slot="notification-content" className="flex-1 space-y-1">
        {title && (
          <div data-slot="notification-title" className="text-sm font-semibold text-foreground">
            {title}
          </div>
        )}
        {description && (
          <div data-slot="notification-description" className="text-sm text-muted-foreground">
            {description}
          </div>
        )}
        {children}
        {action && (
          <div data-slot="notification-action" className="pt-1">
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
          className="-me-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/disabled"
        >
          <XIcon aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}

export type { NotificationProps };
export { Notification, notificationVariants };
