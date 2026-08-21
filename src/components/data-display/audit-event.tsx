"use client";

import * as React from "react";
import { Feed, type FeedProps } from "@/components/data-display/feed";
import { type StatusKind, StatusPill } from "@/components/data-display/status-pill";
import { cn } from "@/lib/utils";

type AuditSeverity = "info" | "success" | "warning" | "danger";

interface AuditEventProps extends Omit<React.ComponentProps<"div">, "title"> {
  eventId: string;
  actor: string;
  action: string;
  resource?: string;
  timestamp: string | Date;
  severity?: AuditSeverity;
  description?: React.ReactNode;
  metadata?: React.ReactNode;
  diff?: React.ReactNode;
  raw?: React.ReactNode;
  actions?: React.ReactNode;
  detailsLabel?: string;
  locale?: string;
}

const SEVERITY_KIND: Record<AuditSeverity, StatusKind> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
};

function AuditLog({ className, ...props }: FeedProps) {
  return <Feed data-slot="audit-log" className={cn("gap-2", className)} {...props} />;
}

/**
 * Typed, product-neutral audit-event anatomy. The caller owns event schemas,
 * retention, filtering, redaction, transport, and authorization; metadata,
 * diff, raw payload, and actions are composable display slots.
 */
function AuditEvent({
  eventId,
  actor,
  action,
  resource,
  timestamp,
  severity = "info",
  description,
  metadata,
  diff,
  raw,
  actions,
  detailsLabel = "Event details",
  locale,
  className,
  ...props
}: AuditEventProps) {
  const titleId = React.useId();
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const validDate = !Number.isNaN(date.getTime());
  const dateTime = timestamp instanceof Date ? timestamp.toISOString() : timestamp;
  const formattedTime = validDate
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date)
    : String(timestamp);
  const title = [actor, action, resource].filter(Boolean).join(" ");
  const hasDetails = Boolean(metadata || diff || raw);

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" names an audit entry; <fieldset> would add form semantics.
    <div
      role="group"
      aria-labelledby={titleId}
      data-slot="audit-event"
      className={cn("space-y-3", className)}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={titleId} className="text-sm font-semibold text-foreground">
            {title}
          </h3>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        <StatusPill status={severity} kind={SEVERITY_KIND[severity]} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <time dateTime={dateTime}>{formattedTime}</time>
        <code className="font-mono">{eventId}</code>
      </div>
      {hasDetails && (
        <details className="rounded-md border border-border bg-muted/20 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            {detailsLabel}
          </summary>
          <div className="mt-3 space-y-3">
            {metadata && (
              <section data-slot="audit-event-metadata" aria-label="Metadata">
                {metadata}
              </section>
            )}
            {diff && (
              <section data-slot="audit-event-diff" aria-label="Changes">
                {diff}
              </section>
            )}
            {raw && (
              <section data-slot="audit-event-raw" aria-label="Raw event">
                {raw}
              </section>
            )}
          </div>
        </details>
      )}
      {actions && <div data-slot="audit-event-actions">{actions}</div>}
    </div>
  );
}

export type { AuditEventProps, AuditSeverity };
export { AuditEvent, AuditLog };
