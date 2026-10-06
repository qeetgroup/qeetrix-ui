import {
  AuditEvent,
  AuditEventMetadata,
  AuditLog,
  type AuditSeverity,
  Button,
  DiffViewer,
  JSONTree,
  toast,
} from "@qeetrix/ui";
import { type AuditRecord, auditRecords } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/** How each sample Qeet ID event reads as a sentence, and how loud it is. */
const presentation: Record<
  string,
  { action: string; resource: string; description: string; severity: AuditSeverity }
> = {
  aud_9001: {
    action: "changed the role of",
    resource: "Priya Nair",
    description: "Member → Developer",
    severity: "info",
  },
  aud_9002: {
    action: "revoked session",
    resource: "ses_04aa",
    description: "High-risk session from a Tor exit node in Frankfurt, DE",
    severity: "warning",
  },
  aud_9003: {
    action: "created API key",
    resource: "“Staging CI”",
    description: "Scope users:read · expires in 30 days",
    severity: "success",
  },
  aud_9004: {
    action: "failed to sign in as",
    resource: "Kavya Sharma",
    description: "Passkey not recognised — third failure in 10 minutes",
    severity: "danger",
  },
  aud_9005: {
    action: "updated policy",
    resource: "admin-mfa",
    description: "Passkeys are now required for every admin",
    severity: "warning",
  },
};

function actorOf(record: AuditRecord): string {
  return record.actor.name === "Unknown" ? `Unknown device (${record.ip})` : record.actor.name;
}

/** The user agent each sample event came from — the long, technical value that must wrap. */
const userAgents: Record<string, string> = {
  aud_9001: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/605.1.15 Chrome/151.0",
  aud_9004: "curl/8.9.1",
};

function Metadata({ record }: { record: AuditRecord }) {
  return (
    <AuditEventMetadata
      items={[
        { label: "Event type", value: record.action, mono: true },
        { label: "Actor", value: record.actor.email },
        { label: "Target", value: record.target },
        { label: "IP address", value: record.ip, mono: true },
        { label: "Location", value: record.location },
        ...(userAgents[record.id]
          ? [{ label: "User agent", value: userAgents[record.id], mono: true }]
          : []),
        { label: "Tenant", value: "Acme India Pvt Ltd (tnt_acme)" },
      ]}
    />
  );
}

function Changes({ record }: { record: AuditRecord }) {
  if (!record.changes?.length) return null;
  return (
    <DiffViewer
      before={record.changes.map((change) => `${change.field}: ${change.from}`).join("\n")}
      after={record.changes.map((change) => `${change.field}: ${change.to}`).join("\n")}
    />
  );
}

