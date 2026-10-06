import {
  AccessReview,
  type AccessReviewDecision,
  type AccessReviewItem,
  type AccessReviewVerdict,
  Avatar,
  AvatarFallback,
  Button,
  StatusPill,
  toast,
} from "@qeetrix/ui";
import { useState } from "react";
import { tenants } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const bharat = tenants[3];

/** Q3 FY 2026-27 access review for one Bharat FinServ administrator. */
const reviewItems: AccessReviewItem[] = [
  {
    id: "role.tenant_admin",
    label: "Tenant administrator",
    description: "Manage users, groups, SSO and SCIM for the whole tenant",
    scope: `${bharat.name} · all org units`,
    state: "granted",
  },
  {
    id: "role.billing_manager",
    label: "Billing manager",
    description: "Approve Qeet Pay refunds above ₹50,000 and download GST invoices",
    scope: "Finance org unit",
    state: "granted",
    inherited: true,
  },
  {
    id: "perm.api_keys",
    label: "API key management",
    description: "Create and rotate live and test keys",
    scope: "2 of 4 environments (prod-mumbai, staging)",
    state: "mixed",
  },
  {
    id: "perm.scim",
    label: "SCIM provisioning",
    description: "Push users from the Azure AD directory",
    scope: "Retail Banking",
    state: "denied",
  },
  {
    id: "perm.audit_export",
    label: "Audit log export",
    description: "Requested 2 Oct 2026 — waiting for the CISO's approval",
    scope: "Qeet Logs · 400-day retention",
    state: "pending",
  },
  {
    id: "role.break_glass",
    label: "Break-glass owner",
    description: "Emergency access; changes need an approved change ticket",
    scope: `${bharat.name}`,
    state: "granted",
    locked: true,
  },
];

function Reviewee() {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarFallback>RD</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-foreground">Rahul Deshpande</span>
        <span className="text-caption text-muted-foreground">
          rahul.deshpande@{bharat.domain} · Admin since Mar 2024 · last active 2 hours ago
        </span>
      </div>
      <StatusPill kind="warning" className="ms-auto">
        Due 15 Oct
      </StatusPill>
    </div>
  );
}

/** Q3 FY 2026-27 certification: every Bharat FinServ admin grant, with evidence and risk. */
const certificationItems: AccessReviewItem[] = [
  {
    id: "cert_rahul_tenant_admin",
    label: "Tenant administrator",
    subject: { name: "Rahul Deshpande", detail: `rahul.deshpande@${bharat.domain}` },
    resource: `${bharat.name} · all org units`,
    state: "granted",
    risk: "high",
    riskReason: "Can change SSO and SCIM for 3,290 users",
    evidence: [
      { label: "Last used", value: "2 hours ago" },
      { label: "Granted by", value: "Ananya Iyer, Mar 2024" },
    ],
    recommendation: "approved",
    decision: null,
  },
  {
    id: "cert_sneha_billing",
    label: "Billing manager",
    subject: { name: "Sneha Kulkarni", detail: `sneha.kulkarni@${bharat.domain}` },
    resource: "Qeet Pay · refunds above ₹50,000",
    state: "granted",
    inherited: true,
    risk: "medium",
    riskReason: "Inherited from the finance-admins group",
    evidence: [
      { label: "Last used", value: "94 days ago" },
      { label: "Granted by", value: "SCIM (Azure AD)" },
    ],
    recommendation: "revoked",
    decision: null,
  },
  {
    id: "cert_ci_api_keys",
    label: "API key management",
    subject: { name: "github-actions-deploy", detail: "Workload identity · prod-mumbai" },
    resource: "prod-mumbai, staging",
    state: "mixed",
    risk: "critical",
    riskReason: "Can mint live keys; no human owner on record",
    evidence: [
      { label: "Last used", value: "12 minutes ago" },
      { label: "Owner", value: "None — previous owner left in July" },
    ],
    decision: null,
  },
  {
    id: "cert_imran_audit",
    label: "Audit log export",
    subject: { name: "Imran Shaikh", detail: `imran.shaikh@${bharat.domain}` },
    resource: "Qeet Logs · 400-day retention",
    state: "granted",
    risk: "low",
    evidence: [
      { label: "Last used", value: "6 days ago" },
      { label: "Granted by", value: "RBI audit request RA-2026-114" },
    ],
    recommendation: "approved",
    decision: "approved",
  },
  {
    id: "cert_breakglass",
    label: "Break-glass owner",
    subject: { name: "Bharat FinServ SecOps", detail: "Group · 2 members" },
    resource: bharat.name,
    state: "granted",
    locked: true,
    risk: "critical",
    riskReason: "Emergency access; changed only through an approved change ticket",
    evidence: [{ label: "Last used", value: "Never" }],
  },
];

