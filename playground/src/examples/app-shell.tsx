import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  Avatar,
  AvatarFallback,
  Button,
  IconButton,
  Input,
  PageHeader,
  QeetLogo,
  Separator,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  type StatusKind,
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@qeetrix/ui";
import {
  BellIcon,
  DownloadIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  PlusIcon,
  ReceiptIndianRupeeIcon,
  SearchIcon,
  SettingsIcon,
  Undo2Icon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { useState } from "react";
import {
  dateFormat,
  formatInr,
  type InvoiceStatus,
  invoices,
  invoiceTotals,
  type LogLevel,
  logEvents,
} from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/* ── Qeet Pay console sample ──────────────────────────────────────────────────────────────── */

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const overdue = invoices.filter((invoice) => invoice.status === "overdue").length;

const payNav: readonly NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboardIcon },
  { id: "payments", label: "Payments", icon: WalletIcon },
  { id: "invoices", label: "Invoices", icon: ReceiptIndianRupeeIcon, badge: String(overdue) },
  { id: "customers", label: "Customers", icon: UsersIcon },
  { id: "settlements", label: "Settlements", icon: LandmarkIcon },
  { id: "refunds", label: "Refunds", icon: Undo2Icon },
];

const invoiceStatus: Record<InvoiceStatus, { kind: StatusKind; label: string }> = {
  paid: { kind: "success", label: "Paid" },
  sent: { kind: "info", label: "Sent" },
  overdue: { kind: "danger", label: "Overdue" },
  draft: { kind: "muted", label: "Draft" },
  void: { kind: "neutral", label: "Void" },
};

/** The library's desktop sidebar is `fixed` to the viewport; in a bounded demo it is pinned
 * to the shell instead, so the preview never covers the page around it. */
const contained = "absolute h-full";

