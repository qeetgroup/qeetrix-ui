"use client";

import * as React from "react";
import { Feed, type FeedProps } from "@/components/data-display/feed";
import { type StatusKind, StatusPill } from "@/components/data-display/status-pill";
import type { MessagesFor } from "@/lib/messages";
import { auditEventMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

type AuditSeverity = "info" | "success" | "warning" | "danger";

interface AuditEventProps extends Omit<React.ComponentProps<"div">, "title"> {
  eventId: string;
  actor: string;
  action: string;
  resource?: string;
  /**
   * Event time. A `Date` or anything `new Date(...)` accepts. An unparseable
   * value is rendered verbatim in a `<span>` rather than a `<time>`, and no
   * `datetime` attribute is emitted — see the component doc.
   */
  timestamp: string | Date;
  severity?: AuditSeverity;
  description?: React.ReactNode;
  metadata?: React.ReactNode;
  diff?: React.ReactNode;
  raw?: React.ReactNode;
  actions?: React.ReactNode;
  /**
   * Summary text of the details disclosure. Equivalent to `messages={{ details }}` and wins
   * over it.
   */
  detailsLabel?: string;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"auditEvent">;
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
 *
 * **Invalid timestamps.** Audit rows arrive from logs, exports and other
 * systems, so `timestamp` is untrusted: `new Date("n/a")` and a `Date` built
 * from `NaN` both reach this component in practice. Neither is allowed to
 * throw. A parseable timestamp renders as `<time dateTime>` — `Date` inputs
 * normalised to ISO 8601, string inputs passed through so a date-only value
 * stays date-only. An unparseable one renders as
 * `<span data-slot="audit-event-invalid-timestamp">` holding the value as
 * given (`"Invalid Date"` for a `Date`, per `Date.prototype.toString`), with
 * no `datetime` attribute: HTML requires a `<time>` element's content or
 * attribute to be a valid date string, and neither would be.
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
  detailsLabel,
  messages: messageOverrides,
  locale,
  className,
  ...props
}: AuditEventProps) {
  const messages = useMessages("auditEvent", auditEventMessages, messageOverrides);
  const titleId = React.useId();
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  // Validity is established before anything formats `date`. `toISOString()` throws
  // a RangeError on an invalid Date and `Intl.DateTimeFormat.format` throws too, so
  // either one reached first would take down the whole surrounding subtree.
  const validDate = !Number.isNaN(date.getTime());
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
        {validDate ? (
          <time
            data-slot="audit-event-timestamp"
            dateTime={timestamp instanceof Date ? date.toISOString() : timestamp}
          >
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(date)}
          </time>
        ) : (
          <span data-slot="audit-event-invalid-timestamp">{String(timestamp)}</span>
        )}
        <code className="font-mono">{eventId}</code>
      </div>
      {hasDetails && (
        <details className="rounded-md border border-border bg-muted/20 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            {detailsLabel ?? messages.details}
          </summary>
          <div className="mt-3 space-y-3">
            {metadata && (
              <section data-slot="audit-event-metadata" aria-label={messages.metadata}>
                {metadata}
              </section>
            )}
            {diff && (
              <section data-slot="audit-event-diff" aria-label={messages.changes}>
                {diff}
              </section>
            )}
            {raw && (
              <section data-slot="audit-event-raw" aria-label={messages.raw}>
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
