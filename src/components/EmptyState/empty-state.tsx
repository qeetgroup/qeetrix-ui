import { cva, type VariantProps } from "class-variance-authority";
import { LockIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Zero states differ in *why* there is nothing to show, and the why decides the treatment:
 *
 * - `default` — a neutral empty collection ("No invoices yet"). Graphite tile.
 * - `first-use` — an invitation to create the first thing. The only variant that takes the quiet
 *   Qeet tint; pair it with the primary Button.
 * - `no-results` — the data exists, the filter excluded it. Graphite, with a "clear filters"
 *   style secondary action.
 * - `no-permission` — the data exists, the viewer cannot see it. Graphite, lock glyph; say who
 *   can grant access.
 * - `error` — loading failed. The destructive tint on the icon tile only; the copy stays neutral
 *   so a failure reads as recoverable rather than alarming.
 *
 * No illustrations: a 20px lucide glyph on a tinted tile, so the component works in a table cell,
 * a side panel or a full page without an asset pipeline.
 */
const emptyStateVariants = cva("flex flex-col items-center justify-center text-center", {
  variants: {
    size: {
      sm: "gap-1.5 px-4 py-6",
      default: "gap-2 px-6 py-12",
      lg: "gap-2.5 px-6 py-16",
    },
  },
  defaultVariants: { size: "default" },
});

const emptyStateIconVariants = cva(
  "flex shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-surface-sunken text-muted-foreground ring-border-subtle",
        "first-use": "bg-brand-subtle text-brand ring-border-subtle",
        "no-results": "bg-surface-sunken text-muted-foreground ring-border-subtle",
        "no-permission": "bg-surface-sunken text-muted-foreground ring-border-subtle",
        error: "bg-destructive-subtle text-destructive-text ring-border-subtle",
      },
      size: {
        sm: "mb-0.5 size-9 [&>svg]:size-4",
        default: "mb-1 size-11 [&>svg]:size-5",
        lg: "mb-1.5 size-12 [&>svg]:size-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type EmptyStateVariant = NonNullable<VariantProps<typeof emptyStateIconVariants>["variant"]>;

const DEFAULT_ICON: Partial<
  Record<EmptyStateVariant, React.ComponentType<{ className?: string }>>
> = {
  "no-results": SearchXIcon,
  "no-permission": LockIcon,
  error: TriangleAlertIcon,
};

interface EmptyStateProps
  extends Omit<React.ComponentProps<"div">, "title">,
    VariantProps<typeof emptyStateVariants> {
  /**
   * Icon shown in a tinted tile above the title. `no-results`, `no-permission` and `error` have
   * a default glyph; pass `null` to render none.
   */
  icon?: React.ComponentType<{ className?: string }> | null;
  /**
   * Why the surface is empty: `default`, `first-use`, `no-results`, `no-permission` or `error`.
   * Sets the icon tone and default glyph; the copy and actions are always yours.
   */
  variant?: EmptyStateVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Action slot (e.g. a primary Button) rendered below the description. */
  action?: React.ReactNode;
}

/**
 * EmptyState is the icon + title + description + action zero-state used for
 * empty lists, no-results, no-permission, failed-load and first-run surfaces. It pairs with
 * DataState: pass it as `empty={<EmptyState … />}`, or drop it straight into a Card.
 * `size="sm"` fits a table body or a side panel.
 */
function EmptyState({
  className,
  icon,
  variant = "default",
  size,
  title,
  description,
  action,
  children,
  ...props
}: EmptyStateProps) {
  const Icon = icon === null ? undefined : (icon ?? DEFAULT_ICON[variant]);
  const resolvedSize = size ?? "default";
  return (
    <div
      data-slot="empty-state"
      data-variant={variant}
      data-size={resolvedSize}
      className={cn(emptyStateVariants({ size }), className)}
      {...props}
    >
      {Icon && (
        <div
          data-slot="empty-state-icon"
          aria-hidden="true"
          className={emptyStateIconVariants({ variant, size: resolvedSize })}
        >
          <Icon />
        </div>
      )}
      {title && (
        <p
          data-slot="empty-state-title"
          className={cn(
            "font-heading font-semibold tracking-tight text-foreground",
            resolvedSize === "sm" ? "text-sm" : resolvedSize === "lg" ? "text-lg" : "text-base",
          )}
        >
          {title}
        </p>
      )}
      {description && (
        <p
          data-slot="empty-state-description"
          className="max-w-sm text-sm text-pretty text-muted-foreground"
        >
          {description}
        </p>
      )}
      {action && (
        <div
          data-slot="empty-state-action"
          className={cn(
            "flex flex-wrap items-center justify-center gap-2",
            resolvedSize === "sm" ? "mt-2" : "mt-3",
          )}
        >
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export type { EmptyStateProps };
export { EmptyState, emptyStateIconVariants, emptyStateVariants };
