/**
 * NotificationPreferenceMatrix — a Qeetrix block. Copy this file into your app and adapt it: it is built only from
 * the public `@qeetrix/ui` and `@qeetrix/icons` APIs, and is not part of the published package.
 */
"use client";

import { LockIcon } from "@qeetrix/icons";
import {
  Checkbox,
  cn,
  type MessageOverrides,
  resolveMessages,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@qeetrix/ui";
import * as React from "react";

/** English defaults; pass `messages` to override any of them per instance. */
const notificationPreferenceMatrixMessages = {
  /** Caption of the preference table. */
  caption: "Notification preferences by channel",
  /** Header of the leading category column. */
  categoryHeader: "Notification",
  /** Accessible name of one checkbox, naming the category and the channel it belongs to. */
  cell: (category: string, channel: string) => `${category} via ${channel}`,
  /** Screen-reader text of a cell whose channel does not apply to the category. */
  notAvailable: "Not available",
  /** Description of a locked cell's control. */
  locked: "Managed by your organization",
};
type NotificationPreferenceMatrixMessages = typeof notificationPreferenceMatrixMessages;

interface PrefChannel {
  key: string;
  label: string;
  /** A glyph shown with the channel's header — the fastest way to find a column. */
  icon?: React.ReactNode;
}
interface PrefCategory {
  key: string;
  label: string;
  description?: string;
  /**
   * The channels this category can be delivered on. Omitted, every channel applies; a channel
   * not listed renders as "not available" instead of a control that would do nothing.
   */
  channels?: string[];
  /**
   * Channels an administrator has fixed for this category — a security alert that is always
   * emailed. The current value is shown and cannot be changed.
   */
  locked?: string[];
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
   * The control in each cell.
   *
   * - `switch` (default) — each change takes effect immediately, as preference pages that save
   *   as you go do. Announced as "on / off".
   * - `checkbox` — the matrix is part of a form that is submitted, or reviewed, as a whole.
   *   Announced as "checked / not checked".
   */
  control?: "switch" | "checkbox";
  /** Disables every cell, e.g. while the preferences are loading or saving. */
  disabled?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessageOverrides<NotificationPreferenceMatrixMessages>;
  className?: string;
}

/*
 * Explicit table roles. Below 32rem the rows re-flow into stacked cards with CSS `display`,
 * and WebKit drops native table semantics from elements whose display changes. Restating the
 * roles keeps the row and column headers in the accessibility tree at every width.
 */
const ROLE = {
  table: { role: "table" },
  rowgroup: { role: "rowgroup" },
  row: { role: "row" },
  columnheader: { role: "columnheader" },
  rowheader: { role: "rowheader" },
  cell: { role: "cell" },
} as const;

const CELL_PADDING = "py-[var(--qx-control-cell-padding-y)]";

/**
 * Channel × category notification preferences — a grid of switches (or checkboxes).
 *
 * The relationships a sighted user reads off the layout are in the markup: a
 * `<caption>` names the table, channel headers are `<th scope="col">` and each
 * category is a `<th scope="row">`, so table-navigation mode announces "Security
 * alerts, Email" rather than an unlabelled cell. Each control also names both of
 * its axes, which is what a screen reader reads in ordinary reading mode where
 * table headers are not announced.
 *
 * **Scanning.** Rows take the table hover wash so the eye can follow a category across;
 * controls sit centred under centred channel headers (with optional icons) so a column reads
 * as one line; channels that do not apply to a category show a quiet dash instead of a dead
 * control; locked cells carry a lock glyph.
 *
 * **Narrow containers.** Below a 32rem container width the matrix re-flows into one card per
 * category, each channel a labelled row with its control at the inline end — the settings-list
 * shape mobile users expect. It is the same table underneath, so nothing is mounted twice.
 */
function NotificationPreferenceMatrix({
  channels,
  categories,
  value,
  onValueChange,
  caption,
  captionVisible = false,
  categoryHeader,
  control = "switch",
  disabled = false,
  messages: messageOverrides,
  className,
}: NotificationPreferenceMatrixProps) {
  const messages = React.useMemo(
    () => resolveMessages(notificationPreferenceMatrixMessages, messageOverrides),
    [messageOverrides],
  );
  const lockedDescriptionId = React.useId();
  const hasLocked = categories.some((cat) => cat.locked && cat.locked.length > 0);
  const toggle = (cat: string, ch: string, checked: boolean) => {
    onValueChange({ ...value, [cat]: { ...value[cat], [ch]: checked } });
  };

  return (
    <div
      data-slot="notification-preference-matrix"
      data-control={control}
      className={cn("@container w-full", className)}
    >
      {hasLocked && (
        <span id={lockedDescriptionId} hidden>
          {messages.locked}
        </span>
      )}
      <Table {...ROLE.table} className="caption-top border-collapse">
        <TableCaption
          data-slot="notification-preference-matrix-caption"
          className={cn(
            captionVisible ? "mt-0 pb-2 text-start text-sm text-muted-foreground" : "sr-only",
          )}
        >
          {caption ?? messages.caption}
        </TableCaption>
        <TableHeader {...ROLE.rowgroup} className="@max-lg:sr-only">
          <TableRow {...ROLE.row}>
            <TableHead {...ROLE.columnheader} scope="col" className="ps-0 pe-4 text-start">
              {categoryHeader ?? messages.categoryHeader}
            </TableHead>
            {channels.map((ch) => (
              <TableHead
                key={ch.key}
                {...ROLE.columnheader}
                scope="col"
                className="min-w-20 px-3 text-center"
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  {ch.icon && (
                    <span
                      aria-hidden
                      className="flex text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
                    >
                      {ch.icon}
                    </span>
                  )}
                  {ch.label}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody {...ROLE.rowgroup}>
          {categories.map((cat) => (
            <TableRow
              key={cat.key}
              {...ROLE.row}
              className="@max-lg:flex @max-lg:flex-col @max-lg:gap-1 @max-lg:py-3"
            >
              <TableHead
                {...ROLE.rowheader}
                scope="row"
                className={cn(
                  CELL_PADDING,
                  "h-auto min-w-40 ps-0 pe-4 align-middle text-sm font-normal whitespace-normal text-foreground @max-lg:block @max-lg:min-w-0 @max-lg:p-0 @max-lg:pb-1",
                )}
              >
                <div className="font-medium text-foreground">{cat.label}</div>
                {cat.description && (
                  <div className="text-xs text-muted-foreground">{cat.description}</div>
                )}
              </TableHead>
              {channels.map((ch) => {
                const available = !cat.channels || cat.channels.includes(ch.key);
                const locked = cat.locked?.includes(ch.key) ?? false;
                const checked = !!value[cat.key]?.[ch.key];
                const name = messages.cell(cat.label, ch.label);
                const controlProps = {
                  checked,
                  disabled: disabled || locked,
                  "aria-label": name,
                  "aria-describedby": locked ? lockedDescriptionId : undefined,
                };
                return (
                  <TableCell
                    key={ch.key}
                    {...ROLE.cell}
                    data-available={available || undefined}
                    data-locked={locked || undefined}
                    className={cn(
                      CELL_PADDING,
                      "px-3 text-center @max-lg:flex @max-lg:min-h-9 @max-lg:items-center @max-lg:gap-2 @max-lg:p-0 @max-lg:text-start",
                      // A channel that does not apply is noise in a stacked list.
                      !available && "@max-lg:hidden",
                    )}
                  >
                    {/* The channel's name for sighted users once the column headers are
                        hidden; assistive technology already has the header and the control's
                        own name, so it is not read twice. */}
                    <span
                      aria-hidden
                      className="hidden min-w-0 flex-1 items-center gap-2 text-sm text-foreground @max-lg:flex"
                    >
                      {ch.icon && (
                        <span className="flex text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4">
                          {ch.icon}
                        </span>
                      )}
                      {ch.label}
                    </span>
                    {available ? (
                      <span className="relative inline-flex items-center justify-center gap-1.5 align-middle">
                        {/* Beside the control rather than in line with it, so a locked cell's
                            control stays on the column's centre line (and on the list's edge). */}
                        {locked && (
                          <LockIcon
                            aria-hidden
                            className="absolute inset-e-full me-1.5 size-3.5 text-muted-foreground @max-lg:static @max-lg:me-0"
                          />
                        )}
                        {control === "checkbox" ? (
                          <Checkbox
                            {...controlProps}
                            onCheckedChange={(next) => toggle(cat.key, ch.key, next === true)}
                          />
                        ) : (
                          <Switch
                            {...controlProps}
                            onCheckedChange={(next) => toggle(cat.key, ch.key, next)}
                          />
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        <span aria-hidden>—</span>
                        <span className="sr-only">{messages.notAvailable}</span>
                      </span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export type { NotificationPreferenceMatrixProps, PrefCategory, PrefChannel, PreferenceMatrix };
export { NotificationPreferenceMatrix };
