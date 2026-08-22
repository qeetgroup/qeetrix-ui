import type * as React from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Icon shown in a muted circle above the title. */
  icon?: React.ComponentType<{ className?: string }>;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Action slot (e.g. a primary Button) rendered below the description. */
  action?: React.ReactNode;
}

/**
 * EmptyState is the icon + title + description + action zero-state used for
 * empty lists, no-results, and first-run surfaces. It pairs with DataState:
 * pass it as `empty={<EmptyState … />}`, or drop it straight into a Card.
 */
function EmptyState({
  className,
  icon: Icon,
  title,
  description,
  action,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {Icon && (
        <div
          data-slot="empty-state-icon"
          className="mb-1 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <Icon className="size-5" />
        </div>
      )}
      {title && (
        <p
          data-slot="empty-state-title"
          className="font-heading text-sm font-medium text-foreground"
        >
          {title}
        </p>
      )}
      {description && (
        <p data-slot="empty-state-description" className="max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <div data-slot="empty-state-action" className="mt-3 flex items-center gap-2">
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export type { EmptyStateProps };
export { EmptyState };