/** Saving takes a moment, as it would against the Qeet ID API: rows show progress meanwhile. */
const SAVE_DELAY_MS = 700;

function CertificationDemo() {
  const [items, setItems] = useState(certificationItems);
  const [selectedIds, setSelectedIds] = useState<string[]>(["cert_sneha_billing"]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const decide = (ids: string[], decision: AccessReviewVerdict | null) => {
    setPendingIds((current) => [...current, ...ids]);
    window.setTimeout(() => {
      setItems((current) =>
        current.map((item) => (ids.includes(item.id) ? { ...item, decision } : item)),
      );
      setPendingIds((current) => current.filter((id) => !ids.includes(id)));
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
    }, SAVE_DELAY_MS);
  };
  const decided = items.filter((item) => item.decision).length;
  const reviewable = items.filter((item) => !item.locked).length;
  return (
    <div className="flex flex-col gap-3">
      <AccessReview
        items={items}
        onDecisionChange={decide}
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        pendingIds={pendingIds}
        bulkActions={(ids) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              toast(
                `Evidence for ${ids.length} ${ids.length === 1 ? "grant" : "grants"} exported`,
                {
                  description:
                    "CSV with sign-in history and grant provenance, for the RBI audit file.",
                },
              )
            }
          >
            Export evidence
          </Button>
        )}
        aria-label={`Q3 access review for ${bharat.name} administrators`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-caption text-muted-foreground">
          {decided} of {reviewable} decisions recorded · due 15 Oct 2026
        </span>
        <Button
          size="sm"
          className="ms-auto"
          disabled={decided < reviewable}
          onClick={() =>
            toast.success("Certification submitted", {
              description: "Revoked grants are removed at 00:00 IST and written to the audit log.",
            })
          }
        >
          Submit certification
        </Button>
      </div>
    </div>
  );
}

function useDecisions(initial: AccessReviewItem[]) {
  const [items, setItems] = useState(initial);
  const decide = (id: string, state: AccessReviewDecision) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, state } : item)));
  return [items, decide] as const;
}

function QuarterlyReviewDemo() {
  const [items, decide] = useDecisions(reviewItems);
  const kept = items.filter((item) => item.state === "granted").length;
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <Reviewee />
      <AccessReview
        items={items}
        onStateChange={decide}
        aria-label="Access held by Rahul Deshpande"
      />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-caption text-muted-foreground">
          {kept} of {items.length} grants kept
        </span>
        <Button
          size="sm"
          className="ms-auto"
          onClick={() =>
            toast.success("Review submitted", {
              description: "Revoked access is removed at 00:00 IST and recorded in the audit log.",
            })
          }
        >
          Submit review
        </Button>
      </div>
    </div>
  );
}

function RowActionsDemo() {
  const [items, decide] = useDecisions(reviewItems.slice(0, 4));
  return (
    <AccessReview
      className="max-w-4xl"
      items={items}
      onStateChange={decide}
      aria-label="Access held by Rahul Deshpande"
      renderActions={(item) =>
        item.state === "denied" ? (
          <Button size="xs" variant="outline" onClick={() => decide(item.id, "granted")}>
            Restore<span className="sr-only"> {item.label}</span>
          </Button>
        ) : (
          <Button
            size="xs"
            variant="ghost"
            className="text-destructive-text"
            onClick={() => decide(item.id, "denied")}
          >
            Revoke<span className="sr-only"> {item.label}</span>
          </Button>
        )
      }
    />
  );
}

