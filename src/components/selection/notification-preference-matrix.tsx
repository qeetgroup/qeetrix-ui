"use client";

import type * as React from "react";

import { Switch } from "@/components/selection/switch";
import type { MessagesFor } from "@/lib/messages";
import { notificationPreferenceMatrixMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

interface PrefChannel {
  key: string;
  label: string;
}
interface PrefCategory {
  key: string;
  label: string;
  description?: string;
}
/** category key → channel key → enabled. */
type PreferenceMatrix = Record<string, Record<string, boolean>>;

interface NotificationPreferenceMatrixProps {
  channels: PrefChannel[];
  categories: PrefCategory[];
  value: PreferenceMatrix;
  onValueChange: (value: PreferenceMatrix) => void;
  /**
   * Names the table for assistive technology. Rendered in a `<caption>` that is
   * visually hidden by default, so table-navigation mode has something to read
   * without changing the layout. Pass `captionVisible` to show it.
   * @default "Notification preferences by channel"
   */
  caption?: React.ReactNode;
  /** Render `caption` visibly above the table instead of only for screen readers. */
  captionVisible?: boolean;
  /**
   * Column header above the category names. @default "Notification" — equivalent to
   * `messages={{ categoryHeader }}` and wins over it, and unlike the catalogue it accepts a
   * node rather than a string.
   */
  categoryHeader?: React.ReactNode;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"notificationPreferenceMatrix">;
  className?: string;
}

/**
 * Channel × category notification preferences — a grid of switches.
 *
 * The relationships a sighted user reads off the layout are in the markup: a
 * `<caption>` names the table, channel headers are `<th scope="col">` and each
 * category is a `<th scope="row">`, so table-navigation mode announces "Security
 * alerts, Email" rather than an unlabelled cell. Each switch also names both of
 * its axes, which is what a screen reader reads in ordinary reading mode where
 * table headers are not announced.
 */
function NotificationPreferenceMatrix({
  channels,
  categories,
  value,
  onValueChange,
  caption,
  captionVisible = false,
  categoryHeader,
  messages: messageOverrides,
  className,
}: NotificationPreferenceMatrixProps) {
  const messages = useMessages(
    "notificationPreferenceMatrix",
    notificationPreferenceMatrixMessages,
    messageOverrides,
  );
  const toggle = (cat: string, ch: string, checked: boolean) => {
    onValueChange({ ...value, [cat]: { ...value[cat], [ch]: checked } });
  };

  return (
    <div
      data-slot="notification-preference-matrix"
      className={cn("w-full overflow-x-auto", className)}
    >
      <table className="w-full border-collapse text-sm">
        <caption
          data-slot="notification-preference-matrix-caption"
          className={cn(
            captionVisible ? "pb-2 text-start text-sm text-muted-foreground" : "sr-only",
          )}
        >
          {caption ?? messages.caption}
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-2 pe-4 text-start font-medium text-muted-foreground">
              {categoryHeader ?? messages.categoryHeader}
            </th>
            {channels.map((ch) => (
              <th
                key={ch.key}
                scope="col"
                className="px-3 py-2 text-center font-medium text-muted-foreground"
              >
                {ch.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.key} className="border-b border-border last:border-0">
              <th scope="row" className="py-3 pe-4 text-start font-normal">
                <div className="font-medium text-foreground">{cat.label}</div>
                {cat.description && (
                  <div className="text-xs text-muted-foreground">{cat.description}</div>
                )}
              </th>
              {channels.map((ch) => (
                <td key={ch.key} className="px-3 py-3 text-center">
                  <Switch
                    checked={!!value[cat.key]?.[ch.key]}
                    onCheckedChange={(checked) => toggle(cat.key, ch.key, checked)}
                    aria-label={messages.cell(cat.label, ch.label)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { NotificationPreferenceMatrixProps, PrefCategory, PrefChannel, PreferenceMatrix };
export { NotificationPreferenceMatrix };
