import {
  Badge,
  DescriptionDetails,
  DescriptionItem,
  DescriptionList,
  DescriptionTerm,
  StatusPill,
} from "@qeetrix/ui";
import type { ReactNode } from "react";
import {
  dateFormat,
  dateTimeFormat,
  formatInr,
  invoices,
  invoiceTotals,
  sessions,
  tenants,
} from "../data/qeet";
import { jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select } from "../registry/types";

const acme = tenants[0];
const invoice = invoices[1];
const totals = invoiceTotals(invoice);
const riskySession = sessions[3];

const tenantRows: { term: string; details: ReactNode; code: string }[] = [
  {
    term: "Tenant ID",
    details: <code className="font-mono text-caption">{acme.id}</code>,
    code: `<code>${acme.id}</code>`,
  },
  { term: "Legal name", details: acme.name, code: acme.name },
  { term: "Primary domain", details: acme.domain, code: acme.domain },
  {
    term: "Plan",
    details: <Badge variant="secondary">{acme.plan}</Badge>,
    code: `<Badge variant="secondary">${acme.plan}</Badge>`,
  },
  {
    term: "Data residency",
    details: "ap-south-1 (Mumbai) — data stays in India",
    code: "ap-south-1 (Mumbai) — data stays in India",
  },
  {
    term: "Users",
    details: <span className="tabular-nums">{acme.users.toLocaleString("en-IN")}</span>,
    code: acme.users.toLocaleString("en-IN"),
  },
  {
    term: "Status",
    details: <StatusPill status={acme.status} />,
    code: `<StatusPill status="${acme.status}" />`,
  },
];

const summaryCells = [
  { term: "Plan", details: <Badge variant="secondary">{acme.plan}</Badge> },
  { term: "Region", details: "ap-south-1 · Mumbai" },
  { term: "Users", details: acme.users.toLocaleString("en-IN") },
  { term: "Owner", details: "Ananya Iyer" },
  { term: "SSO", details: "Okta SAML · SCIM on" },
  { term: "Created", details: dateFormat.format(new Date("2024-07-02T09:00:00+05:30")) },
];

const descriptionControls = {
  layout: select(["horizontal", "vertical", "grid"] as const, "horizontal", "layout"),
  divided: bool(false, "divided"),
  rows: num(5, { min: 1, max: tenantRows.length, step: 1, label: "Rows" }),
};

export const examples: FamilyExamples = {
  "description-list": {
    layout: "wide",
    minHeight: 1250,
    demos: [
      {
        name: "Tenant details, divided",
        description:
          "Each pair grouped in a `DescriptionItem`; `divided` rules between them. Term and value columns from `sm`, stacked below it.",
        render: () => (
          <DescriptionList divided className="max-w-2xl">
            {tenantRows.map((row) => (
              <DescriptionItem key={row.term}>
                <DescriptionTerm>{row.term}</DescriptionTerm>
                <DescriptionDetails>{row.details}</DescriptionDetails>
              </DescriptionItem>
            ))}
          </DescriptionList>
        ),
      },
      {
        name: "Invoice summary",
        description: "Inter-state supply to Maharashtra, so the tax is IGST only.",
        render: () => (
          <DescriptionList className="max-w-2xl">
            <DescriptionTerm>Invoice</DescriptionTerm>
            <DescriptionDetails className="font-mono">{invoice.number}</DescriptionDetails>
            <DescriptionTerm>Bill to</DescriptionTerm>
            <DescriptionDetails>
              {invoice.customer}
              <span className="block font-mono text-caption text-muted-foreground">
                GSTIN {invoice.gstin}
              </span>
            </DescriptionDetails>
            <DescriptionTerm>Place of supply</DescriptionTerm>
            <DescriptionDetails>{invoice.placeOfSupply} (27)</DescriptionDetails>
            <DescriptionTerm>Taxable value</DescriptionTerm>
            <DescriptionDetails className="tabular-nums">
              {formatInr(invoice.subtotal)}
            </DescriptionDetails>
            <DescriptionTerm>IGST @ {invoice.gstRate}%</DescriptionTerm>
            <DescriptionDetails className="tabular-nums">
              {formatInr(totals.igst)}
            </DescriptionDetails>
            <DescriptionTerm>Total</DescriptionTerm>
            <DescriptionDetails className="font-semibold tabular-nums">
              {formatInr(totals.total)}
            </DescriptionDetails>
            <DescriptionTerm>Payment</DescriptionTerm>
            <DescriptionDetails>
              <StatusPill kind="success">Paid</StatusPill>
              <span className="ms-2 text-muted-foreground">
                {invoice.method} mandate NACH-88213
              </span>
            </DescriptionDetails>
          </DescriptionList>
        ),
      },
      {
        name: "Grid summary",
        description:
          '`layout="grid"` fills the width with term-over-value cells for a summary panel.',
        render: () => (
          <DescriptionList layout="grid" className="max-w-3xl rounded-lg border bg-card p-4">
            {summaryCells.map((cell) => (
              <DescriptionItem key={cell.term}>
                <DescriptionTerm>{cell.term}</DescriptionTerm>
                <DescriptionDetails>{cell.details}</DescriptionDetails>
              </DescriptionItem>
            ))}
          </DescriptionList>
        ),
      },
      {
        name: "Vertical, in a side panel",
        description:
          '`layout="vertical"` stacks term over value at every width, for narrow panels.',
        render: () => (
          <div className="max-w-xs rounded-lg border bg-card p-4">
            <p className="mb-3 text-sm font-medium">Flagged session · {riskySession.id}</p>
            <DescriptionList layout="vertical">
              <DescriptionTerm>Device</DescriptionTerm>
              <DescriptionDetails>
                {riskySession.device} ({riskySession.browser})
              </DescriptionDetails>
              <DescriptionTerm>Location</DescriptionTerm>
              <DescriptionDetails>
                {riskySession.location} · <span className="font-mono">{riskySession.ip}</span>
              </DescriptionDetails>
              <DescriptionTerm>Signed in</DescriptionTerm>
              <DescriptionDetails>
                {dateTimeFormat.format(new Date(riskySession.createdAt))} · {riskySession.method}
              </DescriptionDetails>
              <DescriptionTerm>Risk</DescriptionTerm>
              <DescriptionDetails>
                <StatusPill kind="danger">High — Tor exit node</StatusPill>
              </DescriptionDetails>
            </DescriptionList>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: descriptionControls,
      render: (v) => (
        <DescriptionList
          layout={v.layout}
          divided={v.divided}
          className={v.layout === "vertical" ? "w-72" : "w-full max-w-2xl"}
        >
          {tenantRows.slice(0, v.rows).map((row) => (
            <DescriptionItem key={row.term}>
              <DescriptionTerm>{row.term}</DescriptionTerm>
              <DescriptionDetails>{row.details}</DescriptionDetails>
            </DescriptionItem>
          ))}
        </DescriptionList>
      ),
      code: (v) =>
        jsx(
          "DescriptionList",
          {
            layout: v.layout === "horizontal" ? undefined : v.layout,
            divided: v.divided,
          },
          tenantRows
            .slice(0, v.rows)
            .map((row) =>
              jsx("DescriptionItem", {}, [
                jsx("DescriptionTerm", {}, row.term),
                jsx("DescriptionDetails", {}, row.code),
              ]),
            ),
        ),
    }),
  },
};
