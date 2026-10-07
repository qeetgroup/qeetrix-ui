import {
  type IconProps,
  KeyRoundIcon,
  MessageSquareIcon,
  ShieldAlertIcon,
  SmartphoneIcon,
  UserPlusIcon,
  UsersIcon,
} from "@qeetrix/icons";
import {
  Avatar,
  AvatarFallback,
  Button,
  type ColumnDef,
  DataTable,
  type DataTableFacet,
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
  EmptyState,
  type Row,
  Spinner,
  type StatusKind,
  StatusPill,
  toast,
} from "@qeetrix/ui";
import type { ComponentType } from "react";
import {
  formatInr,
  type Invoice,
  type InvoiceStatus,
  type InvoiceTotals,
  invoices,
  invoiceTotals,
  type LogEvent,
  type LogLevel,
  logEvents,
  type MfaMethod,
  minutesAgo,
  NOW,
  type User,
  type UserRole,
  type UserStatus,
  users,
} from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { matchesAny } from "../lib/table";
import { bool, definePlayground, type FamilyExamples, num, select } from "../registry/types";

/* ── Shared formatting ─────────────────────────────────────────────────────────────────────── */

const relative = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
const issuedFormat = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" });
const clockFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

/** "4 minutes ago" / "2 days ago", relative to the playground's fixed `NOW`. */
function sinceNow(iso: string): string {
  const minutes = Math.round((NOW.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  return relative.format(-Math.round(hours / 24), "day");
}

/** Right-aligns a header (sortable or not): the table's className lifts it to the header cell. */
const ALIGN_END_HEADERS = "[&_th:has([data-align=end])>div]:justify-end";

/* ── Qeet ID users ─────────────────────────────────────────────────────────────────────────── */

const roles: readonly UserRole[] = ["Owner", "Admin", "Developer", "Billing", "Auditor", "Member"];

const mfa: Record<MfaMethod, { label: string; icon: ComponentType<IconProps<"outline">> }> = {
  passkey: { label: "Passkey", icon: KeyRoundIcon },
  totp: { label: "Authenticator app", icon: SmartphoneIcon },
  sms: { label: "SMS OTP", icon: MessageSquareIcon },
  none: { label: "Not enrolled", icon: ShieldAlertIcon },
};

const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "User",
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Avatar size="sm">
          <AvatarFallback>{row.original.initials}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-foreground">{row.original.name}</span>
          <span className="text-caption text-muted-foreground">{row.original.email}</span>
        </div>
      </div>
    ),
  },
  { accessorKey: "role", header: "Role", filterFn: matchesAny },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: matchesAny,
    cell: ({ getValue }) => <StatusPill status={getValue<UserStatus>()} />,
  },
  {
    id: "MFA",
    accessorKey: "mfa",
    header: "MFA",
    cell: ({ getValue }) => {
      const method = mfa[getValue<MfaMethod>()];
      const Icon = method.icon;
      return (
        <span
          className={
            getValue<MfaMethod>() === "none"
              ? "inline-flex items-center gap-1.5 text-warning-text"
              : "inline-flex items-center gap-1.5"
          }
        >
          <Icon aria-hidden className="size-3.5" />
          {method.label}
        </span>
      );
    },
  },
  { accessorKey: "department", header: "Department" },
  {
    accessorKey: "lastActive",
    header: "Last active",
    sortDescFirst: true,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{sinceNow(getValue<string>())}</span>
    ),
  },
];

const userFacets: DataTableFacet[] = [
  { columnId: "role", title: "Role", options: roles.map((role) => ({ label: role, value: role })) },
  {
    columnId: "status",
    title: "Status",
    options: [
      { label: "Active", value: "active" },
      { label: "Pending", value: "pending" },
      { label: "Suspended", value: "suspended" },
      { label: "Inactive", value: "inactive" },
    ],
  },
];

const userTable = {
  getRowId: (user: User) => user.id,
  getRowLabel: (row: Row<User>) => row.original.name,
};

