"use client";

import * as React from "react";
import { StatusPill } from "@/components/data-display/status-pill";
import { Checkbox } from "@/components/selection/checkbox";
import { cn } from "@/lib/utils";

type AccessReviewState = "granted" | "denied" | "mixed" | "pending";
type AccessReviewDecision = "granted" | "denied";

interface AccessReviewItem {
  id: string;
  label: string;
  description?: React.ReactNode;
  state: AccessReviewState;
  scope?: React.ReactNode;
  inherited?: boolean;
  locked?: boolean;
}

interface AccessReviewProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  items: AccessReviewItem[];
  onStateChange?: (id: string, state: AccessReviewDecision) => void;
  renderActions?: (item: AccessReviewItem) => React.ReactNode;
  emptyMessage?: React.ReactNode;
  "aria-label"?: string;
}

const STATE_PRESENTATION = {
  granted: { label: "Granted", kind: "success" },
  denied: { label: "Denied", kind: "danger" },
  mixed: { label: "Mixed", kind: "info" },
  pending: { label: "Pending", kind: "warning" },
} as const;

/**
 * Product-neutral permission assignment/review surface. The caller owns role
 * definitions, inheritance resolution, authorization policy, and persistence;
 * Qeetrix exposes the resulting state and emits direct grant/deny intent only.
 */
function AccessReview({
  items,
  onStateChange,
  renderActions,
  emptyMessage = "No access assignments.",
  "aria-label": ariaLabel = "Access review",
  className,
  ...props
}: AccessReviewProps) {
  const baseId = React.useId().replace(/:/g, "");

  return (
    <div
      data-slot="access-review"
      className={cn("w-full overflow-x-auto rounded-lg border border-border", className)}
      {...props}
    >
      {items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <table className="w-full border-collapse text-sm" aria-label={ariaLabel}>
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th scope="col" className="px-3 py-2 text-start font-medium">
                Access
              </th>
              <th scope="col" className="px-3 py-2 text-start font-medium">
                Scope
              </th>
              <th scope="col" className="px-3 py-2 text-start font-medium">
                State
              </th>
              {renderActions && (
                <th scope="col" className="px-3 py-2 text-end font-medium">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const descriptionId = `${baseId}-${item.id.replace(/[^a-zA-Z0-9_-]/g, "-")}-details`;
              const presentation = STATE_PRESENTATION[item.state];
              const disabled = item.locked || item.state === "pending" || !onStateChange;

              return (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <th scope="row" className="px-3 py-3 text-start font-normal">
                    <div className="flex items-start gap-2.5">
                      <Checkbox
                        aria-label={item.label}
                        aria-describedby={descriptionId}
                        checked={item.state === "granted"}
                        indeterminate={item.state === "mixed"}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          onStateChange?.(item.id, checked === true ? "granted" : "denied")
                        }
                      />
                      <div>
                        <div className="font-medium text-foreground">{item.label}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        )}
                      </div>
                    </div>
                  </th>
                  <td className="px-3 py-3 text-muted-foreground">{item.scope ?? "All scopes"}</td>
                  <td id={descriptionId} className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusPill kind={presentation.kind}>{presentation.label}</StatusPill>
                      {item.inherited && <StatusPill kind="neutral">Inherited</StatusPill>}
                      {item.locked && <StatusPill kind="muted">Locked</StatusPill>}
                    </div>
                  </td>
                  {renderActions && <td className="px-3 py-3 text-end">{renderActions(item)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export type { AccessReviewDecision, AccessReviewItem, AccessReviewProps, AccessReviewState };
export { AccessReview };
