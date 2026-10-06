import type * as React from "react";

import { EmptyState } from "@/components/EmptyState/empty-state";
import { Skeleton } from "@/components/Spinner/skeleton";
import { dataStateMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";

interface DataStateProps {
  /** Loading: render `loading` slot instead of children. */
  isLoading?: boolean;
  /** Error: render `errorFallback` instead of children. */
  isError?: boolean;
  /** The raw error object — its `.message` is used in the default error slot. */
  error?: unknown;
  /** Empty: render `empty` slot instead of children. */
  isEmpty?: boolean;

  /** Override the loading slot. Defaults to N skeleton rows. */
  loading?: React.ReactNode;
  /** Override the error slot. Defaults to an `EmptyState variant="error"` carrying the message. */
  errorFallback?: React.ReactNode;
  /** Override the empty slot. Defaults to an `EmptyState` built from the `empty*` props. */
  empty?: React.ReactNode;

  /** Convenience: icon for the default empty slot. */
  emptyIcon?: React.ComponentType<{ className?: string }>;
  /** Convenience: heading for the default empty slot. */
  emptyTitle?: string;
  /** Convenience: description for the default empty slot. */
  emptyDescription?: string;

  /** Convenience: skeleton row count for the default loading slot. */
  skeletonRows?: number;
  /** Convenience: skeleton row height utility. */
  skeletonHeight?: string;

  className?: string;
  children: React.ReactNode;
}

function defaultErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return dataStateMessages.error;
}

/**
 * DataState collapses the four common render branches of a query-backed
 * surface — loading / error / empty / data — into one component.
 *
 * Pass the three boolean states from a TanStack Query (or any source)
 * and either let the defaults handle the chrome (skeleton rows, an
 * error EmptyState, a neutral EmptyState) or pass slot overrides
 * for a custom look. Children only render once all three booleans are
 * falsy — i.e. the data is ready.
 *
 * The loading branch is marked `aria-busy`; the error branch is a `role="alert"` region, so a
 * failed load is announced when it replaces the content.
 *
 * Why a single component instead of helpers: it's *much* harder to
 * accidentally forget the error or empty case when the parent has to
 * supply each branch up-front.
 */
function DataState({
  isLoading,
  isError,
  error,
  isEmpty,
  loading,
  errorFallback,
  empty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  skeletonRows = 6,
  skeletonHeight = "h-10",
  className,
  children,
}: DataStateProps) {
  if (isLoading) {
    return (
      <div
        data-slot="data-state"
        data-state="loading"
        aria-busy="true"
        className={cn("space-y-3 p-4", className)}
      >
        {loading ??
          Array.from({ length: skeletonRows }, (_, i) => `skeleton-${i}`).map((skeletonKey) => (
            <Skeleton key={skeletonKey} className={cn(skeletonHeight, "w-full")} />
          ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-slot="data-state"
        data-state="error"
        role="alert"
        // A custom fallback still inherits the destructive text colour it always had.
        className={cn("text-sm text-destructive-text", className)}
      >
        {errorFallback ?? (
          <EmptyState variant="error" size="sm" description={defaultErrorMessage(error)} />
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div data-slot="data-state" data-state="empty" className={className}>
        {empty ?? (
          <EmptyState icon={emptyIcon ?? null} title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    );
  }

  return <>{children}</>;
}

export type { DataStateProps };
export { DataState };
