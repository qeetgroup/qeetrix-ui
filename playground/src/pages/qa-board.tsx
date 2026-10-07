import {
  BadgeCheckIcon,
  CircleAlertIcon,
  CopyIcon,
  EllipsisIcon,
  FileTextIcon,
  FingerprintPatternIcon,
  InboxIcon,
  InfoIcon,
  KeyRoundIcon,
  PencilIcon,
  ShieldCheckIcon,
  TrashIcon,
  TriangleAlertIcon,
  UserPlusIcon,
  UsersIcon,
  WebhookIcon,
} from "@qeetrix/icons";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  AppShellHeader,
  AreaChart,
  Avatar,
  AvatarFallback,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type ChartConfig,
  CodeBlock,
  type ColumnDef,
  DataTable,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  Kbd,
  PageHeader,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  QeetLogo,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sidebar,
  SidebarContent,
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
  Skeleton,
  type StatusKind,
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from "@qeetrix/ui";
import { type ReactNode, useEffect, useRef } from "react";
import {
  formatInr,
  type InvoiceStatus,
  invoices,
  invoiceTotals,
  monthlyRevenue,
  paymentWebhook,
  type User,
  users,
} from "../data/qeet";
import { parseFrameHash } from "../lib/frame";
import { PreviewFrame } from "../shell/preview-frame";

/**
 * The visual QA board. It renders inside a frame per theme (and density) and uses every
 * component exactly as a consumer would — no restyling — so the panes judge the token
 * foundation and nothing else. Overlays that need a viewport of their own (dialog, popover,
 * dropdown, tooltip, select, toast) are shown open in small nested frames.
 */

function Item({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={className}>
      <h3 className="mb-2 font-ui text-micro font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ShellSample() {
  const nav = [
    { label: "Users", icon: UsersIcon, active: true, badge: "1,842" },
    { label: "Passkeys", icon: FingerprintPatternIcon },
    { label: "API keys", icon: KeyRoundIcon },
    { label: "Webhooks", icon: WebhookIcon },
  ];
  return (
    <div className="overflow-hidden rounded-xl border">
      <SidebarProvider className="h-[340px] min-h-0">
        <Sidebar collapsible="none" className="border-e">
          <SidebarHeader>
            <div className="flex items-center gap-2 px-1.5 py-1">
              <QeetLogo className="size-6 rounded-md" aria-hidden />
              <span className="text-sm font-semibold">Acme India</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Directory</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton isActive={item.active}>
                        <item.icon aria-hidden />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="min-w-0">
          <AppShellHeader className="static h-12">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#directory" onClick={(event) => event.preventDefault()}>
                    Directory
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Users</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </AppShellHeader>
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm text-muted-foreground">1,842 people in Acme India Pvt Ltd.</p>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "User",
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        <Avatar size="sm">
          <AvatarFallback>{row.original.initials}</AvatarFallback>
        </Avatar>
        <span className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </span>
      </span>
    ),
  },
  { accessorKey: "role", header: "Role" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusPill status={row.original.status} />,
  },
];

/**
 * The focus-state input. Only one document can hold focus at a time, so the QA page focuses it
 * in the pane a reviewer picks ("Show focus state") rather than racing two frames for it.
 */
function FocusedInput() {
  return (
    <FieldControl render={<Input defaultValue="rohan.mehta@acme.in" data-pg-focus-target="" />} />
  );
}

const invoiceKind: Record<InvoiceStatus, StatusKind> = {
  paid: "success",
  sent: "info",
  overdue: "danger",
  draft: "muted",
  void: "neutral",
};