function userBulkActions(rows: Row<User>[]) {
  const count = rows.length;
  const people = `${count} ${count === 1 ? "user" : "users"}`;
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          toast.success(`Passkey enrolment required for ${people}`, {
            description: "They will be asked to register a passkey at their next sign-in.",
          })
        }
      >
        <KeyRoundIcon data-icon="inline-start" aria-hidden />
        Require passkey
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() =>
          toast.warning(`Suspended ${people}`, {
            description: "Their active sessions were revoked across every Qeet product.",
          })
        }
      >
        Suspend
      </Button>
    </>
  );
}

const inviteAction = (
  <Button size="sm" onClick={() => toast("Invitation sent to the address you entered")}>
    <UserPlusIcon data-icon="inline-start" aria-hidden />
    Invite user
  </Button>
);

/* ── Qeet Pay invoices ─────────────────────────────────────────────────────────────────────── */

type InvoiceRow = Invoice & InvoiceTotals;
const invoiceRows: InvoiceRow[] = invoices.map((invoice) => ({
  ...invoice,
  ...invoiceTotals(invoice),
}));

const invoiceStatus: Record<InvoiceStatus, { kind: StatusKind; label: string }> = {
  paid: { kind: "success", label: "Paid" },
  sent: { kind: "info", label: "Sent" },
  overdue: { kind: "danger", label: "Overdue" },
  draft: { kind: "muted", label: "Draft" },
  void: { kind: "muted", label: "Void" },
};

function Amount({ value, strong = false }: { value: number; strong?: boolean }) {
  if (value === 0) return <div className="text-end text-muted-foreground">—</div>;
  return (
    <div className={strong ? "text-end font-medium tabular-nums" : "text-end tabular-nums"}>
      {formatInr(value)}
    </div>
  );
}

function amountColumn(
  id: string,
  accessorKey: keyof InvoiceTotals | "subtotal",
  header: string,
  strong = false,
): ColumnDef<InvoiceRow> {
  return {
    id,
    accessorKey,
    header: () => <span data-align="end">{header}</span>,
    cell: ({ getValue }) => <Amount value={getValue<number>()} strong={strong} />,
  };
}

const invoiceNumberColumn: ColumnDef<InvoiceRow> = {
  id: "invoice",
  accessorKey: "number",
  header: "Invoice",
  cell: ({ getValue }) => <span className="font-mono text-caption">{getValue<string>()}</span>,
};

const customerColumn: ColumnDef<InvoiceRow> = {
  accessorKey: "customer",
  header: "Customer",
  cell: ({ row }) => (
    <div className="flex flex-col">
      <span className="font-medium text-foreground">{row.original.customer}</span>
      <span className="font-mono text-caption text-muted-foreground">{row.original.gstin}</span>
    </div>
  ),
};

const invoiceColumns: ColumnDef<InvoiceRow>[] = [
  invoiceNumberColumn,
  customerColumn,
  {
    accessorKey: "issued",
    header: "Issued",
    cell: ({ getValue }) => issuedFormat.format(new Date(getValue<string>())),
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: matchesAny,
    cell: ({ getValue }) => {
      const status = invoiceStatus[getValue<InvoiceStatus>()];
      return <StatusPill kind={status.kind}>{status.label}</StatusPill>;
    },
  },
  amountColumn("taxableValue", "subtotal", "Taxable value"),
  amountColumn("CGST", "cgst", "CGST"),
  amountColumn("SGST", "sgst", "SGST"),
  amountColumn("IGST", "igst", "IGST"),
  amountColumn("total", "total", "Total", true),
];

const invoiceFacets: DataTableFacet[] = [
  {
    columnId: "status",
    title: "Status",
    options: Object.entries(invoiceStatus).map(([value, status]) => ({
      label: status.label,
      value,
    })),
  },
];

const gstColumns: ColumnDef<InvoiceRow>[] = [
  invoiceNumberColumn,
  customerColumn,
  {
    accessorKey: "placeOfSupply",
    header: "Place of supply",
  },
  amountColumn("taxableValue", "subtotal", "Taxable value"),
  amountColumn("GST", "tax", "GST"),
  amountColumn("total", "total", "Total", true),
];

