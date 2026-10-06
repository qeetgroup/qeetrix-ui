"use client";

import {
  BellIcon,
  CheckCircle2Icon,
  InfoIcon,
  TriangleAlertIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/Badge/badge";
import { Button } from "@/components/Button/button";
import { EmptyState } from "@/components/EmptyState/empty-state";
import { Feed } from "@/components/Feed/feed";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/Popover/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/Tabs/tabs";
import type { MessagesFor } from "@/lib/messages";
import { notificationCenterMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

type NotificationVariant = "info" | "success" | "warning" | "error";

interface NotificationItem {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  time?: React.ReactNode;
  variant?: NotificationVariant;
  read?: boolean;
  action?: React.ReactNode;
}

interface NotificationCenterProps {
  items: NotificationItem[];
  onMarkAllRead?: () => void;
  onDismiss?: (id: string) => void;
  align?: "start" | "center" | "end";
  /**
   * Shown when the list is empty. Equivalent to `messages={{ empty }}` and wins over it;
   * prefer the catalogue, which translates the tabs and the dismiss buttons at the same time.
   */
  emptyMessage?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"notificationCenter">;
  className?: string;
}

const ICONS = {
  info: InfoIcon,
  success: CheckCircle2Icon,
  warning: TriangleAlertIcon,
  error: XCircleIcon,
} as const;
const ACCENT = {
  info: "text-info-text",
  success: "text-success-text",
  warning: "text-warning-text",
  error: "text-destructive-text",
} as const;

/**
 * In-app notification inbox: a bell trigger with an unread badge opening a
 * feed of notifications (all / unread tabs, mark-all-read, per-item dismiss).
 * Composes Popover + Tabs + Badge over the APG Feed pattern.
 *
 * Tuned for a dense event stream: one row per event, the time on the title line, unread
 * carried by weight and a Qeet dot (never by colour alone — the dot is also named), status by a
 * small coloured glyph rather than a tinted row, and PageUp/PageDown between items (Feed).
 */
function NotificationCenter({
  items,
  onMarkAllRead,
  onDismiss,
  align = "end",
  emptyMessage,
  messages: messageOverrides,
  className,
}: NotificationCenterProps) {
  const messages = useMessages("notificationCenter", notificationCenterMessages, messageOverrides);
  const [tab, setTab] = React.useState("all");
  const unread = items.filter((i) => !i.read);

  const list = (data: NotificationItem[]) =>
    data.length === 0 ? (
      <EmptyState
        size="sm"
        icon={BellIcon}
        description={emptyMessage ?? messages.empty}
        className="py-10"
      />
    ) : (
      <Feed
        aria-label={messages.feed}
        className="max-h-96 gap-0 divide-y divide-border-subtle overflow-y-auto overscroll-contain"
        itemClassName="flex gap-3 rounded-none border-0 bg-transparent px-3 py-2.5 shadow-none transition-colors duration-fast ease-standard hover:bg-surface-interactive hover:shadow-none focus-visible:focus-ring-inset"
      >
        {data.map((item) => {
          const variant = item.variant ?? "info";
          const Icon = ICONS[variant];
          return (
            <React.Fragment key={item.id}>
              <span
                aria-hidden
                className={cn("flex h-5 w-4 shrink-0 items-center justify-center", ACCENT[variant])}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-baseline gap-2 text-sm text-foreground">
                  {!item.read && (
                    <span
                      role="img"
                      aria-label={messages.unread}
                      className="size-1.5 shrink-0 -translate-y-px self-center rounded-full bg-border-brand forced-color-adjust-none forced-colors:bg-[CanvasText]"
                    />
                  )}
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      item.read ? "font-normal" : "font-semibold",
                    )}
                  >
                    {item.title}
                  </span>
                  {item.time && (
                    <span className="ms-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                      {item.time}
                    </span>
                  )}
                </div>
                {item.description && (
                  <div className="line-clamp-2 text-sm text-muted-foreground">
                    {item.description}
                  </div>
                )}
                {item.action && <div className="pt-1">{item.action}</div>}
              </div>
              {onDismiss && (
                <button
                  type="button"
                  aria-label={messages.dismiss}
                  onClick={() => onDismiss(item.id)}
                  className="-me-1 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors duration-fast ease-standard hover:bg-surface-interactive-hover hover:text-foreground focus-visible:focus-ring"
                >
                  <XIcon aria-hidden className="size-4" />
                </button>
              )}
            </React.Fragment>
          );
        })}
      </Feed>
    );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={messages.trigger(unread.length)}
            className={cn("relative", className)}
          >
            <BellIcon aria-hidden />
            {unread.length > 0 && (
              <Badge
                aria-hidden
                className="absolute -inset-e-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-(length:--qx-component-notification-center-count-font-size) tabular-nums ring-2 ring-background"
              >
                {unread.length > 9 ? "9+" : unread.length}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent align={align} className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          {/* PopoverTitle names the inbox dialog (it was an unnamed role="dialog"). */}
          <PopoverTitle className="font-heading text-sm font-semibold">
            {messages.heading}
          </PopoverTitle>
          {unread.length > 0 && onMarkAllRead && (
            <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
              {messages.markAllRead}
            </Button>
          )}
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
          <TabsList className="mx-2 mt-2">
            <TabsTrigger value="all">{messages.allTab}</TabsTrigger>
            <TabsTrigger value="unread">{messages.unreadTab(unread.length)}</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{list(items)}</TabsContent>
          <TabsContent value="unread">{list(unread)}</TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

export type { NotificationCenterProps, NotificationItem };
export { NotificationCenter };
