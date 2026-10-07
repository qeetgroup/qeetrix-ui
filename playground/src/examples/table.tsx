import { KeyRoundIcon } from "@qeetrix/icons";
import {
  Checkbox,
  EmptyState,
  StatusPill,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@qeetrix/ui";
import { useState } from "react";
import { formatInr, type LogLevel, logEvents, type Session, sessions } from "../data/qeet";
import { jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/** QP-INV-2026-00412 (Acme India, Karnataka → intra-state): ₹2,48,000 taxable at 18% GST. */
const lineItems = [
  {
    id: "li_id",
    description: "Qeet ID Enterprise — 1,842 monthly active users",
    sac: "997331",
    quantity: 1842,
    rate: 100,
  },
  {
    id: "li_logs",
    description: "Qeet Logs retention add-on (90 days, ap-south-1)",
    sac: "998315",
    quantity: 1,
    rate: 38800,
  },
  {
    id: "li_sms",
    description: "Qeet Notify DLT-registered SMS sender ID",
    sac: "998599",
    quantity: 1,
    rate: 25000,
  },
] as const;

const taxable = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
const cgst = Math.round(taxable * 9) / 100;
const sgst = cgst;
const quantity = new Intl.NumberFormat("en-IN");

function LineItemsTable({
  caption = "QP-INV-2026-00412 · Acme India Pvt Ltd · Place of supply: Karnataka",
  footer = true,
  selectedId,
  sticky = false,
}: {
  caption?: string;
  footer?: boolean;
  selectedId?: string;
  sticky?: boolean;
}) {
  return (
    <Table containerClassName={sticky ? "max-h-56 rounded-lg border" : undefined}>
      {caption && <TableCaption>{caption}</TableCaption>}
      <TableHeader sticky={sticky}>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead>SAC</TableHead>
          <TableHead className="text-end">Qty</TableHead>
          <TableHead className="text-end">Rate</TableHead>
          <TableHead className="text-end">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lineItems.map((item) => (
          <TableRow key={item.id} data-state={item.id === selectedId ? "selected" : undefined}>
            <TableCell className="font-medium">{item.description}</TableCell>
            <TableCell className="font-mono text-caption text-muted-foreground">
              {item.sac}
            </TableCell>
            <TableCell className="text-end tabular-nums">
              {quantity.format(item.quantity)}
            </TableCell>
            <TableCell className="text-end tabular-nums">{formatInr(item.rate)}</TableCell>
            <TableCell className="text-end tabular-nums">
              {formatInr(item.quantity * item.rate)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {footer && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>Taxable value</TableCell>
            <TableCell className="text-end tabular-nums">{formatInr(taxable)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4} className="font-normal text-muted-foreground">
              CGST @ 9%
            </TableCell>
            <TableCell className="text-end font-normal tabular-nums">{formatInr(cgst)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4} className="font-normal text-muted-foreground">
              SGST @ 9%
            </TableCell>
            <TableCell className="text-end font-normal tabular-nums">{formatInr(sgst)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={4} className="font-semibold">
              Total payable
            </TableCell>
            <TableCell className="text-end font-semibold tabular-nums">
              {formatInr(taxable + cgst + sgst)}
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}

const riskStatus: Record<
  Session["risk"],
  { kind: "success" | "warning" | "danger"; label: string }
> = {
  low: { kind: "success", label: "Low" },
  medium: { kind: "warning", label: "Medium" },
  high: { kind: "danger", label: "High" },
};

/** Click a checkbox to select sessions; selected rows get `data-state="selected"`. */
function SessionsTable() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(["ses_04aa"]));
  const toggle = (id: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  return (
    <Table aria-label="Active sessions for Rohan Mehta">
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <span className="sr-only">Select</span>
          </TableHead>
          <TableHead>Device</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>IP address</TableHead>
          <TableHead>Signed in with</TableHead>
          <TableHead>Risk</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id} data-state={selected.has(session.id) ? "selected" : undefined}>
            <TableCell>
              <Checkbox
                aria-label={`Select ${session.device}`}
                checked={selected.has(session.id)}
                onCheckedChange={(checked) => toggle(session.id, checked === true)}
              />
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span className="font-medium">
                  {session.device}
                  {session.current && (
                    <span className="ms-2 text-caption text-success-text">This device</span>
                  )}
                </span>
                <span className="text-caption text-muted-foreground">
                  {session.browser} · {session.os}
                </span>
              </div>
            </TableCell>
            <TableCell>{session.location}</TableCell>
            <TableCell className="font-mono text-caption">{session.ip}</TableCell>
            <TableCell>{session.method}</TableCell>
            <TableCell>
              <StatusPill kind={riskStatus[session.risk].kind}>
                {riskStatus[session.risk].label}
              </StatusPill>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableCaption>
        {selected.size} of {sessions.length} sessions selected
      </TableCaption>
    </Table>
  );
}

const levelKind: Record<LogLevel, "muted" | "info" | "warning" | "danger"> = {
  debug: "muted",
  info: "info",
  warn: "warning",
  error: "danger",
};

const selectableRows = ["none", ...lineItems.map((item) => item.id)] as const;

const tableControls = {
  caption: text("QP-INV-2026-00412 · Acme India Pvt Ltd · Place of supply: Karnataka", "Caption"),
  footer: bool(true, "Footer (tax + total)"),
  selected: select(selectableRows, "none", "Selected row"),
  sticky: bool(false, "Sticky header (TableHeader sticky + capped container)"),
};

export const examples: FamilyExamples = {
  table: {
    layout: "wide",
    minHeight: 1250,
    demos: [
      {
        name: "Invoice line items with footer",
        description:
          "Native table semantics: a caption names it, amounts are right-aligned tabular figures and the footer carries the CGST + SGST split and the total.",
        render: () => <LineItemsTable />,
      },
      {
        name: "Selected rows",
        description:
          'Selection is the caller\'s state; `data-state="selected"` on a row applies the selected fill.',
        render: () => <SessionsTable />,
      },
      {
        name: "Sticky header",
        description:
          "A height cap on `containerClassName` plus `<TableHeader sticky>` keeps the column names in view while the Qeet Logs rows scroll.",
        render: () => (
          <Table
            aria-label="Recent Qeet Logs events"
            containerClassName="max-h-64 rounded-lg border"
          >
            <TableHeader sticky>
              <TableRow>
                <TableHead>Time (UTC)</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...logEvents, ...logEvents].map((event, position) => (
                <TableRow key={`${event.id}-${position < logEvents.length ? "a" : "b"}`}>
                  <TableCell className="font-mono text-caption">
                    {event.timestamp.slice(11, 19)}
                  </TableCell>
                  <TableCell>
                    <StatusPill kind={levelKind[event.level]}>{event.level}</StatusPill>
                  </TableCell>
                  <TableCell className="font-mono text-caption">{event.service}</TableCell>
                  <TableCell>{event.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ),
      },
      {
        name: "Empty",
        description: "`TableEmpty` is a full-width body row that never takes the hover wash.",
        render: () => (
          <Table aria-label="API keys">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Last used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableEmpty colSpan={4}>
                <EmptyState
                  icon={KeyRoundIcon}
                  title="No API keys for Kanpur Logistics"
                  description="Create a key to call the Qeet Pay API from your servers. Keys are shown once."
                  className="py-0"
                />
              </TableEmpty>
            </TableBody>
          </Table>
        ),
      },
    ],
    playground: definePlayground({
      controls: tableControls,
      render: (v) => (
        <div className="w-full">
          <LineItemsTable
            caption={v.caption}
            footer={v.footer}
            selectedId={v.selected === "none" ? undefined : v.selected}
            sticky={v.sticky}
          />
        </div>
      ),
      code: (v) => {
        const row = (item: (typeof lineItems)[number]) =>
          jsx("TableRow", { "data-state": item.id === v.selected ? "selected" : undefined }, [
            jsx("TableCell", {}, item.description),
            jsx("TableCell", {}, item.sac),
            jsx("TableCell", { className: "text-end tabular-nums" }, String(item.quantity)),
            jsx("TableCell", { className: "text-end tabular-nums" }, formatInr(item.rate)),
            jsx(
              "TableCell",
              { className: "text-end tabular-nums" },
              formatInr(item.quantity * item.rate),
            ),
          ]);
        return jsx(
          "Table",
          { containerClassName: v.sticky ? "max-h-56 rounded-lg border" : undefined },
          [
            v.caption ? jsx("TableCaption", {}, v.caption) : "",
            jsx("TableHeader", { sticky: v.sticky }, [
              jsx("TableRow", {}, [
                jsx("TableHead", {}, "Description"),
                jsx("TableHead", {}, "SAC"),
                jsx("TableHead", { className: "text-end" }, "Qty"),
                jsx("TableHead", { className: "text-end" }, "Rate"),
                jsx("TableHead", { className: "text-end" }, "Amount"),
              ]),
            ]),
            jsx("TableBody", {}, lineItems.map(row)),
            v.footer
              ? jsx(
                  "TableFooter",
                  {},
                  [
                    ["Taxable value", taxable],
                    ["CGST @ 9%", cgst],
                    ["SGST @ 9%", sgst],
                    ["Total payable", taxable + cgst + sgst],
                  ].map(([label, amount]) =>
                    jsx("TableRow", {}, [
                      jsx("TableCell", { colSpan: 4 }, String(label)),
                      jsx(
                        "TableCell",
                        { className: "text-end tabular-nums" },
                        formatInr(Number(amount)),
                      ),
                    ]),
                  ),
                )
              : "",
          ],
        );
      },
    }),
  },
};