function PlaygroundReview({
  mode,
  interactive,
  selectable,
  actions,
  empty,
  label,
}: {
  mode: "assignment" | "certification";
  interactive: boolean;
  selectable: boolean;
  actions: boolean;
  empty: boolean;
  label: string;
}) {
  const [assignments, assign] = useDecisions(reviewItems);
  const [certifications, setCertifications] = useState(certificationItems);
  const certify = (ids: string[], decision: AccessReviewVerdict | null) =>
    setCertifications((current) =>
      current.map((item) => (ids.includes(item.id) ? { ...item, decision } : item)),
    );
  const certification = mode === "certification";
  const items = certification ? certifications : assignments;
  return (
    <AccessReview
      className="w-full max-w-5xl"
      items={empty ? [] : items}
      onStateChange={!certification && interactive ? assign : undefined}
      onDecisionChange={certification && interactive ? certify : undefined}
      selectable={selectable}
      aria-label={label}
      emptyMessage="Nothing to review: every grant for this user was removed last quarter."
      renderActions={
        actions
          ? (item) => (
              <Button size="xs" variant="ghost">
                History<span className="sr-only"> for {item.label}</span>
              </Button>
            )
          : undefined
      }
    />
  );
}

const reviewControls = {
  mode: select(["assignment", "certification"] as const, "certification", "Mode"),
  interactive: bool(true, "Decisions enabled (onStateChange / onDecisionChange)"),
  selectable: bool(true, "selectable (bulk bar)"),
  actions: bool(false, "Row actions (renderActions)"),
  empty: bool(false, "No items"),
  "aria-label": text("Q3 access review for Bharat FinServ administrators", "aria-label"),
};

export const examples: FamilyExamples = {
  "access-review": {
    layout: "wide",
    minHeight: 2200,
    demos: [
      {
        name: "Certification — quarterly admin review",
        description:
          "`onDecisionChange` puts the table in certification mode: subjects, risk with a reason, evidence and a recommendation per grant. Selection is controlled (`selectedIds`), the bulk bar adds `bulkActions`, and rows being saved are in `pendingIds`. Locked break-glass access is excluded.",
        render: () => <CertificationDemo />,
      },
      {
        name: "Assignment — one admin's grants",
        description:
          "Toggle each grant to keep or revoke it. Pending requests and locked break-glass access cannot be changed here; inherited grants are flagged.",
        render: () => <QuarterlyReviewDemo />,
      },
      {
        name: "Row actions",
        description:
          "`renderActions` adds a per-row column; each button names the grant it acts on.",
        render: () => <RowActionsDemo />,
      },
      {
        name: "Read-only",
        description: "Without `onStateChange` the checkboxes are disabled: a completed review.",
        render: () => (
          <AccessReview
            className="max-w-4xl"
            items={reviewItems.slice(0, 4)}
            aria-label="Completed review for Rahul Deshpande"
          />
        ),
      },
      {
        name: "Empty",
        render: () => (
          <AccessReview
            className="max-w-4xl"
            items={[]}
            emptyMessage="Nothing to review: every grant for this user was removed last quarter."
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: reviewControls,
      render: (v) => <PlaygroundReview {...v} label={v["aria-label"]} />,
      code: (v) => {
        const certification = v.mode === "certification";
        return jsx("AccessReview", {
          items: expr(v.empty ? "[]" : "items"),
          onStateChange:
            !certification && v.interactive
              ? expr("(id, state) => saveAssignment(id, state)")
              : undefined,
          onDecisionChange:
            certification && v.interactive
              ? expr("(ids, decision) => recordDecision(ids, decision)")
              : undefined,
          selectable: v.selectable,
          renderActions: v.actions
            ? expr('(item) => <Button size="xs" variant="ghost">History</Button>')
            : undefined,
          emptyMessage: v.empty
            ? "Nothing to review: every grant for this user was removed last quarter."
            : undefined,
          "aria-label": v["aria-label"],
        });
      },
    }),
  },
};
