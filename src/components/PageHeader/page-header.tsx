import type * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Eyebrow / breadcrumb slot rendered above the title. */
  breadcrumb?: React.ReactNode;
  /** Trailing actions (buttons, menus). Wraps beneath the title when the header is narrow. */
  actions?: React.ReactNode;
  /**
   * Facts about the page's subject — a status badge, an owner, "Updated 4 min ago" — laid out
   * as a wrapping row beneath the description.
   */
  metadata?: React.ReactNode;
}

/**
 * The standard top-of-page title block: optional breadcrumb eyebrow, a title, a description,
 * a metadata row and trailing actions. Presentational and router-agnostic — resolve the title
 * and breadcrumb in your app and pass them in.
 *
 * It responds to the width it is given rather than to the viewport: the text column claims at
 * least 20rem before it shares a line with the actions, so in a narrow panel, a split pane or a
 * phone the actions wrap beneath the title instead of squeezing it to a word per line.
 */
function PageHeader({
  className,
  title,
  description,
  breadcrumb,
  actions,
  metadata,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}
      {...props}
    >
      <div data-slot="page-header-content" className="flex min-w-0 flex-[1_1_20rem] flex-col gap-1">
        {breadcrumb && (
          <div data-slot="page-header-breadcrumb" className="mb-0.5 text-xs text-muted-foreground">
            {breadcrumb}
          </div>
        )}
        <h1
          data-slot="page-header-title"
          className="font-heading text-2xl font-semibold tracking-tight text-balance wrap-break-word text-foreground"
        >
          {title}
        </h1>
        {description && (
          <p
            data-slot="page-header-description"
            className="max-w-2xl text-sm text-pretty text-muted-foreground"
          >
            {description}
          </p>
        )}
        {metadata && (
          <div
            data-slot="page-header-metadata"
            className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
          >
            {metadata}
          </div>
        )}
        {children}
      </div>
      {actions && (
        <div
          data-slot="page-header-actions"
          className="flex max-w-full shrink-0 flex-wrap items-center gap-2"
        >
          {actions}
        </div>
      )}
    </div>
  );
}

export type { PageHeaderProps };
export { PageHeader };
