import {
  AppWindowIcon,
  BuildingComplexIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  FingerprintPatternIcon,
  type IconProps,
  KeyRoundIcon,
  LogOutIcon,
  MonitorSmartphoneIcon,
  PlusIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
  UsersRoundIcon,
  WebhookIcon,
} from "@qeetrix/icons";
import {
  Avatar,
  AvatarFallback,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  Skeleton,
  type StatusKind,
  StatusPill,
  useSidebar,
} from "@qeetrix/ui";
import { type ComponentType, useState } from "react";
import { apiKeys, auditRecords, sessions, tenants, users } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { NavIcon } from "../lib/nav-icon";
import { ThemedQeetLogo } from "../lib/qeet-brand";
import { bool, definePlayground, type FamilyExamples, select } from "../registry/types";

/* ── Sample console: Qeet ID admin for Acme India ─────────────────────────────────────────── */

const acme = tenants[0];
const count = new Intl.NumberFormat("en-IN");

interface NavItem {
  id: string;
  label: string;
  icon: ComponentType<IconProps<"outline">>;
  /** The icon's export name, for the generated snippet. */
  iconName: string;
  badge?: string;
  children?: readonly { id: string; label: string }[];
}

interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

const navGroups: readonly NavGroup[] = [
  {
    label: "Directory",
    items: [
      {
        id: "users",
        label: "Users",
        icon: UsersIcon,
        iconName: "UsersIcon",
        badge: count.format(acme.users),
      },
      {
        id: "groups",
        label: "Groups",
        icon: UsersRoundIcon,
        iconName: "UsersRoundIcon",
        badge: "36",
      },
      { id: "roles", label: "Roles", icon: ShieldCheckIcon, iconName: "ShieldCheckIcon" },
    ],
  },
  {
    label: "Security",
    items: [
      {
        id: "sessions",
        label: "Sessions",
        icon: MonitorSmartphoneIcon,
        iconName: "MonitorSmartphoneIcon",
        badge: String(sessions.length),
      },
      {
        id: "passkeys",
        label: "Passkeys",
        icon: FingerprintPatternIcon,
        iconName: "FingerprintPatternIcon",
      },
      { id: "audit", label: "Audit log", icon: ScrollTextIcon, iconName: "ScrollTextIcon" },
    ],
  },
  {
    label: "Developers",
    items: [
      {
        id: "applications",
        label: "Applications",
        icon: AppWindowIcon,
        iconName: "AppWindowIcon",
        children: [
          { id: "app-pay", label: "Qeet Pay console" },
          { id: "app-logs", label: "Qeet Logs" },
          { id: "app-workday", label: "Workday HR (SAML)" },
        ],
      },
      {
        id: "api-keys",
        label: "API keys",
        icon: KeyRoundIcon,
        iconName: "KeyRoundIcon",
        badge: String(apiKeys.length),
      },
      { id: "webhooks", label: "Webhooks", icon: WebhookIcon, iconName: "WebhookIcon" },
    ],
  },
];

interface PageRow {
  id: string;
  primary: string;
  secondary: string;
  kind?: StatusKind;
  label?: string;
}

interface Page {
  title: string;
  group: string;
  description: string;
  rows: readonly PageRow[];
}

const userStatus: Record<string, { kind: StatusKind; label: string }> = {
  active: { kind: "success", label: "Active" },
  pending: { kind: "warning", label: "Invited" },
  suspended: { kind: "danger", label: "Suspended" },
  inactive: { kind: "muted", label: "Inactive" },
};

const applicationRows: readonly PageRow[] = [
  {
    id: "app-pay",
    primary: "Qeet Pay console",
    secondary: "OIDC · 1,204 sign-ins today",
    kind: "success",
    label: "Live",
  },
  {
    id: "app-logs",
    primary: "Qeet Logs",
    secondary: "OIDC · 318 sign-ins today",
    kind: "success",
    label: "Live",
  },
  {
    id: "app-workday",
    primary: "Workday HR",
    secondary: "SAML 2.0 · certificate expires in 12 days",
    kind: "warning",
    label: "Expiring",
  },
];

