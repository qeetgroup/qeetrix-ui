"use client";

import { ServerCrashIcon, WrenchIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

interface PageStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Large status code or short marker, e.g. `404`. */
  code?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Action buttons (e.g. "Go home", "Retry"). */
  actions?: React.ReactNode;
}

/**
 * Full-page status layout for empty/error/404/maintenance screens: a centered
 * column with an optional code + icon, a title, supporting text, and actions.
 * Presets {@link NotFound}, {@link ServerError}, and {@link Maintenance} wrap
 * this with sensible defaults.
 */
function PageState({
  code,
  icon: Icon,
  title,
  description,
  actions,
  className,
  ...props
}: PageStateProps) {
  return (
    <div
      data-slot="page-state"
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center",
        className,
      )}
      {...props}
    >
      {code != null && (
        <span className="font-heading text-5xl font-bold tracking-tight text-muted-foreground/40">
          {code}
        </span>
      )}
      {Icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </span>
      )}
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

type PresetProps = Omit<PageStateProps, "title"> & { title?: React.ReactNode };

function NotFound({ ...props }: PresetProps) {
  return (
    <PageState
      code="404"
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
      {...props}
    />
  );
}

function ServerError({ ...props }: PresetProps) {
  return (
    <PageState
      code="500"
      icon={ServerCrashIcon}
      title="Something went wrong"
      description="An unexpected error occurred on our end. Please try again."
      {...props}
    />
  );
}

function Maintenance({ ...props }: PresetProps) {
  return (
    <PageState
      icon={WrenchIcon}
      title="Down for maintenance"
      description="We're making some improvements and will be back shortly."
      {...props}
    />
  );
}

export type { PageStateProps };
export { Maintenance, NotFound, PageState, ServerError };