const revenueConfig = {
  collected: { label: "Collected", color: "var(--chart-1)" },
  invoiced: { label: "Invoiced", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function QaBoard() {
  const theme = parseFrameHash(window.location.hash)?.env;
  const sampleEnv =
    theme ??
    ({ theme: "light", density: "comfortable", dir: "ltr", motion: "full", bg: "canvas" } as const);
  const sample = (id: string, height: number, title: string) => (
    <PreviewFrame
      route={{ kind: "qa-sample", id }}
      env={{ ...sampleEnv, bg: "canvas" }}
      height={height}
      title={title}
      className="overflow-hidden rounded-xl border"
    />
  );
  return (
    <div className="flex flex-col gap-8 p-6 text-foreground">
      <Item title="Application shell · sidebar with selected item">
        <ShellSample />
      </Item>

      <Item title="Page header">
        <PageHeader
          breadcrumb="Qeet Pay · Billing"
          title="Invoices"
          description="Tax invoices issued to Acme India Pvt Ltd, with CGST, SGST and IGST split by place of supply."
          actions={
            <>
              <Button variant="outline">Export CSV</Button>
              <Button>New invoice</Button>
            </>
          }
        />
      </Item>

      <div className="grid gap-6 lg:grid-cols-2">
        <Item title="Card">
          <Card>
            <CardHeader>
              <CardTitle>Enterprise plan</CardTitle>
              <CardDescription>Renews on 1 Apr 2027 · 2,000 seats</CardDescription>
              <CardAction>
                <Badge variant="success">Active</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              1,842 of 2,000 seats used. Passkeys enforced for admins since 14 Sep.
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button variant="ghost" size="sm">
                View usage
              </Button>
              <Button size="sm">Add seats</Button>
            </CardFooter>
          </Card>
        </Item>
        <Item title="Tabs · selected">
          <Tabs defaultValue="sessions">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="audit">Audit log</TabsTrigger>
              <TabsTrigger value="danger" disabled>
                Danger zone
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="text-sm text-muted-foreground">
              Account overview.
            </TabsContent>
            <TabsContent value="sessions" className="text-sm text-muted-foreground">
              4 active sessions across 3 devices. The current one is a MacBook Pro in Bengaluru.
            </TabsContent>
            <TabsContent value="audit" className="text-sm text-muted-foreground">
              Audit events.
            </TabsContent>
          </Tabs>
        </Item>
      </div>

      <Item title="Inputs · default, focus, invalid, disabled">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Company name</FieldLabel>
            <FieldControl render={<Input placeholder="Acme India Pvt Ltd" />} />
            <FieldDescription>Shown on tax invoices.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Work email (focus)</FieldLabel>
            <FocusedInput />
          </Field>
          <Field>
            <FieldLabel>GSTIN</FieldLabel>
            <FieldControl render={<Input defaultValue="29AAACA1234F1Z" aria-invalid />} />
            <FieldError>GSTIN must be 15 characters.</FieldError>
          </Field>
          <Field>
            <FieldLabel>Tenant ID</FieldLabel>
            <FieldControl render={<Input defaultValue="tnt_acme" disabled />} />
          </Field>
        </div>
      </Item>

      <div className="grid gap-6 lg:grid-cols-2">
        <Item title="Select · closed">
          <Select defaultValue="admin">
            <SelectTrigger aria-label="Role" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
            </SelectContent>
          </Select>
        </Item>
        <Item title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Item>
      </div>

      <Item title="Table · footer and selected row">
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-end">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.slice(0, 4).map((invoice, index) => (
                <TableRow key={invoice.number} data-state={index === 1 ? "selected" : undefined}>
                  <TableCell className="font-mono text-xs">{invoice.number}</TableCell>
                  <TableCell>{invoice.customer}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {formatInr(invoiceTotals(invoice).total)}
                  </TableCell>
                  <TableCell>
                    <StatusPill kind={invoiceKind[invoice.status]}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </StatusPill>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Total, 4 invoices</TableCell>
                <TableCell className="text-end tabular-nums">
                  {formatInr(
                    invoices
                      .slice(0, 4)
                      .reduce((sum, invoice) => sum + invoiceTotals(invoice).total, 0),
                  )}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Item>

      <Item title="Data table · selected row">
        <DataTable
          columns={userColumns}
          data={users.slice(0, 4)}
          getRowId={(user) => user.id}
          getRowLabel={(row) => row.original.name}
          enableRowSelection
          state={{ rowSelection: { usr_02: true } }}
          enableSearch={false}
          enableColumnVisibility={false}
          pageSize={0}
          label="Users"
        />
      </Item>

      <div className="grid gap-6 sm:grid-cols-2">
        <Item title="Dialog · open">{sample("dialog", 340, "Open dialog")}</Item>
        <Item title="Popover · open">{sample("popover", 340, "Open popover")}</Item>
        <Item title="Dropdown menu · open">{sample("dropdown", 340, "Open dropdown menu")}</Item>
        <Item title="Select · open">{sample("select", 340, "Open select")}</Item>
        <Item title="Tooltip · open">{sample("tooltip", 160, "Open tooltip")}</Item>
        <Item title="Toast">{sample("toast", 160, "Toasts")}</Item>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Item title="Badges and status pills">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="muted">Muted</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatusPill status="active" />
              <StatusPill status="pending" />
              <StatusPill status="expired" />
              <StatusPill status="draft" />
              <StatusPill kind="info">Syncing</StatusPill>
            </div>
          </div>
        </Item>
        <Item title="Empty state">
          <div className="rounded-xl border border-dashed">
            <EmptyState
              icon={InboxIcon}
              title="No webhooks yet"
              description="Send payment.captured and invoice.paid events to your systems."
              action={<Button size="sm">Add endpoint</Button>}
            />
          </div>
        </Item>
      </div>

      <Item title="Alerts · every status">
        <div className="grid gap-3 lg:grid-cols-2">
          <Alert>
            <InfoIcon aria-hidden />
            <AlertTitle>Default</AlertTitle>
            <AlertDescription>Your SCIM token rotates in 30 days.</AlertDescription>
          </Alert>
          <Alert variant="info">
            <InfoIcon aria-hidden />
            <AlertTitle>Scheduled maintenance</AlertTitle>
            <AlertDescription>ap-south-1, Sunday 02:00–02:30 IST.</AlertDescription>
          </Alert>
          <Alert variant="success">
            <BadgeCheckIcon aria-hidden />
            <AlertTitle>Domain verified</AlertTitle>
            <AlertDescription>acme.in now routes sign-ins to Qeet ID.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <TriangleAlertIcon aria-hidden />
            <AlertTitle>GSTR-1 due in 3 days</AlertTitle>
            <AlertDescription>Two invoices are missing a place of supply.</AlertDescription>
          </Alert>
          <Alert variant="destructive" className="lg:col-span-2">
            <CircleAlertIcon aria-hidden />
            <AlertTitle>Settlement failed</AlertTitle>
            <AlertDescription>
              HDFC rejected NEFT batch 88213: beneficiary account closed.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive" emphasis="strong" className="lg:col-span-2">
            <CircleAlertIcon aria-hidden />
            <AlertTitle>Account suspended</AlertTitle>
            <AlertDescription>
              Payouts are paused until the KYC review is complete. Strong emphasis — blocking only.
            </AlertDescription>
          </Alert>
        </div>
      </Item>

      <div className="grid gap-6 lg:grid-cols-2">
        <Item title="Code block">
          <CodeBlock
            language="json"
            lineNumbers
            caption="payment.captured"
            value={JSON.stringify(paymentWebhook.data.payment, null, 2)}
            maxHeight="max-h-72"
          />
        </Item>
        <Item title="Chart">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Collections</CardTitle>
              <CardDescription>Collected vs invoiced, last 12 months (₹)</CardDescription>
            </CardHeader>
            <CardContent>
              <AreaChart
                data={monthlyRevenue.map((month) => ({ ...month }))}
                config={revenueConfig}
                categoryKey="month"
                dataKeys={["invoiced", "collected"]}
                showLegend
                className="aspect-[16/9]"
                accessibleTitle="Collections, last 12 months"
              />
            </CardContent>
          </Card>
        </Item>
      </div>

      <Item title="Loading skeleton">
        <div className="flex flex-col gap-3 rounded-xl border p-4">
          {["a", "b", "c"].map((key) => (
            <div key={key} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </Item>
    </div>
  );
}

/* ── Open-overlay samples, each in its own small frame ───────────────────────────────────── */

function noop() {}

function DialogSample() {
  return (
    <div className="p-4">
      <Button variant="outline">Invite member</Button>
      <Dialog open onOpenChange={noop}>
        <DialogContent initialFocus={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke API key?</DialogTitle>
            <DialogDescription>
              Checkout service (prod) will stop authenticating immediately. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
            qk_live_7Hc2••••Fa0
          </code>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button variant="destructive">
              <TrashIcon data-icon="inline-start" aria-hidden />
              Revoke key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PopoverSample() {
  return (
    <div className="p-4">
      <Popover open onOpenChange={noop}>
        <PopoverTrigger render={<Button variant="outline">Share invoice</Button>} />
        <PopoverContent align="start" initialFocus={false}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <PopoverTitle>Share QP-INV-2026-00412</PopoverTitle>
              <PopoverDescription>
                Anyone with the link can view and pay this invoice.
              </PopoverDescription>
            </div>
            <div className="flex gap-2">
              <Input aria-label="Invoice link" readOnly defaultValue="pay.qeet.in/i/7Hc2Yt9m" />
              <Button size="icon" variant="outline" aria-label="Copy link">
                <CopyIcon aria-hidden />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function DropdownSample() {
  return (
    <div className="p-4">
      <DropdownMenu open onOpenChange={noop} modal={false}>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon" aria-label="Actions for Rohan Mehta">
              <EllipsisIcon aria-hidden />
            </Button>
          }
        />
        <DropdownMenuContent className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Rohan Mehta</DropdownMenuLabel>
            <DropdownMenuItem>
              <PencilIcon aria-hidden />
              Edit role
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ShieldCheckIcon aria-hidden />
              Reset MFA
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuCheckboxItem checked>Admin notifications</DropdownMenuCheckboxItem>
          <DropdownMenuItem disabled>
            <UserPlusIcon aria-hidden />
            Transfer ownership
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <TrashIcon aria-hidden />
            Suspend user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SelectSample() {
  return (
    <div className="p-4">
      <Select defaultValue="developer" open onOpenChange={noop}>
        <SelectTrigger aria-label="Role" className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value="owner">Owner</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="developer">Developer</SelectItem>
          <SelectItem value="billing">Billing</SelectItem>
          <SelectItem value="auditor" disabled>
            Auditor (needs SSO)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function TooltipSample() {
  return (
    <div className="flex justify-center px-4 pt-14">
      <Tooltip open onOpenChange={noop}>
        <TooltipTrigger
          render={
            <Button variant="outline" size="icon" aria-label="Download invoice PDF">
              <FileTextIcon aria-hidden />
            </Button>
          }
        />
        <TooltipContent>
          Download PDF <Kbd>⌘D</Kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function ToastSample() {
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast.success("Invoice QP-INV-2026-00411 paid", {
      description: "₹13,86,500 received via NACH.",
      timeout: 0,
    });
  }, []);
  return <div className="h-full" />;
}

const samples: Record<string, () => ReactNode> = {
  dialog: () => <DialogSample />,
  popover: () => <PopoverSample />,
  dropdown: () => <DropdownSample />,
  select: () => <SelectSample />,
  tooltip: () => <TooltipSample />,
  toast: () => <ToastSample />,
};

export function QaSample({ id }: { id: string }) {
  const render = samples[id];
  return render ? render() : <p className="p-4 text-sm">Unknown sample “{id}”.</p>;
}
