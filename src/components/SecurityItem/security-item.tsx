import * as React from "react";
import { resolveStatusKind, type StatusKind, StatusPill } from "@/components/Badge/status-pill";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from "@/components/DescriptionList/description-list";
import { cn } from "@/lib/utils";

interface SecurityItemDetail {
  label: string;
  value: React.ReactNode;
}

interface SecurityItemProps extends Omit<React.ComponentProps<"article">, "title"> {
  title: string;
  description?: React.ReactNode;
  status?: string;
  statusKind?: StatusKind;
  icon?: React.ReactNode;
  details?: SecurityItemDetail[];
  actions?: React.ReactNode;
  /**
   * Inline marks beside the title — `<Badge variant="brand">This device</Badge>`,
   * `<Badge variant="secondary">Primary</Badge>`. The status belongs in `status`, not here.
   */
  badge?: React.ReactNode;
  /** Heading level of the title, to fit the page outline. Defaults to 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

/**
 * Severity sets the hierarchy. A healthy credential stays graphite; a warning or a danger state
 * tints the icon tile and draws an inline-start rule, so a compromised key or an expired
 * certificate is found by scanning a long list, not by reading every pill. The pill still names
 * the state, so colour is never the only channel.
 */
const ATTENTION: Partial<Record<StatusKind, { tile: string; rule: string }>> = {
  warning: { tile: "bg-warning-subtle text-warning-text", rule: "before:bg-warning" },
  danger: { tile: "bg-destructive-subtle text-destructive-text", rule: "before:bg-destructive" },
};

/**
 * Product-neutral security-resource row for sessions, devices, credentials,
 * passkeys, integrations, and API keys. The caller owns protocol state,
 * validation, revocation, authorization, confirmation, and persistence.
 *
 * The article is named by the title and described by the status and then the description, so
 * a screen-reader user moving by article hears "Deploy key, Expired, Expired 3 days ago" before
 * reaching the actions. Put destructive actions (revoke, sign out) in `actions` and confirm them
 * with an AlertDialog; announce the outcome (a Toast) — the row itself is not a live region.
 */
function SecurityItem({
  title,
  description,
  status,
  statusKind,
  icon,
  details,
  actions,
  badge,
  headingLevel = 3,
  className,
  ...props
}: SecurityItemProps) {
  const id = React.useId();
  const statusId = `${id}-status`;
  const descriptionId = `${id}-description`;
  const kind = status || statusKind ? resolveStatusKind(status, statusKind) : undefined;
  const attention = kind ? ATTENTION[kind] : undefined;
  const Heading = `h${headingLevel}` as const;
  const describedBy =
    [status ? statusId : null, description ? descriptionId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <article
      aria-label={title}
      aria-describedby={describedBy}
      data-slot="security-item"
      data-kind={kind}
      className={cn(
        "relative grid gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-rest",
        icon ? "sm:grid-cols-[auto_minmax(0,1fr)_auto]" : "sm:grid-cols-[minmax(0,1fr)_auto]",
        attention &&
          cn(
            "before:absolute before:inset-y-4 before:inset-s-0 before:w-0.5 before:rounded-full forced-colors:before:bg-[CanvasText]",
            attention.rule,
          ),
        className,
      )}
      {...props}
    >
      {icon && (
        <div
          data-slot="security-item-icon"
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg [&>svg:not([class*='size-'])]:size-4",
            attention?.tile ?? "bg-surface-sunken text-muted-foreground",
          )}
        >
          {icon}
        </div>
      )}
      <div data-slot="security-item-content" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Heading
                data-slot="security-item-title"
                className="font-heading text-sm font-semibold wrap-break-word text-foreground"
              >
                {title}
              </Heading>
              {badge}
            </div>
            {description && (
              <p
                id={descriptionId}
                data-slot="security-item-description"
                className="mt-0.5 text-sm text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
          {status && <StatusPill id={statusId} status={status} kind={statusKind} />}
        </div>
        {details && details.length > 0 && (
          <DescriptionList
            data-slot="security-item-details"
            className="gap-y-1 text-xs sm:grid-cols-[minmax(6rem,9rem)_minmax(0,1fr)] [&_dd]:min-w-0 [&_dd]:wrap-break-word"
          >
            {details.map((detail) => (
              <React.Fragment key={detail.label}>
                <DescriptionTerm>{detail.label}</DescriptionTerm>
                <DescriptionDetails>{detail.value}</DescriptionDetails>
              </React.Fragment>
            ))}
          </DescriptionList>
        )}
      </div>
      {actions && (
        <div
          data-slot="security-item-actions"
          className="flex flex-wrap items-start gap-2 sm:justify-self-end"
        >
          {actions}
        </div>
      )}
    </article>
  );
}

export type { SecurityItemDetail, SecurityItemProps };
export { SecurityItem };