const pages: Record<string, Page> = {
  users: {
    title: "Users",
    group: "Directory",
    description: `${count.format(acme.users)} people in ${acme.name}. Passkeys required for admins.`,
    rows: users.slice(0, 5).map((user) => ({
      id: user.id,
      primary: user.name,
      secondary: `${user.email} · ${user.role}`,
      ...userStatus[user.status],
    })),
  },
  groups: {
    title: "Groups",
    group: "Directory",
    description: "36 groups, 31 of them provisioned from Okta over SCIM.",
    rows: [
      { id: "grp_platform", primary: "Platform engineering", secondary: "48 members · SCIM" },
      { id: "grp_finance", primary: "Finance & billing", secondary: "17 members · SCIM" },
      { id: "grp_contractors", primary: "Contractors", secondary: "9 members · manual" },
    ],
  },
  roles: {
    title: "Roles",
    group: "Directory",
    description: "Six built-in roles. Custom roles are available on the Enterprise plan.",
    rows: [
      {
        id: "role_owner",
        primary: "Owner",
        secondary: "Full control, including billing and deletion",
      },
      { id: "role_admin", primary: "Admin", secondary: "Manage users, policies and applications" },
      { id: "role_dev", primary: "Developer", secondary: "Applications, API keys and webhooks" },
      { id: "role_auditor", primary: "Auditor", secondary: "Read-only access to the audit log" },
    ],
  },
  sessions: {
    title: "Sessions",
    group: "Security",
    description: "Active sessions across every device signed in to this tenant.",
    rows: sessions.map((session) => ({
      id: session.id,
      primary: `${session.device} · ${session.browser}`,
      secondary: `${session.location} · ${session.ip} · ${session.method}`,
      kind: session.current ? "success" : session.risk === "high" ? "danger" : "neutral",
      label: session.current ? "This device" : session.risk === "high" ? "High risk" : "Active",
    })),
  },
  passkeys: {
    title: "Passkeys",
    group: "Security",
    description: "1,642 of 1,842 users have at least one passkey enrolled.",
    rows: [
      { id: "pk_1", primary: "Rohan Mehta", secondary: "MacBook Pro Touch ID · iCloud Keychain" },
      { id: "pk_2", primary: "Ananya Iyer", secondary: "YubiKey 5C NFC · hardware-bound" },
      { id: "pk_3", primary: "Arjun Reddy", secondary: "Pixel 10 · Google Password Manager" },
    ],
  },
  audit: {
    title: "Audit log",
    group: "Security",
    description: "Every administrative change, retained for 400 days.",
    rows: auditRecords.slice(0, 4).map((record) => ({
      id: record.id,
      primary: `${record.actor.name} ${record.summary}`,
      secondary: `${record.action} · ${record.location}`,
      kind: record.outcome === "success" ? "success" : "danger",
      label: record.outcome === "success" ? "Success" : "Failed",
    })),
  },
  applications: {
    title: "Applications",
    group: "Developers",
    description: "Relying parties that sign users in with Qeet ID.",
    rows: applicationRows,
  },
  ...Object.fromEntries(
    applicationRows.map((row) => [
      row.id,
      {
        title: row.primary,
        group: "Applications",
        description: row.secondary,
        rows: [
          {
            id: `${row.id}-redirect`,
            primary: "Redirect URI",
            secondary: "https://console.acme.in/callback",
          },
          { id: `${row.id}-scopes`, primary: "Scopes", secondary: "openid profile email org" },
        ],
      },
    ]),
  ),
  "api-keys": {
    title: "API keys",
    group: "Developers",
    description: "Server-to-server credentials. Secrets are shown once, at creation.",
    rows: apiKeys.map((key) => ({
      id: key.id,
      primary: key.name,
      secondary: `${key.prefix}… · ${key.scopes.join(", ")}`,
      kind: "success",
      label: "Active",
    })),
  },
  webhooks: {
    title: "Webhooks",
    group: "Developers",
    description: "Endpoints notified when users, sessions or policies change.",
    rows: [
      {
        id: "wh_1",
        primary: "https://api.acme.in/hooks/qeet-id",
        secondary: "user.created, user.suspended",
        kind: "success",
        label: "Delivered",
      },
      {
        id: "wh_2",
        primary: "https://ops.acme.in/siem/ingest",
        secondary: "session.revoked, auth.login.failed",
        kind: "danger",
        label: "Failing",
      },
    ],
  },
};