function GstBreakup({ invoice }: { invoice: InvoiceRow }) {
  const half = invoice.gstRate / 2;
  return (
    <div className="px-6 py-4 ps-14">
      <DescriptionList className="max-w-xl gap-y-1.5 text-caption sm:grid-cols-[12rem_1fr]">
        <DescriptionTerm>Supply type</DescriptionTerm>
        <DescriptionDetails>
          {invoice.intraState
            ? `Intra-state (${invoice.placeOfSupply}) — CGST + SGST`
            : `Inter-state to ${invoice.placeOfSupply} — IGST`}
        </DescriptionDetails>
        <DescriptionTerm>Customer GSTIN</DescriptionTerm>
        <DescriptionDetails className="font-mono">{invoice.gstin}</DescriptionDetails>
        {invoice.intraState ? (
          <>
            <DescriptionTerm>CGST @ {half}%</DescriptionTerm>
            <DescriptionDetails className="tabular-nums">
              {formatInr(invoice.cgst)}
            </DescriptionDetails>
            <DescriptionTerm>SGST @ {half}%</DescriptionTerm>
            <DescriptionDetails className="tabular-nums">
              {formatInr(invoice.sgst)}
            </DescriptionDetails>
          </>
        ) : (
          <>
            <DescriptionTerm>IGST @ {invoice.gstRate}%</DescriptionTerm>
            <DescriptionDetails className="tabular-nums">
              {formatInr(invoice.igst)}
            </DescriptionDetails>
          </>
        )}
        <DescriptionTerm>Invoice total</DescriptionTerm>
        <DescriptionDetails className="font-medium tabular-nums">
          {formatInr(invoice.total)}
        </DescriptionDetails>
        <DescriptionTerm>Paid via</DescriptionTerm>
        <DescriptionDetails>{invoice.method ?? "Awaiting payment"}</DescriptionDetails>
      </DescriptionList>
    </div>
  );
}

/* ── Qeet Logs stream (virtualized) ────────────────────────────────────────────────────────── */

const levelKind: Record<LogLevel, StatusKind> = {
  debug: "muted",
  info: "info",
  warn: "warning",
  error: "danger",
};

/** 2,000 deterministic events: the sample stream repeated back over the last ~16 hours. */
const logRows: LogEvent[] = Array.from({ length: 2000 }, (_, index) => {
  const event = logEvents[index % logEvents.length];
  return {
    ...event,
    id: `evt_${String(index + 1).padStart(5, "0")}`,
    timestamp: minutesAgo(index * 0.5),
    traceId: `${event.traceId.slice(0, 12)}${(index * 2654435761).toString(16).slice(-4)}`,
  };
});

const logColumns: ColumnDef<LogEvent>[] = [
  {
    accessorKey: "timestamp",
    header: "Time (IST)",
    size: 136,
    cell: ({ getValue }) => (
      <span className="font-mono text-caption">
        {clockFormat.format(new Date(getValue<string>()))}
      </span>
    ),
  },
  {
    accessorKey: "level",
    header: "Level",
    size: 116,
    filterFn: matchesAny,
    cell: ({ getValue }) => (
      <StatusPill kind={levelKind[getValue<LogLevel>()]}>{getValue<LogLevel>()}</StatusPill>
    ),
  },
  {
    accessorKey: "service",
    header: "Service",
    size: 168,
    cell: ({ getValue }) => <span className="font-mono text-caption">{getValue<string>()}</span>,
  },
  {
    accessorKey: "message",
    header: "Message",
    size: 420,
    cell: ({ getValue }) => <span className="block truncate">{getValue<string>()}</span>,
  },
  {
    accessorKey: "traceId",
    header: "Trace",
    size: 170,
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="font-mono text-caption text-muted-foreground">{getValue<string>()}</span>
    ),
  },
];

/* ── Playground ────────────────────────────────────────────────────────────────────────────── */

