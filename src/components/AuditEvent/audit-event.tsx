"use client";

import { ChevronRightIcon } from "@qeetrix/icons/icons/chevron-right";
import { CircleCheckIcon } from "@qeetrix/icons/icons/circle-check";
import { OctagonAlertIcon } from "@qeetrix/icons/icons/octagon-alert";
import { TriangleAlertIcon } from "@qeetrix/icons/icons/triangle-alert";
import * as React from "react";
import { type StatusKind, StatusPill } from "@/components/Badge/status-pill";
import { Feed, type FeedProps, useFeedItemLabel } from "@/components/Feed/feed";
import { useControllableState } from "@/hooks/use-controllable-state";
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
  /**
   * Replaces the severity's label — "Denied", "Blocked", "Delivered" — while keeping its
   * colour and glyph. A custom label is always shown, whatever the severity.
   */
  statusLabel?: React.ReactNode;
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
  /** Controlled open state of the details disclosure. */
  expanded?: boolean;
  /** Initial open state when uncontrolled. @default false */
  defaultExpanded?: boolean;
  /** Called with the next open state when the details disclosure toggles. */
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"auditEvent">;
  locale?: string;
  /**
   * IANA time zone the timestamp is displayed in. Omitted, the runtime's zone is used — pass
   * it when the log is server-rendered, so the server and the browser print the same time.
   */
  timeZone?: string;
}

const SEVERITY_GLYPH: Record<AuditSeverity, React.ReactNode> = {
  // Routine events get a quiet dot: in a long log the glyph column should only catch the eye
  // where something needs attention.
  info: <span className="size-1.5 rounded-full bg-border-strong" />,
  success: <CircleCheckIcon className="size-4 text-success-text" />,
  warning: <TriangleAlertIcon className="size-4 text-warning-text" />,
  danger: <OctagonAlertIcon className="size-4 text-destructive-text" />,
};

/** The StatusPill kind each severity's tag uses. */
const SEVERITY_KIND: Record<AuditSeverity, StatusKind> = {
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
};

interface AuditLogProps extends FeedProps {
  /**
   * Skip layout and paint for rows outside the viewport (`content-visibility: auto`). Rows stay
   * focusable, findable with find-in-page and in the accessibility tree, and the browser renders
   * them as they approach the viewport — a large saving on logs of thousands of rows.
   *
   * Off by default: tools that capture the page without scrolling it (full-page screenshots,
   * visual-regression snapshots) see deferred rows as blank. Beyond a few thousand rows, window
   * the list instead.
   */
  deferOffscreen?: boolean;
}

/**
 * A feed of `AuditEvent`s. Defaults to the `list` presentation — rows in one surface — because
 * audit trails are long and read by scanning; pass `variant="card"` for the boxed look.
 */
function AuditLog({
  className,
  itemClassName,
  variant = "list",
  deferOffscreen = false,
  ...props
}: AuditLogProps) {
  return (
    <Feed
      data-slot="audit-log"
      variant={variant}
      className={cn(variant === "card" && "gap-2", className)}
      itemClassName={cn(
        deferOffscreen && "[contain-intrinsic-size:auto_4.5rem] [content-visibility:auto]",
        itemClassName,
      )}
      {...props}
    />
  );
}

interface AuditEventMetadataItem {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Set for technical identifiers — IDs, IPs, hashes, user agents — so they render monospaced. */
  mono?: boolean;
}

interface AuditEventMetadataProps extends React.ComponentProps<"dl"> {
  items: AuditEventMetadataItem[];
}

/**
 * The house layout for an audit event's `metadata` slot: a two-column description list where
 * technical identifiers are monospaced and long values wrap instead of overflowing.
 */