function PaySidebar({
  collapsible,
  active,
  onSelect,
}: {
  collapsible: "offcanvas" | "icon" | "none";
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Sidebar collapsible={collapsible} className={collapsible === "none" ? "border-e" : contained}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <QeetLogo title={null} className="size-8! shrink-0" />
              <span className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate text-sm font-semibold">Qeet Pay</span>
                <span className="truncate text-caption text-muted-foreground">Live mode</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Billing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {payNav.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={active === item.id}
                      onClick={() => onSelect(item.id)}
                    >
                      <Icon aria-hidden />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <SettingsIcon aria-hidden />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {collapsible !== "none" && <SidebarRail />}
    </Sidebar>
  );
}

function InvoiceTable() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead className="hidden md:table-cell">Customer</TableHead>
            <TableHead className="hidden lg:table-cell">Issued</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-end">Total (incl. GST)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const status = invoiceStatus[invoice.status];
            return (
              <TableRow key={invoice.number}>
                <TableCell className="font-mono text-caption">{invoice.number}</TableCell>
                <TableCell className="hidden md:table-cell">{invoice.customer}</TableCell>
                <TableCell className="hidden text-muted-foreground lg:table-cell">
                  {dateFormat.format(new Date(invoice.issued))}
                </TableCell>
                <TableCell>
                  <StatusPill kind={status.kind}>{status.label}</StatusPill>
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {formatInr(invoiceTotals(invoice).total)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ConsoleHeader({
  title,
  withTrigger = false,
  className,
}: {
  title: string;
  withTrigger?: boolean;
  className?: string;
}) {
  return (
    <AppShellHeader className={className}>
      {withTrigger && <SidebarTrigger />}
      {withTrigger && <Separator orientation="vertical" className="h-4" />}
      <span className="truncate text-sm font-medium">{title}</span>
      <div className="ms-auto flex items-center gap-2">
        <div className="relative hidden sm:block">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute inset-s-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Search invoices, customers and payments"
            placeholder="Search Qeet Pay…"
            className="w-56 ps-8"
          />
        </div>
        <IconButton icon={BellIcon} aria-label="Notifications" />
        <Avatar size="sm">
          <AvatarFallback>VS</AvatarFallback>
        </Avatar>
      </div>
    </AppShellHeader>
  );
}

interface PayConsoleProps {
  title?: string;
  /** Sidebar beside the page (`SidebarInset` column) or a header above everything. */
  layout?: "sidebar" | "header";
  collapsible?: "offcanvas" | "icon" | "none";
  defaultOpen?: boolean;
  stickyHeader?: boolean;
  height?: string;
}

function PayPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader
        title={title}
        description="Tax invoices issued from Acme India Pvt Ltd (GSTIN 29AAACA1234F1Z5). Intra-state invoices split CGST + SGST; inter-state ones charge IGST."
        actions={
          <>
            <Button variant="outline">
              <DownloadIcon data-icon="inline-start" aria-hidden />
              Export
            </Button>
            <Button>
              <PlusIcon data-icon="inline-start" aria-hidden />
              New invoice
            </Button>
          </>
        }
      />
      <InvoiceTable />
    </>
  );
}

/**
 * The Qeet Pay console in either documented arrangement:
 *
 * - `sidebar`: SidebarProvider renders the row, `SidebarInset` (the `<main>`) is the column, and
 *   `AppShellContent render={<div />}` keeps the page to one main landmark.
 * - `header`: `AppShell` → `AppShellMain` → `AppShellHeader` + `AppShellContent` (the `<main>`).
 */
function PayConsole({
  title,
  layout = "sidebar",
  collapsible = "icon",
  defaultOpen = true,
  stickyHeader = true,
  height = "h-[520px]",
}: PayConsoleProps) {
  const [active, setActive] = useState("invoices");
  const label = payNav.find((item) => item.id === active)?.label ?? "Invoices";
  const pageTitle = title ?? label;
  const headerClass = stickyHeader ? undefined : "static";
  if (layout === "header") {
    return (
      <div className={`${height} w-full overflow-hidden rounded-lg border bg-background`}>
        <AppShell className="h-full min-h-0">
          <AppShellMain>
            <ConsoleHeader title={`Qeet Pay / ${pageTitle}`} className={headerClass} />
            <AppShellContent className="flex flex-col gap-6">
              <PayPage title={pageTitle} />
            </AppShellContent>
          </AppShellMain>
        </AppShell>
      </div>
    );
  }
  return (
    <div className={`${height} w-full overflow-hidden rounded-lg border bg-background`}>
      <SidebarProvider defaultOpen={defaultOpen} className="relative h-full min-h-0">
        <PaySidebar collapsible={collapsible} active={active} onSelect={setActive} />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <ConsoleHeader
            title={`Qeet Pay / ${pageTitle}`}
            withTrigger={collapsible !== "none"}
            className={headerClass}
          />
          <AppShellContent render={<div />} className="flex flex-col gap-6">
            <PayPage title={pageTitle} />
          </AppShellContent>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

/* ── Header-only shell: Qeet Notify hosted preferences ────────────────────────────────────── */

const channels = [
  { id: "email", label: "Email", detail: "rohan.mehta@acme.in", on: true },
  { id: "sms", label: "SMS", detail: "+91 98450 12345 · DLT registered", on: true },
  { id: "whatsapp", label: "WhatsApp", detail: "Order and payment updates", on: false },
  { id: "push", label: "Push", detail: "Qeet ID Authenticator on iPhone 17", on: true },
];

function TopNavShell() {
  return (
    <div className="h-[380px] w-full overflow-hidden rounded-lg border bg-background">
      <AppShell className="h-full min-h-0">
        <AppShellMain>
          <AppShellHeader>
            <QeetLogo title={null} className="size-6 shrink-0" />
            <span className="text-sm font-semibold">Qeet Notify</span>
            <nav aria-label="Account" className="ms-4 hidden items-center gap-1 sm:flex">
              <Button variant="ghost" size="sm" aria-current="page">
                Preferences
              </Button>
              <Button variant="ghost" size="sm">
                History
              </Button>
            </nav>
            <Button variant="outline" size="sm" className="ms-auto">
              Unsubscribe from all
            </Button>
          </AppShellHeader>
          <AppShellContent>
            <div className="mx-auto flex max-w-xl flex-col gap-4">
              <div>
                <h2 className="font-heading text-heading font-semibold">Where we reach you</h2>
                <p className="text-sm text-muted-foreground">
                  Security alerts always go to email and push, whatever you choose here.
                </p>
              </div>
              <ul className="divide-y rounded-lg border bg-card">
                {channels.map((channel) => (
                  <li key={channel.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{channel.label}</p>
                      <p className="truncate text-caption text-muted-foreground">
                        {channel.detail}
                      </p>
                    </div>
                    <StatusPill kind={channel.on ? "success" : "muted"}>
                      {channel.on ? "On" : "Off"}
                    </StatusPill>
                  </li>
                ))}
              </ul>
            </div>
          </AppShellContent>
        </AppShellMain>
      </AppShell>
    </div>
  );
}

/* ── Static sidebar + scrolling content: Qeet Logs live tail ──────────────────────────────── */

const levelKind: Record<LogLevel, StatusKind> = {
  debug: "muted",
  info: "info",
  warn: "warning",
  error: "danger",
};

const timeFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function LogsShell() {
  const [active, setActive] = useState("live");
  const views = [
    { id: "live", label: "Live tail" },
    { id: "errors", label: "Errors" },
    { id: "traces", label: "Traces" },
    { id: "alerts", label: "Alerts" },
  ];
  // Three passes of the sample stream, so the content region has something to scroll.
  const lines = [0, 1, 2].flatMap((pass) =>
    logEvents.map((event) => ({ ...event, key: `${pass}-${event.id}` })),
  );
  return (
    <div className="h-[400px] w-full overflow-hidden rounded-lg border bg-background">
      <SidebarProvider className="h-full min-h-0">
        <AppShell className="h-full min-h-0">
          <Sidebar collapsible="none" className="hidden border-e md:flex">
            <SidebarHeader>
              <span className="px-2 pt-1 text-sm font-semibold">Qeet Logs</span>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Explore</SidebarGroupLabel>
                <SidebarMenu>
                  {views.map((view) => (
                    <SidebarMenuItem key={view.id}>
                      <SidebarMenuButton
                        isActive={active === view.id}
                        onClick={() => setActive(view.id)}
                      >
                        <span>{view.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <AppShellMain>
            <AppShellHeader>
              <span className="text-sm font-medium">
                {views.find((view) => view.id === active)?.label}
              </span>
              <span className="text-caption text-muted-foreground">ap-south-1 · last 15 min</span>
            </AppShellHeader>
            <AppShellContent className="p-0 md:p-0">
              <ol className="divide-y font-mono text-caption">
                {lines.map((line) => (
                  <li key={line.key} className="flex items-start gap-3 px-4 py-2">
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {timeFormat.format(new Date(line.timestamp))}
                    </span>
                    <StatusPill kind={levelKind[line.level]} dot={false}>
                      {line.level.toUpperCase()}
                    </StatusPill>
                    <span className="min-w-0">
                      <span className="text-muted-foreground">{line.service} </span>
                      {line.message}
                    </span>
                  </li>
                ))}
              </ol>
            </AppShellContent>
          </AppShellMain>
        </AppShell>
      </SidebarProvider>
    </div>
  );
}

/* ── Playground ───────────────────────────────────────────────────────────────────────────── */

const shellControls = {
  layout: select(["sidebar", "header"] as const, "sidebar", "Arrangement"),
  title: text("Invoices", "Page title"),
  collapsible: select(["icon", "offcanvas", "none"] as const, "icon", "Sidebar collapsible"),
  defaultOpen: bool(true, "Sidebar open (defaultOpen)"),
  stickyHeader: bool(true, "Sticky header"),
};

export const examples: FamilyExamples = {
  "app-shell": {
    framed: true,
    layout: "wide",
    minHeight: 1960,
    demos: [
      {
        name: "Console with sidebar",
        description:
          "Sidebar beside the page: `SidebarInset` is the column and the `<main>`, so the content region renders as a plain element with `AppShellContent render={<div />}`. The header is sticky over the scrolling content.",
        render: () => <PayConsole />,
      },
      {
        name: "Header above everything",
        description:
          "`AppShell` → `AppShellMain` → `AppShellHeader` + `AppShellContent`, which is the `<main>` landmark here.",
        render: () => <PayConsole layout="header" height="h-[440px]" />,
      },
      {
        name: "Hosted page",
        description:
          "Hosted pages without navigation chrome — here Qeet Notify's preference centre — use the header and content alone.",
        render: () => <TopNavShell />,
      },
      {
        name: "Static sidebar, scrolling content",
        description:
          'A `collapsible="none"` sidebar never moves; only the content region scrolls under the sticky header.',
        render: () => <LogsShell />,
      },
    ],
    playground: definePlayground({
      controls: shellControls,
      render: (v) => (
        <PayConsole
          key={`${v.layout}-${v.defaultOpen}-${v.collapsible}`}
          layout={v.layout}
          title={v.title}
          collapsible={v.collapsible}
          defaultOpen={v.defaultOpen}
          stickyHeader={v.stickyHeader}
        />
      ),
      code: (v) => {
        const header = (trigger: boolean) =>
          jsx("AppShellHeader", { className: v.stickyHeader ? undefined : "static" }, [
            trigger ? "<SidebarTrigger />" : "",
            `<span className="text-sm font-medium">${v.title}</span>`,
          ]);
        const page = jsx("PageHeader", {
          title: v.title,
          actions: expr("<Button>New invoice</Button>"),
        });
        if (v.layout === "header") {
          return jsx("AppShell", {}, [
            jsx("AppShellMain", {}, [header(false), jsx("AppShellContent", {}, [page])]),
          ]);
        }
        return jsx("SidebarProvider", { defaultOpen: v.defaultOpen ? undefined : expr("false") }, [
          jsx(
            "Sidebar",
            { collapsible: v.collapsible === "offcanvas" ? undefined : v.collapsible },
            [
              "<SidebarHeader>{/* brand */}</SidebarHeader>",
              "<SidebarContent>{/* nav groups */}</SidebarContent>",
              v.collapsible === "none" ? "" : "<SidebarRail />",
            ],
          ),
          jsx("SidebarInset", {}, [
            header(v.collapsible !== "none"),
            jsx("AppShellContent", { render: expr("<div />") }, [page]),
          ]),
        ]);
      },
    }),
  },
};
