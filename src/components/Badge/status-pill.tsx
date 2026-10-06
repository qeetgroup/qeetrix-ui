import type * as React from "react";

import { Badge, type BadgeProps } from "@/components/Badge/badge";
import { cn } from "@/lib/utils";

/**
 * The visual kind drives both the leading dot colour and the Badge
 * variant. These map 1:1 onto the existing Badge variants so a pill
 * never looks out-of-place next to a hand-rolled Badge.
 */
export type StatusKind = "success" | "warning" | "danger" | "info" | "muted" | "neutral";

const KIND_TO_BADGE: Record<StatusKind, BadgeProps["variant"]> = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  // Was `default` — the solid Qeet fill — which rendered an informational status as the loudest
  // badge in the library, an orange pill carrying a blue dot.
  info: "info",
  muted: "muted",
  neutral: "outline",
};

/**
 * The dot is decorative (the label is the status), but it is the glance cue in a dense table,
 * so it uses the solid status hue — 4.8:1 or better against every subtle surface it sits on.
 */
const KIND_TO_DOT: Record<StatusKind, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground",
  neutral: "bg-muted-foreground",
};

/**
 * Well-known status strings the API surfaces. New strings can be added
 * here without touching call sites. Keys are lowercased before lookup,
 * so the API can send "Active" / "active" / "ACTIVE" interchangeably.
 */
const KNOWN_STATUSES: Record<string, { kind: StatusKind; label: string }> = {
  active: { kind: "success", label: "Active" },
  enabled: { kind: "success", label: "Enabled" },
  verified: { kind: "success", label: "Verified" },
  trusted: { kind: "success", label: "Trusted" },
  ok: { kind: "success", label: "OK" },
  up: { kind: "success", label: "Up" },
  delivered: { kind: "success", label: "Delivered" },
  succeeded: { kind: "success", label: "Succeeded" },
  live: { kind: "success", label: "Live" },

  processing: { kind: "info", label: "Processing" },
  running: { kind: "info", label: "Running" },
  syncing: { kind: "info", label: "Syncing" },
  queued: { kind: "info", label: "Queued" },
  scheduled: { kind: "info", label: "Scheduled" },
  invited: { kind: "info", label: "Invited" },

  pending: { kind: "warning", label: "Pending" },
  expiring: { kind: "warning", label: "Expiring" },
  degraded: { kind: "warning", label: "Degraded" },
  warn: { kind: "warning", label: "Warning" },
  unverified: { kind: "warning", label: "Unverified" },
  untrusted: { kind: "warning", label: "Untrusted" },

  expired: { kind: "danger", label: "Expired" },
  revoked: { kind: "danger", label: "Revoked" },
  disabled: { kind: "danger", label: "Disabled" },
  suspended: { kind: "danger", label: "Suspended" },
  locked: { kind: "danger", label: "Locked" },
  blocked: { kind: "danger", label: "Blocked" },
  compromised: { kind: "danger", label: "Compromised" },
  deleted: { kind: "danger", label: "Deleted" },
  failed: { kind: "danger", label: "Failed" },
  down: { kind: "danger", label: "Down" },

  draft: { kind: "muted", label: "Draft" },
  archived: { kind: "muted", label: "Archived" },
  inactive: { kind: "muted", label: "Inactive" },
};

interface StatusPillProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Well-known status string (matched case-insensitively). */
  status?: string;
  /** Explicit kind override; takes precedence over `status`. */
  kind?: StatusKind;
  /** Show the leading dot. Defaults to true. */
  dot?: boolean;
  /** Custom label. Defaults to the known label, or a Title-cased status. */
  children?: React.ReactNode;
  className?: string;
}

/** "in_progress" / "past-due" → "In progress" / "Past due". */
function titleCase(s: string): string {
  const words = s.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Resolves a status string (and optional explicit kind) to the kind and label StatusPill shows. */
function resolveStatus(status?: string, kind?: StatusKind) {
  const known = status ? KNOWN_STATUSES[status.toLowerCase()] : undefined;
  return {
    kind: kind ?? known?.kind ?? ("neutral" as StatusKind),
    label: known?.label ?? (status ? titleCase(status) : ""),
  };
}

/**
 * The kind a StatusPill would render for `status` — the explicit `kind` when given, the known
 * mapping otherwise, `"neutral"` for an unknown string. For surfaces that need to agree with the
 * pill (a row tint, an icon tone) without re-implementing the table.
 */
function resolveStatusKind(status?: string, kind?: StatusKind): StatusKind {
  return resolveStatus(status, kind).kind;
}

/**
 * StatusPill is a thin wrapper over Badge that centralises the
 * status-to-colour mapping (active = green, expired = red, etc.).
 *
 * Pass `status="active"` (or any known key) for automatic colour +
 * label, or pass an explicit `kind` and `children` for one-off shapes
 * the API doesn't speak. Unknown strings fall back to neutral styling
 * with the status title-cased as the label. Colour is never the only
 * channel: the label always names the state.
 */
function StatusPill({ status, kind, dot = true, children, className, ...props }: StatusPillProps) {
  const resolved = resolveStatus(status, kind);
  const label = children ?? resolved.label;

  return (
    <Badge
      // Without this the pill inherits Badge's slot, so a consumer cannot target a StatusPill
      // distinctly from any other badge. Badge spreads props after its own data-slot, so this wins.
      data-slot="status-pill"
      data-kind={resolved.kind}
      variant={KIND_TO_BADGE[resolved.kind]}
      className={cn("gap-1.5", className)}
      {...props}
    >
      {dot && (
        <span
          data-slot="status-pill-dot"
          aria-hidden="true"
          className={cn("size-1.5 shrink-0 rounded-full", KIND_TO_DOT[resolved.kind])}
        />
      )}
      {label}
    </Badge>
  );
}

export type { StatusPillProps };
export { resolveStatusKind, StatusPill };
