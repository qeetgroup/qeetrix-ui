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
import { Feed } from "@/components/Feed/feed";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover/popover";
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
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  error: "text-destructive",
} as const;

/**
 * In-app notification inbox: a bell trigger with an unread badge opening a
 * feed of notifications (all / unread tabs, mark-all-read, per-item dismiss).
 * Composes Popover + Tabs + Badge over the APG Feed pattern.
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
      <div className="flex flex-col items-center gap-1 px-4 py-12 text-center text-sm text-muted-foreground">
        <BellIcon aria-hidden className="size-6 opacity-40" />
        {emptyMessage ?? messages.empty}
      </div>
    ) : (
      <Feed
        aria-label={messages.feed}
        className="max-h-96 gap-0 divide-y divide-border overflow-y-auto"
        itemClassName="flex gap-3 rounded-none border-0 bg-transparent px-3 py-2.5 shadow-none hover:bg-muted/40 hover:shadow-none focus-visible:bg-muted/40"
      >
        {data.map((item) => {
          const Icon = ICONS[item.variant ?? "info"];
          return (
            <React.Fragment key={item.id}>
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center",
                  ACCENT[item.variant ?? "info"],
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {!item.read && (
                    <span
                      role="img"
                      aria-label={messages.unread}
                      className="size-1.5 shrink-0 rounded-full bg-primary"
                    />
                  )}
                  <span className="truncate">{item.title}</span>
                </div>
                {item.description && (
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                )}
                {item.time && <div className="text-xs text-muted-foreground">{item.time}</div>}
                {item.action && <div className="pt-1">{item.action}</div>}
              </div>
              {onDismiss && (
                <button
                  type="button"
                  aria-label={messages.dismiss}
                  onClick={() => onDismiss(item.id)}
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
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
              <Badge className="absolute -inset-e-1 -top-1 flex size-4 items-center justify-center rounded-full p-0 text-[length:var(--qx-component-notification-center-count-font-size)] tabular-nums">
                {unread.length > 9 ? "9+" : unread.length}
              </Badge>
            )}
          </Button>
        }
      />
      <PopoverContent align={align} className="w-96 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">{messages.heading}</span>
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
