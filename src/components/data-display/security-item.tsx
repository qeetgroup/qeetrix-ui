import * as React from "react";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from "@/components/data-display/description-list";
import { type StatusKind, StatusPill } from "@/components/data-display/status-pill";
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
}

/**
 * Product-neutral security-resource row for sessions, devices, credentials,
 * passkeys, integrations, and API keys. The caller owns protocol state,
 * validation, revocation, authorization, confirmation, and persistence.
 */
function SecurityItem({
  title,
  description,
  status,
  statusKind,
  icon,
  details,
  actions,
  className,
  ...props
}: SecurityItemProps) {
  return (
    <article
      aria-label={title}
      data-slot="security-item"
      className={cn(
        "grid gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-rest sm:grid-cols-[auto_minmax(0,1fr)_auto]",
        className,
      )}
      {...props}
    >
      {icon && (
        <div
          data-slot="security-item-icon"
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground"
        >
          {icon}
        </div>
      )}
      <div className={cn("min-w-0 space-y-3", !icon && "sm:col-start-1")}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {status && <StatusPill status={status} kind={statusKind} />}
        </div>
        {details && details.length > 0 && (
          <DescriptionList className="gap-y-1 text-xs sm:grid-cols-[minmax(6rem,9rem)_1fr]">
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
          className="flex items-start gap-2 sm:justify-self-end"
        >
          {actions}
        </div>
      )}
    </article>
  );
}

export type { SecurityItemDetail, SecurityItemProps };
export { SecurityItem };