function RecordEvent({
  record,
  withDetails = true,
  withActions = false,
  defaultExpanded = false,
}: {
  record: AuditRecord;
  withDetails?: boolean;
  withActions?: boolean;
  defaultExpanded?: boolean;
}) {
  const event = presentation[record.id] ?? {
    action: record.summary,
    resource: record.target,
    description: record.target,
    severity: "info" as const,
  };
  return (
    <AuditEvent
      eventId={record.id}
      actor={actorOf(record)}
      action={event.action}
      resource={event.resource}
      timestamp={record.timestamp}
      severity={event.severity}
      description={event.description}
      statusLabel={record.outcome === "failure" ? "Blocked" : undefined}
      locale="en-IN"
      timeZone="Asia/Kolkata"
      defaultExpanded={defaultExpanded}
      metadata={withDetails ? <Metadata record={record} /> : undefined}
      diff={withDetails ? <Changes record={record} /> : undefined}
      raw={withDetails ? <JSONTree value={record} initialOpenDepth={1} /> : undefined}
      actions={
        withActions ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              View {event.resource}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toast("Event exported to Qeet Logs as a JSON line")}
            >
              Export event
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}

const [roleChange, , , failedLogin, policyChange] = auditRecords;

const auditControls = {
  actor: text("Rohan Mehta", "actor"),
  action: text("changed the role of", "action"),
  resource: text("Priya Nair", "resource"),
  severity: select(["info", "success", "warning", "danger"] as const, "info"),
  details: bool(true, "Details (metadata, diff, raw)"),
  actions: bool(true, "Actions"),
  defaultExpanded: bool(false, "Details open (defaultExpanded)"),
  statusLabel: text("", "statusLabel (empty = severity)"),
  locale: select(["en-IN", "en-US", "hi-IN"] as const, "en-IN"),
};

export const examples: FamilyExamples = {
  "audit-event": {
    layout: "wide",
    minHeight: 1500,
    demos: [
      {
        name: "Role change with diff",
        description:
          "`AuditEventMetadata` (monospaced IDs, IPs and user agents), a field diff and the raw record sit behind one disclosure, open here via `defaultExpanded`; actions are a free slot.",
        render: () => (
          <div className="max-w-3xl">
            <RecordEvent record={roleChange} withActions defaultExpanded />
          </div>
        ),
      },
      {
        name: "Severities",
        description:
          "A failed sign-in from an unknown network reads as danger, relabelled “Blocked” with `statusLabel`; a policy change reads as a warning.",
        render: () => (
          <div className="flex max-w-3xl flex-col gap-6">
            <RecordEvent record={failedLogin} />
            <RecordEvent record={policyChange} />
          </div>
        ),
      },
      {
        name: "Audit log",
        description:
          "`AuditLog` is a Feed: each event becomes a focusable article; Page Up / Page Down step through them.",
        render: () => (
          <AuditLog aria-label="Acme India audit log" className="max-w-3xl">
            {auditRecords.map((record) => (
              <RecordEvent key={record.id} record={record} withDetails={false} />
            ))}
          </AuditLog>
        ),
      },
      {
        name: "Unparseable timestamp",
        description:
          "An event imported from a legacy SIEM with a bad time renders the value verbatim instead of throwing.",
        render: () => (
          <div className="max-w-3xl">
            <AuditEvent
              eventId="aud_legacy_0042"
              actor="SCIM bridge"
              action="deprovisioned"
              resource="farhan.qureshi@acme.in"
              timestamp="n/a (imported from ArcSight)"
              severity="warning"
              description="Replayed from the 2025 directory migration export."
            />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: auditControls,
      render: (v) => (
        <div className="w-full max-w-3xl">
          <AuditEvent
            key={String(v.defaultExpanded)}
            eventId={roleChange.id}
            actor={v.actor}
            action={v.action}
            resource={v.resource || undefined}
            timestamp={roleChange.timestamp}
            severity={v.severity}
            description="Member → Developer in Acme India"
            statusLabel={v.statusLabel || undefined}
            locale={v.locale}
            timeZone="Asia/Kolkata"
            defaultExpanded={v.defaultExpanded}
            metadata={v.details ? <Metadata record={roleChange} /> : undefined}
            diff={v.details ? <Changes record={roleChange} /> : undefined}
            raw={v.details ? <JSONTree value={roleChange} /> : undefined}
            actions={
              v.actions ? (
                <Button size="sm" variant="outline">
                  View user
                </Button>
              ) : undefined
            }
          />
        </div>
      ),
      code: (v) =>
        jsx("AuditEvent", {
          eventId: roleChange.id,
          actor: v.actor,
          action: v.action,
          resource: v.resource || undefined,
          timestamp: roleChange.timestamp,
          severity: v.severity === "info" ? undefined : v.severity,
          description: "Member → Developer in Acme India",
          statusLabel: v.statusLabel || undefined,
          locale: v.locale,
          timeZone: "Asia/Kolkata",
          defaultExpanded: v.defaultExpanded,
          metadata: v.details
            ? expr(
                '<AuditEventMetadata items={[{ label: "IP address", value: event.ip, mono: true }]} />',
              )
            : undefined,
          diff: v.details ? expr("<DiffViewer before={before} after={after} />") : undefined,
          raw: v.details ? expr("<JSONTree value={event} />") : undefined,
          actions: v.actions
            ? expr('<Button size="sm" variant="outline">View user</Button>')
            : undefined,
        }),
    }),
  },
};
