import {
  BanknoteIcon,
  CalendarClockIcon,
  FileTextIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  PlusIcon,
  ReceiptIndianRupeeIcon,
  RepeatIcon,
  UsersIcon,
  WalletIcon,
} from "@qeetrix/icons";
import {
  AreaChart,
  Banner,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type ChartConfig,
  ChartDataTable,
  type ColumnDef,
  DataTable,
  DonutChart,
  PageHeader,
  Stat,
  type StatusKind,
  StatusPill,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@qeetrix/ui";
import {
  dateFormat,
  formatInr,
  formatInrCompact,
  type Invoice,
  type InvoiceStatus,
  invoices,
  invoiceTotals,
  monthlyRevenue,
  paymentMethods,
} from "../../data/qeet";
import { matchesAny } from "../../lib/table";
import { ConsoleFrame } from "./console-frame";

const statusKind: Record<InvoiceStatus, StatusKind> = {
  paid: "success",
  sent: "info",
  overdue: "danger",
  draft: "muted",
  void: "neutral",
};

interface InvoiceRow extends Invoice {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

const rows: InvoiceRow[] = invoices.map((invoice) => ({ ...invoice, ...invoiceTotals(invoice) }));

const money = (value: number) => (
  <span className="block text-end tabular-nums">{value ? formatInr(value) : "—"}</span>
);

const columns: ColumnDef<InvoiceRow>[] = [
  {
    accessorKey: "number",
    header: "Invoice",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.number}</span>,
  },
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="font-medium">{row.original.customer}</span>
        <span className="font-mono text-xs text-muted-foreground">GSTIN {row.original.gstin}</span>
      </span>
    ),
  },
  {
    accessorKey: "due",
    header: "Due",
    cell: ({ row }) => dateFormat.format(new Date(row.original.due)),
  },
  {
    accessorKey: "subtotal",
    header: () => <span className="block text-end">Taxable</span>,
    cell: ({ row }) => money(row.original.subtotal),
  },
  {
    accessorKey: "cgst",
    header: () => <span className="block text-end">CGST</span>,
    cell: ({ row }) => money(row.original.cgst),
  },
  {
    accessorKey: "sgst",
    header: () => <span className="block text-end">SGST</span>,
    cell: ({ row }) => money(row.original.sgst),
  },
  {
    accessorKey: "igst",
    header: () => <span className="block text-end">IGST</span>,
    cell: ({ row }) => money(row.original.igst),
  },
  {
    accessorKey: "total",
    header: () => <span className="block text-end">Total</span>,
    cell: ({ row }) => (
      <span className="block text-end font-medium tabular-nums">
        {formatInr(row.original.total)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: matchesAny,
    cell: ({ row }) => (
      <StatusPill kind={statusKind[row.original.status]}>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </StatusPill>
    ),
  },
  {
    accessorKey: "method",
    header: "Paid via",
    cell: ({ row }) => row.original.method ?? <span className="text-muted-foreground">—</span>,
  },
];

const revenueConfig = {
  invoiced: { label: "Invoiced", color: "var(--chart-2)" },
  collected: { label: "Collected", color: "var(--chart-1)" },
} satisfies ChartConfig;

const methodConfig = Object.fromEntries(
  paymentMethods.map((method, index) => [
    method.key,
    { label: method.method, color: `var(--chart-${index + 1})` },
  ]),
) satisfies ChartConfig;

const revenueData = monthlyRevenue.map((month) => ({
  month: month.month,
  invoiced: month.invoiced / 100000,
  collected: month.collected / 100000,
}));

export function QeetPayInvoicesPattern() {
  const outstanding = rows.filter((row) => row.status === "sent" || row.status === "overdue");
  const overdue = rows.filter((row) => row.status === "overdue");
  const gstPayable = rows
    .filter((row) => row.status !== "void" && row.status !== "draft")
    .reduce((sum, row) => sum + row.cgst + row.sgst + row.igst, 0);
  return (
    <ConsoleFrame
      product="Qeet Pay"
      tenant="Acme India Pvt Ltd"
      crumbs={["Acme India", "Billing", "Invoices"]}
      nav={[
        { label: "Overview", items: [{ label: "Home", icon: LayoutDashboardIcon }] },
        {
          label: "Billing",
          items: [
            {
              label: "Invoices",
              icon: FileTextIcon,
              active: true,
              badge: String(outstanding.length),
            },
            { label: "Payments", icon: WalletIcon },
            { label: "Subscriptions", icon: RepeatIcon },
            { label: "Customers", icon: UsersIcon },
          ],
        },
        {
          label: "Finance",
          items: [
            { label: "Settlements", icon: LandmarkIcon },
            { label: "GST returns", icon: ReceiptIndianRupeeIcon },
          ],
        },
      ]}
    >
      <Banner variant="warning" className="-mx-4 -mt-4 w-auto md:-mx-6 md:-mt-6">
        GSTR-1 for September is due on 11 Oct. Two invoices are missing a place of supply.{" "}
        <a href="https://services.gst.gov.in/services/login" target="_blank" rel="noreferrer">
          Open the GST portal
        </a>
      </Banner>
      <PageHeader
        title="Invoices"
        description="Tax invoices for Acme India Pvt Ltd (GSTIN 29AAACA1234F1Z5). Intra-state supplies split CGST + SGST; inter-state supplies charge IGST."
        actions={
          <>
            <Tabs defaultValue="month">
              <TabsList aria-label="Period">
                <TabsTrigger value="month">This month</TabsTrigger>
                <TabsTrigger value="quarter">Quarter</TabsTrigger>
                <TabsTrigger value="fy">FY 26–27</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button>
              <PlusIcon data-icon="inline-start" aria-hidden />
              New invoice
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label="Collected (Oct)"
          value={formatInrCompact(monthlyRevenue.at(-1)?.collected ?? 0)}
          delta="+12.4%"
          trend="up"
          icon={BanknoteIcon}
          hint="Month to date, vs ₹19.2L last October"
        />
        <Stat
          label="Outstanding"
          value={formatInr(outstanding.reduce((sum, row) => sum + row.total, 0))}
          hint={`${outstanding.length} invoices awaiting payment`}
          icon={CalendarClockIcon}
        />
        <Stat
          label="Overdue"
          value={formatInr(overdue.reduce((sum, row) => sum + row.total, 0))}
          delta={`${overdue.length} invoices`}
          trend="down"
          icon={ReceiptIndianRupeeIcon}
          hint="Oldest is 41 days past issue"
        />
        <Stat
          label="GST payable"
          value={formatInr(gstPayable)}
          hint="Output tax, current period"
          icon={LandmarkIcon}
        />
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Collections</CardTitle>
            <CardDescription>Invoiced vs collected, ₹ lakh, Nov 2025 – Oct 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              data={revenueData}
              config={revenueConfig}
              categoryKey="month"
              dataKeys={["invoiced", "collected"]}
              showLegend
              showYAxis
              className="aspect-auto h-64"
              accessibleTitle="Invoiced and collected, last 12 months"
              accessibleDescription="Monthly totals in lakh rupees."
              accessibleSummary="Collections grew from ₹38.4 lakh in November to ₹67.4 lakh in September; October is month to date."
              accessibilityTable={
                <ChartDataTable
                  caption="Invoiced and collected, ₹ lakh"
                  data={revenueData}
                  columns={[
                    { key: "month", header: "Month" },
                    { key: "invoiced", header: "Invoiced" },
                    { key: "collected", header: "Collected" },
                  ]}
                />
              }
            />
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
            <CardDescription>Share of October volume</CardDescription>
            <CardAction>
              <span className="text-sm font-medium tabular-nums">
                {formatInrCompact(paymentMethods.reduce((sum, method) => sum + method.volume, 0))}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <DonutChart
              data={paymentMethods.map((method) => ({ ...method }))}
              config={methodConfig}
              dataKey="share"
              nameKey="key"
              className="mx-auto w-full max-w-44"
              accessibleTitle="Payment method share"
              accessibleSummary="UPI 46%, cards 22%, net banking 17%, NACH 15%."
            />
            <ul className="flex flex-col gap-1.5 text-sm">
              {paymentMethods.map((method, index) => (
                <li key={method.key} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: `var(--chart-${index + 1})` }}
                  />
                  <span className="flex-1">{method.method}</span>
                  <span className="tabular-nums text-muted-foreground">{method.share}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.number}
        getRowLabel={(row) => row.original.number}
        caption="Invoices"
        searchPlaceholder="Search invoice, customer or GSTIN…"
        facetedFilters={[
          {
            columnId: "status",
            title: "Status",
            options: (["paid", "sent", "overdue", "draft", "void"] as const).map((status) => ({
              label: status.charAt(0).toUpperCase() + status.slice(1),
              value: status,
            })),
          },
        ]}
        enableExport
        exportFilename="acme-invoices-oct-2026.csv"
        enableRowSelection
        pageSize={6}
      />
    </ConsoleFrame>
  );
}