/* ── Building blocks ──────────────────────────────────────────────────────────────────────── */

/** The library's desktop sidebar is `fixed` to the viewport; in a bounded demo it is pinned
 * to the frame instead, so the preview never covers the page around it. */
const contained = "absolute h-full";

function TenantSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" />}
          >
            <ThemedQeetLogo className="size-8! shrink-0" />
            <span className="grid min-w-0 flex-1 text-start leading-tight">
              <span className="truncate text-sm font-semibold">Qeet ID</span>
              <span className="truncate text-caption text-muted-foreground">{acme.name}</span>
            </span>
            <ChevronsUpDownIcon aria-hidden className="ms-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Switch tenant</DropdownMenuLabel>
              {tenants.slice(0, 4).map((tenant) => (
                <DropdownMenuItem key={tenant.id}>
                  <BuildingComplexIcon aria-hidden />
                  {tenant.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <PlusIcon aria-hidden />
              Create tenant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function UserMenu() {
  const { isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" />}
          >
            <Avatar>
              <AvatarFallback>RM</AvatarFallback>
            </Avatar>
            <span className="grid min-w-0 flex-1 text-start leading-tight">
              <span className="truncate text-sm font-medium">Rohan Mehta</span>
              <span className="truncate text-caption text-muted-foreground">
                rohan.mehta@acme.in
              </span>
            </span>
            <ChevronsUpDownIcon aria-hidden className="ms-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "bottom" : "top"} className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Signed in with a passkey</DropdownMenuLabel>
              <DropdownMenuItem>
                <SettingsIcon aria-hidden />
                Account settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FingerprintPatternIcon aria-hidden />
                Manage passkeys
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOutIcon aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

interface NavProps {
  active: string;
  onSelect: (id: string) => void;
  size: "default" | "sm" | "lg";
  showBadges: boolean;
}

function NavItemRow({ item, active, onSelect, size, showBadges }: NavProps & { item: NavItem }) {
  if (item.children) {
    return <NavSubmenu item={item} active={active} onSelect={onSelect} size={size} />;
  }
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size={size}
        tooltip={item.label}
        isActive={active === item.id}
        onClick={() => onSelect(item.id)}
      >
        <NavIcon icon={Icon} active={active === item.id} />
        <span>{item.label}</span>
      </SidebarMenuButton>
      {showBadges && item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
}

/** A parent item whose children live in a collapsible `SidebarMenuSub`. */
function NavSubmenu({
  item,
  active,
  onSelect,
  size,
}: Omit<NavProps, "showBadges"> & { item: NavItem }) {
  const children = item.children ?? [];
  // Open on mount when the current page is one of the children. The parent is not marked
  // active: it styles itself "contains current" from the active sub-item.
  const [open, setOpen] = useState(() => children.some((child) => child.id === active));
  const Icon = item.icon;
  return (
    <Collapsible open={open} onOpenChange={setOpen} render={<SidebarMenuItem />}>
      <CollapsibleTrigger render={<SidebarMenuButton size={size} tooltip={item.label} />}>
        {/* Filled while the current page is one of its children: the section you are in. */}
        <NavIcon icon={Icon} active={children.some((child) => child.id === active)} />
        <span>{item.label}</span>
        <ChevronRightIcon
          aria-hidden
          className="ms-auto transition-transform group-data-panel-open/menu-button:rotate-90 rtl:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {children.map((child) => (
            <SidebarMenuSubItem key={child.id}>
              <SidebarMenuSubButton
                render={<button type="button" className="w-full" />}
                isActive={active === child.id}
                onClick={() => onSelect(child.id)}
              >
                <span>{child.label}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ConsoleNav(props: NavProps) {
  return navGroups.map((group) => (
    <SidebarGroup key={group.label}>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      {group.label === "Developers" && (
        <SidebarGroupAction aria-label="Register application" title="Register application">
          <PlusIcon aria-hidden />
        </SidebarGroupAction>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => (
            <NavItemRow key={item.id} item={item} {...props} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ));
}

function NavSkeleton() {
  return ["Directory", "Security", "Developers"].map((label) => (
    <SidebarGroup key={label}>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {["a", "b", "c"].map((slot) => (
          <SidebarMenuItem key={slot}>
            <SidebarMenuSkeleton showIcon />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  ));
}

function ConsolePage({ id, loading }: { id: string; loading: boolean }) {
  const page = pages[id] ?? pages.users;
  if (loading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-heading font-semibold">{page.title}</h2>
        <p className="text-sm text-muted-foreground">{page.description}</p>
      </div>
      <ul className="divide-y rounded-lg border bg-card">
        {page.rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.primary}</p>
              <p className="truncate text-caption text-muted-foreground">{row.secondary}</p>
            </div>
            {row.kind && <StatusPill kind={row.kind}>{row.label}</StatusPill>}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ConsoleFrameProps {
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
  side?: "left" | "right";
  defaultOpen?: boolean;
  size?: "default" | "sm" | "lg";
  showBadges?: boolean;
  loading?: boolean;
  /** The page selected on mount. */
  initialPage?: string;
  height?: string;
}

/** A Qeet ID admin console: brand header, three nav groups, user menu, inset page. */
function ConsoleFrame({
  variant = "sidebar",
  collapsible = "icon",
  side = "left",
  defaultOpen = true,
  size = "default",
  showBadges = true,
  loading = false,
  initialPage = "users",
  height = "h-[560px]",
}: ConsoleFrameProps) {
  const [active, setActive] = useState(initialPage);
  const page = pages[active] ?? pages.users;
  const sidebar = (
    <Sidebar
      variant={variant}
      collapsible={collapsible}
      side={side}
      className={collapsible !== "none" ? contained : side === "right" ? "border-s" : "border-e"}
    >
      <SidebarHeader>
        <TenantSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {loading ? (
          <NavSkeleton />
        ) : (
          <ConsoleNav active={active} onSelect={setActive} size={size} showBadges={showBadges} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      {collapsible !== "none" && <SidebarRail />}
    </Sidebar>
  );
  return (
    <div className={`${height} w-full overflow-hidden rounded-lg border bg-background`}>
      <SidebarProvider defaultOpen={defaultOpen} className="relative h-full min-h-0">
        {side === "left" && sidebar}
        <SidebarInset className="min-w-0 overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
            {collapsible !== "none" && <SidebarTrigger />}
            {collapsible !== "none" && <Separator orientation="vertical" className="h-4" />}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden sm:inline-flex">{acme.name}</BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:inline-flex" />
                <BreadcrumbItem>{page.group}</BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{page.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <ConsolePage id={active} loading={loading} />
          </div>
        </SidebarInset>
        {side === "right" && sidebar}
      </SidebarProvider>
    </div>
  );
}

/* ── Playground ───────────────────────────────────────────────────────────────────────────── */

const sidebarControls = {
  variant: select(["sidebar", "floating", "inset"] as const, "sidebar"),
  collapsible: select(["offcanvas", "icon", "none"] as const, "icon"),
  side: select(["left", "right"] as const, "left"),
  defaultOpen: bool(true, "Open (defaultOpen)"),
  size: select(["default", "sm", "lg"] as const, "default", "Menu button size"),
  showBadges: bool(true, "Menu badges"),
  loading: bool(false, "Loading (menu skeletons)"),
};

function sidebarCode(v: {
  variant: string;
  collapsible: string;
  side: string;
  defaultOpen: boolean;
  size: string;
  showBadges: boolean;
  loading: boolean;
}): string {
  const items = navGroups[0].items.map((item, index) =>
    v.loading
      ? jsx("SidebarMenuItem", {}, [jsx("SidebarMenuSkeleton", { showIcon: true })])
      : jsx("SidebarMenuItem", {}, [
          jsx(
            "SidebarMenuButton",
            {
              size: v.size === "default" ? undefined : v.size,
              isActive: index === 0,
              tooltip: item.label,
            },
            [
              // The active item draws its filled icon (the first item's icon has one).
              `<${item.iconName} aria-hidden${index === 0 ? ' variant="filled"' : ""} />`,
              `<span>${item.label}</span>`,
            ],
          ),
          v.showBadges && item.badge ? jsx("SidebarMenuBadge", {}, item.badge) : "",
        ]),
  );
  const sidebar = jsx(
    "Sidebar",
    {
      variant: v.variant === "sidebar" ? undefined : v.variant,
      collapsible: v.collapsible === "offcanvas" ? undefined : v.collapsible,
      side: v.side === "left" ? undefined : v.side,
    },
    [
      "<SidebarHeader>{/* tenant switcher */}</SidebarHeader>",
      jsx("SidebarContent", {}, [
        jsx("SidebarGroup", {}, [
          jsx("SidebarGroupLabel", {}, "Directory"),
          jsx("SidebarGroupContent", {}, [jsx("SidebarMenu", {}, items)]),
        ]),
      ]),
      "<SidebarFooter>{/* user menu */}</SidebarFooter>",
      v.collapsible === "none" ? "" : "<SidebarRail />",
    ],
  );
  const inset = jsx("SidebarInset", {}, [
    jsx("header", { className: "flex h-12 items-center gap-2 border-b px-3" }, [
      v.collapsible === "none" ? "" : "<SidebarTrigger />",
      '<h1 className="text-sm font-medium">Users</h1>',
    ]),
    "{/* page content */}",
  ]);
  return jsx("SidebarProvider", { defaultOpen: v.defaultOpen ? undefined : expr("false") }, [
    ...(v.side === "left" ? [sidebar, inset] : [inset, sidebar]),
  ]);
}

export const examples: FamilyExamples = {
  sidebar: {
    framed: true,
    layout: "wide",
    minHeight: 3750,
    demos: [
      {
        name: "Admin console",
        description:
          "Qeet ID's console frame: tenant switcher, three nav groups with badges, a collapsible submenu and the signed-in user. Click items to move the selection; ⌘/Ctrl + B or the rail toggles the sidebar.",
        render: () => <ConsoleFrame />,
      },
      {
        name: "Current page in a submenu",
        description:
          "Only the sub-item is marked `isActive`; its parent styles itself as “contains current” on its own, and takes the full selection when the rail collapses to icons.",
        render: () => <ConsoleFrame initialPage="app-logs" height="h-[700px]" />,
      },
      {
        name: "Collapsed to icons",
        description:
          '`collapsible="icon"` with `defaultOpen={false}`: labels, badges and submenus hide, and each item shows its label as a tooltip on hover or focus.',
        render: () => <ConsoleFrame defaultOpen={false} height="h-[480px]" />,
      },
      {
        name: "Floating",
        description: "The floating variant detaches the sidebar into a raised, rounded panel.",
        render: () => <ConsoleFrame variant="floating" />,
      },
      {
        name: "Inset",
        description:
          "The inset variant sets the page on a rounded sheet inside the sidebar's surface.",
        render: () => <ConsoleFrame variant="inset" />,
      },
      {
        name: "Loading",
        description:
          "`SidebarMenuSkeleton` rows hold each group's shape while the tenant's navigation loads.",
        render: () => <ConsoleFrame loading />,
      },
    ],
    playground: definePlayground({
      controls: sidebarControls,
      render: (v) => (
        <ConsoleFrame
          key={`${v.defaultOpen}-${v.collapsible}`}
          variant={v.variant}
          collapsible={v.collapsible}
          side={v.side}
          defaultOpen={v.defaultOpen}
          size={v.size}
          showBadges={v.showBadges}
          loading={v.loading}
        />
      ),
      code: (v) => sidebarCode(v),
    }),
  },
};
