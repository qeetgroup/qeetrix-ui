import {
  Button,
  cn,
  EmptyState,
  MasterDetail,
  Separator,
  type StatusKind,
  StatusPill,
} from "@qeetrix/ui";
import { DownloadIcon, MonitorSmartphoneIcon } from "lucide-react";
import { useState } from "react";
import {
  dateFormat,
  dateTimeFormat,
  formatInr,
  type Invoice,
  type InvoiceStatus,
  invoices,
  invoiceTotals,
  sessions,
} from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, select, text } from "../registry/types";

const invoiceStatus: Record<InvoiceStatus, { kind: StatusKind; label: string }> = {
  paid: { kind: "success", label: "Paid" },
  sent: { kind: "info", label: "Sent" },
  overdue: { kind: "danger", label: "Overdue" },
  draft: { kind: "muted", label: "Draft" },
  void: { kind: "muted", label: "Void" },
};

function InvoiceList({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (number: string) => void;
}) {
  return (
    // `h-full overflow-auto`: below `collapseBelow` MasterDetail does not scroll the list for
    // you, so the list owns its scrolling in both layouts.
    <ul aria-label="Invoices" className="h-full divide-y overflow-auto">
      {invoices.map((invoice) => {
        const status = invoiceStatus[invoice.status];
        const isSelected = invoice.number === selected;
        return (
          <li key={invoice.number}>
            <button
              type="button"
              aria-current={isSelected ? "true" : undefined}
              onClick={() => onSelect(invoice.number)}
              className={cn(
                "flex w-full flex-col gap-1 px-3 py-2.5 text-start outline-none hover:bg-surface-interactive-hover focus-visible:bg-surface-interactive-hover",
                isSelected && "bg-brand-subtle hover:bg-brand-subtle-hover",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{invoice.customer}</span>
                <span className="shrink-0 text-sm tabular-nums">
                  {formatInr(invoiceTotals(invoice).total)}
                </span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-caption text-muted-foreground">
                  {invoice.number}
                </span>
                <StatusPill kind={status.kind}>{status.label}</StatusPill>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const headingId = `md-${invoice.number}`;
  const totals = invoiceTotals(invoice);
  const status = invoiceStatus[invoice.status];
  const taxLines = invoice.intraState
    ? [
        { label: `CGST @ ${invoice.gstRate / 2}%`, value: totals.cgst },
        { label: `SGST @ ${invoice.gstRate / 2}%`, value: totals.sgst },
      ]
    : [{ label: `IGST @ ${invoice.gstRate}%`, value: totals.igst }];
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 id={headingId} className="font-mono text-sm font-semibold">
            {invoice.number}
          </h3>
          <StatusPill kind={status.kind}>{status.label}</StatusPill>
        </div>
        <span className="text-caption text-muted-foreground">
          {invoice.customer} · GSTIN {invoice.gstin}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-caption text-muted-foreground">Issued</dt>
          <dd>{dateFormat.format(new Date(invoice.issued))}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Due</dt>
          <dd>{dateFormat.format(new Date(invoice.due))}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Place of supply</dt>
          <dd>{invoice.placeOfSupply}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Paid via</dt>
          <dd>{invoice.method ?? "—"}</dd>
        </div>
      </dl>
      <Separator />
      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Taxable value</dt>
          <dd className="tabular-nums">{formatInr(invoice.subtotal)}</dd>
        </div>
        {taxLines.map((line) => (
          <div key={line.label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{line.label}</dt>
            <dd className="tabular-nums">{formatInr(line.value)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatInr(totals.total)}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline">
          <DownloadIcon data-icon="inline-start" aria-hidden />
          Tax invoice PDF
        </Button>
        {invoice.status === "overdue" && <Button size="sm">Send UPI payment link</Button>}
      </div>
    </section>
  );
}

type PaneSize = number | string;

interface InvoiceMasterDetailProps {
  defaultListSize?: PaneSize;
  minListSize?: PaneSize;
  maxListSize?: PaneSize;
  collapseBelow?: "sm" | "md" | "lg" | "xl";
  detailTitle?: string;
  height?: string;
}

/** Invoices on the left, the selected invoice's GST breakdown on the right (a sheet on mobile). */
function InvoiceMasterDetail({
  defaultListSize,
  minListSize,
  maxListSize,
  collapseBelow,
  detailTitle = "Invoice details",
  height = "h-[420px]",
}: InvoiceMasterDetailProps) {
  const [selected, setSelected] = useState<string>(invoices[3].number);
  const [detailOpen, setDetailOpen] = useState(false);
  const invoice = invoices.find((entry) => entry.number === selected) ?? invoices[0];
  return (
    <div className={`${height} w-full`}>
      <MasterDetail
        defaultListSize={defaultListSize}
        minListSize={minListSize}
        maxListSize={maxListSize}
        collapseBelow={collapseBelow}
        detailTitle={detailTitle}
        detailOpen={detailOpen}
        onDetailOpenChange={setDetailOpen}
        list={
          <InvoiceList
            selected={selected}
            onSelect={(number) => {
              setSelected(number);
              setDetailOpen(true);
            }}
          />
        }
        detail={<InvoiceDetail invoice={invoice} />}
      />
    </div>
  );
}

/** Nothing selected yet: the detail pane explains what it will show. */
function SessionMasterDetail() {
  const [selected, setSelected] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const session = sessions.find((entry) => entry.id === selected);
  return (
    <div className="h-[320px] w-full">
      <MasterDetail
        defaultListSize={40}
        detailTitle="Session details"
        detailOpen={detailOpen}
        onDetailOpenChange={setDetailOpen}
        list={
          <ul aria-label="Sessions" className="h-full divide-y overflow-auto">
            {sessions.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-current={entry.id === selected ? "true" : undefined}
                  onClick={() => {
                    setSelected(entry.id);
                    setDetailOpen(true);
                  }}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-2.5 text-start outline-none hover:bg-surface-interactive-hover focus-visible:bg-surface-interactive-hover",
                    entry.id === selected && "bg-brand-subtle hover:bg-brand-subtle-hover",
                  )}
                >
                  <span className="truncate text-sm font-medium">{entry.device}</span>
                  <span className="truncate text-caption text-muted-foreground">
                    {entry.location} · {entry.browser}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        }
        detail={
          session ? (
            <div className="flex flex-col gap-2 p-4 text-sm">
              <h3 className="font-medium">{session.device}</h3>
              <span className="text-muted-foreground">
                {session.os} · {session.browser} · {session.method}
              </span>
              <span className="font-mono text-caption">
                {session.ip} · {session.location}
              </span>
              <span className="text-caption text-muted-foreground">
                Signed in {dateTimeFormat.format(new Date(session.createdAt))}
              </span>
              <div>
                <StatusPill kind={session.risk === "high" ? "danger" : "success"}>
                  {session.risk === "high" ? "High risk" : "Trusted"}
                </StatusPill>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={MonitorSmartphoneIcon}
              title="No session selected"
              description="Pick a session to see its device, sign-in method and network."
            />
          )
        }
      />
    </div>
  );
}

const listSizes = ["32", "45", "18rem", "320px"] as const;
const minSizes = ["22", "15", "14rem", "240px"] as const;
const maxSizes = ["none", "60", "36rem"] as const;

/** A bare number is a percentage; a string keeps its unit. */
function paneSize(value: string): PaneSize {
  return /^\d+$/.test(value) ? Number(value) : value;
}

const masterControls = {
  defaultListSize: select(listSizes, "32", "List size (number = %)"),
  minListSize: select(minSizes, "22", "Minimum list size"),
  maxListSize: select(maxSizes, "none", "Maximum list size"),
  collapseBelow: select(["sm", "md", "lg", "xl"] as const, "md", "Collapse below"),
  detailTitle: text("Invoice details", "Sheet title (collapsed layout)"),
};

/** A pane-size prop as JSX: numbers in braces, unit strings quoted. */
function sizeProp(value: string) {
  const size = paneSize(value);
  return typeof size === "number" ? expr(String(size)) : size;
}

export const examples: FamilyExamples = {
  "master-detail": {
    layout: "wide",
    minHeight: 1300,
    demos: [
      {
        name: "Invoices",
        description:
          "A resizable list + detail split on wide screens. Below `collapseBelow` (768px by default) the list fills the width and the detail opens in a sheet from the inline end.",
        render: () => <InvoiceMasterDetail defaultListSize={38} />,
      },
      {
        name: "Unit sizes",
        description:
          'A string keeps its unit: `defaultListSize="20rem"` with a `"16rem"` floor holds the list column steady as the window grows, and `maxListSize="60%"` always leaves the detail room to read.',
        render: () => (
          <InvoiceMasterDetail
            defaultListSize="20rem"
            minListSize="16rem"
            maxListSize="60%"
            height="h-[380px]"
          />
        ),
      },
      {
        name: "Collapse below lg",
        description:
          '`collapseBelow="lg"` switches to the list + sheet layout under 1024px, for pages that already give a sidebar part of a tablet\'s width.',
        render: () => <InvoiceMasterDetail collapseBelow="lg" height="h-[360px]" />,
      },
      {
        name: "Empty detail",
        description: "Before anything is selected, the detail pane says what it will show.",
        render: () => <SessionMasterDetail />,
      },
    ],
    playground: definePlayground({
      controls: masterControls,
      render: (v) => (
        <div className="w-[min(100%,900px)]">
          <InvoiceMasterDetail
            key={`${v.defaultListSize}-${v.minListSize}-${v.maxListSize}`}
            defaultListSize={paneSize(v.defaultListSize)}
            minListSize={paneSize(v.minListSize)}
            maxListSize={v.maxListSize === "none" ? undefined : paneSize(v.maxListSize)}
            collapseBelow={v.collapseBelow}
            detailTitle={v.detailTitle}
          />
        </div>
      ),
      code: (v) =>
        jsx("MasterDetail", {
          defaultListSize: v.defaultListSize === "32" ? undefined : sizeProp(v.defaultListSize),
          minListSize: v.minListSize === "22" ? undefined : sizeProp(v.minListSize),
          maxListSize: v.maxListSize === "none" ? undefined : sizeProp(v.maxListSize),
          collapseBelow: v.collapseBelow === "md" ? undefined : v.collapseBelow,
          detailTitle: v.detailTitle === "Details" ? undefined : v.detailTitle,
          detailOpen: expr("detailOpen"),
          onDetailOpenChange: expr("setDetailOpen"),
          list: expr('<ul aria-label="Invoices">{/* a button per invoice */}</ul>'),
          detail: expr('<section aria-label="Invoice">{/* the selected invoice */}</section>'),
        }),
    }),
  },
};
