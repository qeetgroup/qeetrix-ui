import type * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Eyebrow / breadcrumb slot rendered above the title. */
  breadcrumb?: React.ReactNode;
  /** Right-aligned actions (buttons, menus). */
  actions?: React.ReactNode;
}

/**
 * The standard top-of-page title block: optional breadcrumb eyebrow, a title,
 * a description, and right-aligned actions. Presentational and router-agnostic
 * — resolve the title/breadcrumb in your app and pass them in.
 */
function PageHeader({
  className,
  title,
  description,
  breadcrumb,
  actions,
  children,
  ...props
}: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {breadcrumb && (
          <div data-slot="page-header-breadcrumb" className="text-xs text-muted-foreground">
            {breadcrumb}
          </div>
        )}
        <h1
          data-slot="page-header-title"
          className="font-heading text-2xl font-semibold tracking-tight"
        >
          {title}
        </h1>
        {description && (
          <p
            data-slot="page-header-description"
            className="max-w-2xl text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div data-slot="page-header-actions" className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export type { PageHeaderProps };
export { PageHeader };
