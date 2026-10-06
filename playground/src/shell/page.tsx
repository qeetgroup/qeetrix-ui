import { cn, PageHeader } from "@qeetrix/ui";
import type { ReactNode } from "react";

/** Standard page frame: the library's PageHeader over a padded, width-capped column. */
export function Page({
  title,
  description,
  eyebrow,
  actions,
  children,
  wide = false,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Use the full content width (matrices, side-by-side frames). */
  wide?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-8 px-4 py-6 md:px-8 md:py-8",
        wide ? "max-w-none" : "max-w-7xl",
        className,
      )}
    >
      <PageHeader title={title} description={description} breadcrumb={eyebrow} actions={actions} />
      {children}
    </div>
  );
}

/** A titled page section with an anchor id. */
export function Section({
  id,
  title,
  description,
  actions,
  children,
  className,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn("scroll-mt-20", className)}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id={id ? `${id}-title` : undefined}
            className="font-heading text-heading font-semibold"
          >
            {title}
          </h2>
          {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