const playgroundControls = {
  enableSearch: bool(true, "Search"),
  facets: bool(true, "Faceted filters"),
  enableColumnVisibility: bool(true, "Columns menu (enableColumnVisibility)"),
  enableRowSelection: bool(true, "Row selection + bulk actions"),
  enableDensity: bool(false, "Density toggle"),
  enableExport: bool(false, "CSV export"),
  enableColumnResizing: bool(false, "Column resizing"),
  state: select(["ready", "busy", "loading", "error"] as const, "ready", "State"),
  pageSize: num(5, { min: 0, max: 12, step: 1, label: "Page size (0 = all)" }),
};

export const examples: FamilyExamples = {
  "data-table": {
    layout: "wide",
    minHeight: 3600,
    demos: [
      {
        name: "Users — search, facets, bulk actions",
        description:
          "Qeet ID members of Acme India: global search, role/status facets (exact-match `matchesAny` filter), row selection with bulk actions, column visibility, a density toggle and pagination.",
        render: () => (
          <DataTable
            columns={userColumns}
            data={[...users]}
            label="Acme India users"
            {...userTable}
            searchPlaceholder="Search name, email or department…"
            facetedFilters={userFacets}
            enableRowSelection
            bulkActions={userBulkActions}
            enableDensity
            pageSize={5}
            toolbarActions={inviteAction}
          />
        ),
      },
      {
        name: "Invoices — GST columns, sorting, CSV export",
        description:
          "Qeet Pay invoices with right-aligned tabular ₹ amounts. Intra-state supplies split CGST + SGST; inter-state supplies carry IGST. Export writes the filtered rows.",
        render: () => (
          <DataTable
            columns={invoiceColumns}
            data={invoiceRows}
            caption="Tax invoices issued by Qeet Pay, September–October 2026"
            getRowId={(invoice) => invoice.number}
            searchPlaceholder="Search invoice or customer…"
            facetedFilters={invoiceFacets}
            enableExport
            exportFilename="qeet-pay-invoices-2026-10.csv"
            pageSize={0}
            className={ALIGN_END_HEADERS}
          />
        ),
      },
      {
        name: "Expandable rows — GST breakup",
        description:
          "`enableExpanding` + `renderSubComponent` reveal the tax split, GSTIN and payment method under each invoice.",
        render: () => (
          <DataTable
            columns={gstColumns}
            data={invoiceRows}
            label="GST breakup by invoice"
            getRowId={(invoice) => invoice.number}
            getRowLabel={(row) => row.original.number}
            enableExpanding
            getRowCanExpand={() => true}
            renderSubComponent={(row) => <GstBreakup invoice={row.original} />}
            enableSearch={false}
            enableColumnVisibility={false}
            pageSize={4}
            className={ALIGN_END_HEADERS}
          />
        ),
      },
      {
        name: "Virtualized log stream — resize and pin",
        description:
          "2,000 Qeet Logs events with row virtualization inside a 360px scroll region; drag or arrow-key a column edge to resize, and pin columns from the header menu.",
        render: () => (
          <DataTable
            columns={logColumns}
            data={logRows}
            label="Qeet Logs live tail"
            getRowId={(event) => event.id}
            searchPlaceholder="Filter by message, service or trace…"
            facetedFilters={[{ columnId: "level", title: "Level" }]}
            enableVirtualization
            maxHeight={360}
            enableColumnResizing
            enablePinning
            enableColumnVisibility={false}
          />
        ),
      },
      {
        name: "Busy (refetching)",
        description:
          "`busy` keeps the stale rows in place while a refetch is in flight: aria-busy, a polite announcement and a progress rule along the body.",
        render: () => (
          <DataTable
            columns={userColumns}
            data={users.slice(0, 4)}
            label="Acme India users"
            {...userTable}
            busy
            pageSize={0}
            toolbarActions={
              <span className="inline-flex items-center gap-2 text-caption text-muted-foreground">
                <Spinner size="sm" aria-hidden className="text-current" />
                Syncing from Okta…
              </span>
            }
          />
        ),
      },
      {
        name: "Loading (first fetch)",
        description:
          "`loading` renders placeholder rows in the table's shape instead of flashing the empty state.",
        render: () => (
          <DataTable columns={userColumns} data={[]} label="Bharat FinServ users" loading />
        ),
      },
      {
        name: "Error",
        description:
          "`error` replaces the rows and is announced as an alert: a string gets the built-in panel, a node (here an EmptyState with a retry) replaces it.",
        render: () => (
          <div className="flex flex-col gap-4">
            <DataTable
              columns={invoiceColumns}
              data={[]}
              label="Qeet Pay invoices"
              error="Qeet Pay did not respond in time (504 from api.qeet.in/pay/v1/invoices). Your invoices are safe; try again in a moment."
              enableSearch={false}
              enableColumnVisibility={false}
              className={ALIGN_END_HEADERS}
            />
            <DataTable
              columns={userColumns}
              data={[]}
              label="Zenvia Health users"
              enableSearch={false}
              enableColumnVisibility={false}
              error={
                <EmptyState
                  icon={ShieldAlertIcon}
                  title="You no longer have access to this directory"
                  description="Your Admin role for Zenvia Health was removed in the last access review. Ask a tenant owner to restore it."
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toast("Access request sent to the tenant owners")}
                    >
                      Request access
                    </Button>
                  }
                  className="py-10"
                />
              }
            />
          </div>
        ),
      },
      {
        name: "Empty",
        description: "`emptyState` replaces the rows when there is nothing to show.",
        render: () => (
          <DataTable
            columns={userColumns}
            data={[]}
            label="Kanpur Logistics users"
            emptyState={
              <EmptyState
                icon={UsersIcon}
                title="No users in Kanpur Logistics yet"
                description="Invite people by email, or connect Okta SCIM to provision the whole directory automatically."
                action={<Button size="sm">Invite users</Button>}
                className="py-10"
              />
            }
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: playgroundControls,
      render: (v) => (
        <div className="w-full">
          <DataTable
            // Page size seeds the pagination state, so a new size needs a fresh table.
            key={`${v.pageSize}-${v.enableRowSelection}`}
            columns={userColumns}
            data={[...users]}
            label="Acme India users"
            {...userTable}
            enableSearch={v.enableSearch}
            enableColumnVisibility={v.enableColumnVisibility}
            facetedFilters={v.facets ? userFacets : undefined}
            enableRowSelection={v.enableRowSelection}
            bulkActions={v.enableRowSelection ? userBulkActions : undefined}
            enableDensity={v.enableDensity}
            enableExport={v.enableExport}
            exportFilename="acme-india-users.csv"
            enableColumnResizing={v.enableColumnResizing}
            busy={v.state === "busy"}
            loading={v.state === "loading"}
            error={
              v.state === "error" ? "Could not load users from Qeet ID. Try again." : undefined
            }
            pageSize={v.pageSize}
          />
        </div>
      ),
      code: (v) =>
        jsx("DataTable", {
          columns: expr("columns"),
          data: expr("users"),
          label: "Acme India users",
          getRowId: expr("(user) => user.id"),
          getRowLabel: expr("(row) => row.original.name"),
          enableSearch: v.enableSearch ? undefined : expr("false"),
          enableColumnVisibility: v.enableColumnVisibility ? undefined : expr("false"),
          facetedFilters: v.facets ? expr("facets") : undefined,
          enableRowSelection: v.enableRowSelection,
          bulkActions: v.enableRowSelection
            ? expr('(rows) => <Button size="sm" variant="outline">Require passkey</Button>')
            : undefined,
          enableDensity: v.enableDensity,
          enableExport: v.enableExport,
          exportFilename: v.enableExport ? "acme-india-users.csv" : undefined,
          enableColumnResizing: v.enableColumnResizing,
          busy: v.state === "busy",
          loading: v.state === "loading",
          error: v.state === "error" ? "Could not load users from Qeet ID. Try again." : undefined,
          pageSize: v.pageSize === 10 ? undefined : v.pageSize,
        }),
    }),
  },
};
