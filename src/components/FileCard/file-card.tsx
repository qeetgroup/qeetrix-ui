"use client";

import { CircleAlertIcon } from "@qeetrix/icons/icons/circle-alert";
import type * as React from "react";
import { FileTypeIcon } from "@/components/FileCard/file-type-icon";
import { Progress } from "@/components/Progress/progress";
import type { FileCardMessages, MessagesFor } from "@/lib/messages";
import { fileCardMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

/** What the card is doing with its file. Omit for a file at rest. */
type FileCardStatus = "uploading" | "downloading" | "error";

interface FileCardProps extends React.ComponentProps<"div"> {
  name: string;
  /** For the icon — filename/extension/MIME. Defaults to `name`. */
  type?: string;
  /** Pre-formatted size, e.g. "2.4 MB". */
  size?: React.ReactNode;
  /** Secondary line (owner · modified, etc.). */
  meta?: React.ReactNode;
  /** Optional preview node; falls back to the file-type icon. */
  thumbnail?: React.ReactNode;
  /**
   * Trailing actions (a menu button, a download button, a selection checkbox). Always visible —
   * never revealed on hover only, which keyboard and touch users cannot do — and stacked above
   * the card's open target, so they stay independently clickable.
   */
  actions?: React.ReactNode;
  selected?: boolean;
  /**
   * `tile` (default) — a preview above the name, for grids (Drive, a document library).
   * `row` — a compact horizontal row, for attachment lists and narrow panels.
   */
  layout?: "tile" | "row";
  /** A transfer in progress, or a failed one. Omit for a file at rest. */
  status?: FileCardStatus;
  /** Transfer progress 0–100. Omit while uploading/downloading for an indeterminate bar. */
  progress?: number;
  /** Failure text shown (and announced) when `status="error"`. */
  error?: React.ReactNode;
  /**
   * Makes the card open somewhere: the name becomes a link, and its hit area stretches over the
   * whole card. Use with a router by handling the click on a parent, or use `onOpen`.
   */
  href?: string;
  /** Makes the card open in place: the name becomes a button whose hit area covers the card. */
  onOpen?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Overrides for the card's built-in English strings. */
  messages?: MessagesFor<"fileCard">;
}

/** The extension as a short label ("PDF"), or nothing when the name does not carry one. */
function extensionOf(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return null;
  const ext = name.slice(dot + 1);
  return /^[a-z0-9]{1,5}$/i.test(ext) ? ext.toUpperCase() : null;
}

/**
 * Compact file presentation for grids and lists (Drive, Mail attachments, Tasks, Pay invoices).
 *
 * The name is the one line that matters: it truncates with the full name in a tooltip, and the
 * extension is shown separately, so a long name never hides what kind of file it is. Size and
 * metadata share one muted line beneath it.
 *
 * States: `selected` uses the Qeet selected vocabulary (brand tint and a 2px brand outline, so it
 * never depends on the tint alone); `status` shows an upload or download in progress with a
 * named progress bar, or a failure with an announced message and a danger outline. A card with
 * `href` or `onOpen` is interactive — it lifts on hover and shows the focus ring when its name
 * has focus; a card without either stays still, because a hover response on a surface that does
 * nothing is a false affordance.
 */
function FileCard({
  name,
  type,
  size,
  meta,
  thumbnail,
  actions,
  selected,
  layout = "tile",
  status,
  progress,
  error,
  href,
  onOpen,
  messages: messageOverrides,
  className,
  ...props
}: FileCardProps) {
  const messages = useMessages("fileCard", fileCardMessages, messageOverrides);
  const locale = useLocale();
  const iconType = type ?? name;
  const extension = extensionOf(name) ?? (type && !type.includes("/") ? extensionOf(type) : null);
  const transferring = status === "uploading" || status === "downloading";
  const interactive = Boolean(href || onOpen);
  const isRow = layout === "row";

  const percent =
    transferring && typeof progress === "number"
      ? new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(
          Math.min(Math.max(progress, 0), 100) / 100,
        )
      : null;

  // The name is the card's one tab stop when it opens; its ::after covers the card so a click
  // anywhere (bar the actions, which sit above it) opens it. <bdi> isolates it: a Latin file
  // name keeps its own order inside a right-to-left interface, and vice versa.
  const openClass =
    "min-w-0 truncate text-start outline-none after:absolute after:inset-0 after:rounded-[inherit]";
  const title = href ? (
    <a data-slot="file-card-open" href={href} title={name} className={openClass}>
      <bdi>{name}</bdi>
    </a>
  ) : onOpen ? (
    <button
      data-slot="file-card-open"
      type="button"
      title={name}
      onClick={onOpen}
      className={cn(openClass, "cursor-pointer")}
    >
      <bdi>{name}</bdi>
    </button>
  ) : (
    <span className="min-w-0 truncate" title={name}>
      <bdi>{name}</bdi>
    </span>
  );

  const details =
    status === "error" ? (
      <div
        role="alert"
        className="flex min-w-0 items-center gap-1 text-caption text-destructive-text"
      >
        <CircleAlertIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">{error ?? messages.failed}</span>
      </div>
    ) : size || meta || (isRow && extension) || percent ? (
      <div
        data-slot="file-card-meta"
        className="flex min-w-0 items-center gap-1 text-caption text-muted-foreground"
      >
        {/* Each segment is isolated, so "184 KB" does not read "KB 184" in a right-to-left UI. */}
        <span className="truncate">
          {isRow && extension && <bdi>{extension}</bdi>}
          {isRow && extension && (size || meta) ? " · " : ""}
          {size && <bdi>{size}</bdi>}
          {size && meta ? " · " : ""}
          {meta && <bdi>{meta}</bdi>}
        </span>
        {percent && <span className="ms-auto shrink-0 ps-2 tabular-nums">{percent}</span>}
      </div>
    ) : null;

  const progressBar = transferring && (
    <Progress
      value={typeof progress === "number" ? Math.min(Math.max(progress, 0), 100) : null}
      aria-label={status === "uploading" ? messages.uploading(name) : messages.downloading(name)}
      className="**:data-[slot=progress-track]:h-1"
    />
  );

  const actionSlot = actions && (
    <div data-slot="file-card-actions" className="relative z-10 flex shrink-0 items-center gap-1">
      {actions}
    </div>
  );

  return (
    <div
      data-slot="file-card"
      data-layout={layout}
      data-selected={selected || undefined}
      data-status={status}
      data-interactive={interactive || undefined}
      className={cn(
        "group/file relative flex rounded-(--qx-component-file-card-corner) border border-(--qx-component-file-card-border) bg-(--qx-component-file-card-background) text-card-foreground",
        "transition-[border-color,box-shadow,background-color] duration-fast ease-standard",
        isRow
          ? "items-center gap-3 p-2"
          : "flex-col gap-2 p-3 shadow-(--qx-component-file-card-elevation)",
        // Hover moves only an unremarkable edge: a selected or errored card keeps its own border.
        "data-interactive:not-data-selected:not-data-[status=error]:hover:border-(--qx-component-file-card-border-hover) data-interactive:hover:shadow-(--qx-component-file-card-elevation-hover)",
        "has-[[data-slot=file-card-open]:focus-visible]:focus-ring",
        "data-[status=error]:border-(--qx-component-file-card-border-error)",
        // Selected: the brand tint, and the brand outline doubled to 2px with a matching ring so
        // the state passes non-text contrast without the tint. Forced colours strip the ring and
        // the tint, so there a 2px Highlight outline carries the state instead.
        "data-selected:border-(--qx-component-file-card-border-selected) data-selected:bg-(--qx-component-file-card-background-selected) data-selected:ring-1 data-selected:ring-(--qx-component-file-card-border-selected)",
        "forced-colors:data-selected:border-[Highlight] forced-colors:data-selected:outline-2 forced-colors:data-selected:-outline-offset-1 forced-colors:data-selected:outline-[Highlight] forced-colors:data-selected:outline-solid",
        className,
      )}
      {...props}
    >
      {isRow ? (
        <>
          <div
            data-slot="file-card-preview"
            className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-(--qx-component-file-card-preview-background)"
          >
            {thumbnail ?? <FileTypeIcon aria-hidden type={iconType} />}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 font-ui text-sm font-medium text-foreground">{title}</div>
            {details}
            {progressBar}
          </div>
          {actionSlot}
        </>
      ) : (
        <>
          <div
            data-slot="file-card-preview"
            className="relative flex aspect-video flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-(--qx-component-file-card-preview-background)"
          >
            {thumbnail ?? (
              <>
                <FileTypeIcon aria-hidden type={iconType} className="size-8" />
                {extension && (
                  <span
                    aria-hidden
                    className="font-ui text-micro font-medium tracking-wide text-muted-foreground"
                  >
                    {extension}
                  </span>
                )}
              </>
            )}
            {progressBar && <div className="absolute inset-x-2 bottom-2">{progressBar}</div>}
          </div>
          <div className="flex items-start gap-2">
            {thumbnail && <FileTypeIcon aria-hidden type={iconType} className="mt-0.5 size-4" />}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex min-w-0 font-ui text-sm font-medium text-foreground">
                {title}
              </div>
              {details}
            </div>
            {actionSlot}
          </div>
        </>
      )}
    </div>
  );
}

export type { FileCardMessages, FileCardProps, FileCardStatus };
export { FileCard };