function AuditEventMetadata({ items, className, ...props }: AuditEventMetadataProps) {
  return (
    <dl
      data-slot="audit-event-metadata-list"
      className={cn(
        "grid grid-cols-[minmax(5rem,max-content)_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs",
        className,
      )}
      {...props}
    >
      {items.map((item, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: rows have no identity beyond their position.
        <React.Fragment key={index}>
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "min-w-0 text-foreground wrap-anywhere",
              item.mono && "font-mono select-all",
            )}
          >
            {item.value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/**
 * Typed, product-neutral audit-event anatomy. The caller owns event schemas,
 * retention, filtering, redaction, transport, and authorization; metadata,
 * diff, raw payload, and actions are composable display slots.
 *
 * **Reading order.** A severity glyph, then the event as a sentence — actor and target
 * emphasised, the verb quieter — with the time at the line's end, then the description, then
 * a meta line holding the status and the monospaced event ID, then the details disclosure.
 * Warning and danger events carry a visible status tag; routine info and success events keep
 * their label for screen readers only, so exceptions stand out in a long log.
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
  statusLabel,
  description,
  metadata,
  diff,
  raw,
  actions,
  detailsLabel,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  messages: messageOverrides,
  locale,
  timeZone,
  className,
  ...props
}: AuditEventProps) {
  const messages = useMessages("auditEvent", auditEventMessages, messageOverrides);
  const titleId = React.useId();
  const descriptionId = React.useId();
  // Inside an AuditLog (or any Feed) the article is named by this event's sentence, as the APG
  // feed pattern requires; standalone this is a no-op and the group carries the name.
  useFeedItemLabel({ labelledBy: titleId, describedBy: description ? descriptionId : undefined });
  const [expanded, setExpanded] = useControllableState({
    value: expandedProp,
    defaultValue: defaultExpanded,
    onChange: onExpandedChange,
  });
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  // Validity is established before anything formats `date`. `toISOString()` throws
  // a RangeError on an invalid Date and `Intl.DateTimeFormat.format` throws too, so
  // either one reached first would take down the whole surrounding subtree.
  const validDate = !Number.isNaN(date.getTime());
  const hasDetails = Boolean(metadata || diff || raw);
  const label = statusLabel ?? messages.severity(severity);
  const showTag = statusLabel != null || severity === "warning" || severity === "danger";

  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" names an audit entry; <fieldset> would add form semantics.
    <div
      role="group"
      aria-labelledby={titleId}
      data-slot="audit-event"
      data-severity={severity}
      className={cn("flex items-start gap-3", className)}
      {...props}
    >
      <span
        aria-hidden
        data-slot="audit-event-glyph"
        className="flex h-5 w-4 shrink-0 items-center justify-center"
      >
        {SEVERITY_GLYPH[severity]}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <h3
            id={titleId}
            className="min-w-0 font-sans text-sm font-normal tracking-normal text-muted-foreground wrap-anywhere"
          >
            <span data-slot="audit-event-actor" className="font-medium text-foreground">
              {actor}
            </span>{" "}
            <span data-slot="audit-event-action">{action}</span>
            {resource && (
              <>
                {" "}
                <span data-slot="audit-event-resource" className="font-medium text-foreground">
                  {resource}
                </span>
              </>
            )}
          </h3>
          {validDate ? (
            <time
              data-slot="audit-event-timestamp"
              dateTime={timestamp instanceof Date ? date.toISOString() : timestamp}
              className="shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums"
            >
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                ...(timeZone ? { timeZone } : {}),
              }).format(date)}
            </time>
          ) : (
            <span
              data-slot="audit-event-invalid-timestamp"
              className="shrink-0 text-xs text-muted-foreground wrap-anywhere"
            >
              {String(timestamp)}
            </span>
          )}
        </div>
        {description && (
          <div id={descriptionId} className="text-sm text-muted-foreground wrap-anywhere">
            {description}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {showTag ? (
            // The leading glyph already carries the colour and shape, so the pill has no dot.
            <StatusPill kind={SEVERITY_KIND[severity]} dot={false}>
              {label}
            </StatusPill>
          ) : (
            <span data-slot="audit-event-status" className="sr-only">
              {label}
            </span>
          )}
          <span className="min-w-0">
            {/* `code` may not carry an accessible name, so the field name is hidden text. */}
            <span className="sr-only">{messages.eventId} </span>
            <code
              data-slot="audit-event-id"
              className="font-mono text-muted-foreground select-all wrap-anywhere"
            >
              {eventId}
            </code>
          </span>
        </div>
        {hasDetails && (
          <details
            data-slot="audit-event-details"
            open={expanded}
            onToggle={(event) => {
              // Find-in-page can open a closed disclosure on its own; keep state in step.
              if (event.currentTarget.open !== expanded) setExpanded(event.currentTarget.open);
            }}
            className="group/details pt-0.5"
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: <summary> is the disclosure's native, focusable toggle. */}
            <summary
              onClick={(event) => {
                // State drives `open`, so a controlled parent stays authoritative.
                event.preventDefault();
                setExpanded(!expanded);
              }}
              className="inline-flex cursor-pointer list-none items-center gap-1 rounded-(--qx-corner-xs) text-xs font-medium text-muted-foreground transition-colors duration-fast ease-standard outline-none select-none hover:text-foreground focus-visible:focus-ring motion-reduce:transition-none [&::-webkit-details-marker]:hidden"
            >
              <ChevronRightIcon
                aria-hidden
                className="size-3.5 transition-transform duration-fast ease-standard group-open/details:rotate-90 motion-reduce:transition-none rtl:-scale-x-100 rtl:group-open/details:-rotate-90"
              />
              {detailsLabel ?? messages.details}
            </summary>
            <div
              data-slot="audit-event-details-panel"
              className="mt-2 space-y-3 rounded-(--qx-corner-control) border border-border-subtle bg-surface-sunken p-3"
            >
              {metadata && (
                <DetailsSection slot="audit-event-metadata" heading={messages.metadata}>
                  {metadata}
                </DetailsSection>
              )}
              {diff && (
                <DetailsSection slot="audit-event-diff" heading={messages.changes}>
                  {diff}
                </DetailsSection>
              )}
              {raw && (
                <DetailsSection slot="audit-event-raw" heading={messages.raw}>
                  {raw}
                </DetailsSection>
              )}
            </div>
          </details>
        )}
        {actions && (
          <div data-slot="audit-event-actions" className="flex flex-wrap items-center gap-2 pt-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A labelled group inside the details panel. A `group`, not a named `<section>`: a named
 * section is a `region` landmark, and an open audit log would otherwise add three landmarks
 * per row to the page's landmark list.
 */
function DetailsSection({
  slot,
  heading,
  children,
}: {
  slot: string;
  heading: string;
  children: React.ReactNode;
}) {
  const headingId = React.useId();
  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled group of read-only content; <fieldset> would add form semantics.
    <div role="group" aria-labelledby={headingId} data-slot={slot} className="space-y-1.5">
      <div id={headingId} className="text-xs font-medium text-muted-foreground">
        {heading}
      </div>
      <div className="min-w-0 text-sm text-foreground wrap-anywhere">{children}</div>
    </div>
  );
}

export type {
  AuditEventMetadataItem,
  AuditEventMetadataProps,
  AuditEventProps,
  AuditLogProps,
  AuditSeverity,
};
export { AuditEvent, AuditEventMetadata, AuditLog };
