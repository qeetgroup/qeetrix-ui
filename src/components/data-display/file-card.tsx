import type * as React from "react";
import { FileTypeIcon } from "@/components/data-display/file-type-icon";
import { cn } from "@/lib/utils";

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
  /** Trailing actions (a menu button, etc.). */
  actions?: React.ReactNode;
  selected?: boolean;
}

/** Compact file tile for grids and lists (Drive, Mail attachments, Tasks). */
function FileCard({
  name,
  type,
  size,
  meta,
  thumbnail,
  actions,
  selected,
  className,
  ...props
}: FileCardProps) {
  const iconType = type ?? name;
  return (
    <div
      data-slot="file-card"
      data-selected={selected || undefined}
      className={cn(
        "group/file relative flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-rest transition-shadow hover:shadow-hover data-selected:border-ring data-selected:ring-2 data-selected:ring-ring/40",
        className,
      )}
      {...props}
    >
      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted">
        {thumbnail ?? <FileTypeIcon aria-hidden type={iconType} className="size-8" />}
      </div>
      <div className="flex items-start gap-2">
        <FileTypeIcon aria-hidden type={iconType} className="mt-0.5 size-4" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium" title={name}>
            {name}
          </div>
          {(size || meta) && (
            <div className="truncate text-xs text-muted-foreground">
              {size}
              {size && meta ? " · " : ""}
              {meta}
            </div>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export type { FileCardProps };
export { FileCard };
