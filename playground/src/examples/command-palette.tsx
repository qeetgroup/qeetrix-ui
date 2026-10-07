import {
  BuildingComplexIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ReceiptIndianRupeeIcon,
  ScrollTextIcon,
  SearchIcon,
  UserPlusIcon,
  UsersIcon,
} from "@qeetrix/icons";
import { Button, CommandPalette, type CommandPaletteItem, Kbd, KbdGroup, toast } from "@qeetrix/ui";
import { useState } from "react";
import { tenants } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, text } from "../registry/types";

const icon = "size-4";

const qeetCommands: CommandPaletteItem[] = [
  {
    id: "nav-overview",
    title: "Overview",
    group: "Navigate",
    icon: <LayoutDashboardIcon className={icon} aria-hidden />,
    keywords: ["home", "dashboard"],
    shortcut: ["G", "O"],
  },
  {
    id: "nav-users",
    title: "Users",
    group: "Navigate",
    icon: <UsersIcon className={icon} aria-hidden />,
    keywords: ["people", "members", "scim"],
    shortcut: ["G", "U"],
  },
  {
    id: "nav-api-keys",
    title: "API keys",
    group: "Navigate",
    icon: <KeyRoundIcon className={icon} aria-hidden />,
    keywords: ["tokens", "secrets", "qk_live"],
    shortcut: ["G", "K"],
  },
  {
    id: "nav-audit",
    title: "Audit log",
    group: "Navigate",
    icon: <ScrollTextIcon className={icon} aria-hidden />,
    keywords: ["events", "history", "compliance"],
    shortcut: ["G", "A"],
  },
  {
    id: "nav-invoices",
    title: "Invoices · Qeet Pay",
    group: "Navigate",
    icon: <ReceiptIndianRupeeIcon className={icon} aria-hidden />,
    keywords: ["billing", "gst", "upi"],
    shortcut: ["G", "I"],
  },
  ...tenants.map((tenant) => ({
    id: `tenant-${tenant.id}`,
    title: `${tenant.name} · ${tenant.domain}`,
    group: "Tenants",
    icon: <BuildingComplexIcon className={icon} aria-hidden />,
    keywords: [tenant.id, tenant.plan, tenant.region],
  })),
  {
    id: "act-invite",
    title: "Invite member…",
    group: "Actions",
    icon: <UserPlusIcon className={icon} aria-hidden />,
    keywords: ["add user", "invite"],
    shortcut: ["⌘", "I"],
  },
  {
    id: "act-rotate",
    title: "Rotate OIDC signing key",
    group: "Actions",
    icon: <KeyRoundIcon className={icon} aria-hidden />,
    keywords: ["jwks", "rs256"],
  },
  {
    id: "act-sign-out",
    title: "Sign out",
    group: "Actions",
    icon: <LogOutIcon className={icon} aria-hidden />,
    keywords: ["logout"],
    shortcut: ["⇧", "⌘", "Q"],
  },
];

const activeTenantCommands = qeetCommands.filter(
  (item) =>
    item.group === "Tenants" &&
    tenants.some((tenant) => item.id === `tenant-${tenant.id}` && tenant.status !== "suspended"),
);

function PaletteDemo({
  items = qeetCommands,
  label = "Search console",
  placeholder,
  emptyMessage,
  showHint = true,
}: {
  items?: CommandPaletteItem[];
  label?: string;
  placeholder?: string;
  emptyMessage?: string;
  showHint?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        className="w-64 justify-between text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <SearchIcon aria-hidden />
          {label}
        </span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={items}
        placeholder={placeholder}
        emptyMessage={emptyMessage}
        showHint={showHint}
        onSelect={(item) => toast(`${item.group ?? "Command"}: ${item.title}`)}
      />
    </>
  );
}

const paletteControls = {
  placeholder: text("Search users, tenants, invoices…", "placeholder"),
  emptyMessage: text(
    "Nothing in Acme India matches. Try an email or an invoice number.",
    "emptyMessage",
  ),
  showHint: bool(true, "showHint"),
  shortcuts: bool(true, "Item shortcuts (item.shortcut)"),
};

const withoutShortcuts = qeetCommands.map(({ shortcut: _shortcut, ...item }) => item);

export const examples: FamilyExamples = {
  "command-palette": {
    demos: [
      {
        name: "Grouped commands",
        description:
          "Navigate, Tenants and Actions groups; type to filter by title, group or keywords (try “gst” or “scim”). An item's `shortcut` shows its own key binding at the end of the row (display only). ↑↓ moves, ↵ runs, Escape closes.",
        render: () => <PaletteDemo />,
      },
      {
        name: "Custom copy, no hint",
        description:
          "Placeholder and empty message replaced; the footer hint hidden for a compact palette.",
        render: () => (
          <PaletteDemo
            label="Jump to tenant"
            items={activeTenantCommands}
            placeholder="Tenant name, domain or ID…"
            emptyMessage="No tenant matches. Suspended tenants are listed under Tenants → Archived."
            showHint={false}
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: paletteControls,
      render: (v) => (
        <PaletteDemo
          items={v.shortcuts ? qeetCommands : withoutShortcuts}
          placeholder={v.placeholder}
          emptyMessage={v.emptyMessage}
          showHint={v.showHint}
        />
      ),
      code: (v) =>
        [
          "const [open, setOpen] = useState(false);",
          "",
          jsx(
            "Button",
            { variant: "outline", onClick: expr("() => setOpen(true)") },
            "Search console",
          ),
          "// Each item: { id, title, group, icon, keywords, shortcut }",
          v.shortcuts
            ? 'const commands = [{ id: "nav-users", title: "Users", group: "Navigate", shortcut: ["G", "U"] }, …];'
            : 'const commands = [{ id: "nav-users", title: "Users", group: "Navigate" }, …];',
          "",
          jsx("CommandPalette", {
            open: expr("open"),
            onOpenChange: expr("setOpen"),
            items: expr("commands"),
            onSelect: expr("(item) => router.navigate(item.payload)"),
            placeholder: v.placeholder,
            emptyMessage: v.emptyMessage,
            ...changedProps(v, paletteControls, ["showHint"]),
          }),
        ].join("\n"),
    }),
  },
};
