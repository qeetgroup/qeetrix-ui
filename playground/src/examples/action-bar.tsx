import {
  BanIcon,
  BellRingIcon,
  CopyIcon,
  DownloadIcon,
  KeyRoundIcon,
  LogOutIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@qeetrix/icons";
import {
  ActionBar,
  ActionBarItem,
  ActionBarSeparator,
  Button,
  Checkbox,
  type StatusKind,
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@qeetrix/ui";
import { useState } from "react";
import { formatInr, type InvoiceStatus, invoices, invoiceTotals, users } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num } from "../registry/types";

/**
 * The library's ActionBar is `fixed` to the bottom of the viewport. In a preview it is pinned to
 * the bottom of its own box instead, so several demos can share the page.
 */
const pinned = "absolute bottom-3";

const userStatus: Record<string, { kind: StatusKind; label: string }> = {
  active: { kind: "success", label: "Active" },
  pending: { kind: "warning", label: "Invited" },
  suspended: { kind: "danger", label: "Suspended" },
  inactive: { kind: "muted", label: "Inactive" },
};

const tableUsers = users.slice(0, 5);

function useSelection(initial: readonly string[]) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(initial));
  const toggle = (id: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  return { selected, setSelected, toggle };
}

/** "3 users selected — Suspend · Reset MFA · Export" over the Qeet ID users table. */
function UserBulkActions() {
  const { selected, setSelected, toggle } = useSelection(["usr_02", "usr_03", "usr_05"]);
  const all = tableUsers.every((user) => selected.has(user.id));
  const some = !all && tableUsers.some((user) => selected.has(user.id));
  const act = (verb: string) =>
    toast.success(`${verb} ${selected.size} ${selected.size === 1 ? "user" : "users"}`);
  return (
    <div className="relative w-full overflow-hidden rounded-lg border bg-card pb-16">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label="Select all users"
                checked={all}
                indeterminate={some}
                onCheckedChange={(on) =>
                  setSelected(on ? new Set(tableUsers.map((user) => user.id)) : new Set())
                }
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableUsers.map((user) => {
            const status = userStatus[user.status];
            return (
              <TableRow key={user.id} data-state={selected.has(user.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${user.name}`}
                    checked={selected.has(user.id)}
                    onCheckedChange={(on) => toggle(user.id, on)}
                  />
                </TableCell>
                <TableCell>
                  <span className="block font-medium">{user.name}</span>
                  <span className="block text-caption text-muted-foreground">{user.email}</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{user.role}</TableCell>
                <TableCell>
                  <StatusPill kind={status.kind}>{status.label}</StatusPill>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <ActionBar
        open={selected.size > 0}
        selectionCount={selected.size}
        onClearSelection={() => setSelected(new Set())}
        aria-label="Bulk user actions"
        className={pinned}
      >
        <ActionBarItem onClick={() => act("Suspended")}>
          <BanIcon data-icon="inline-start" aria-hidden />
          Suspend
        </ActionBarItem>
        <ActionBarItem onClick={() => act("Reset MFA for")}>
          <KeyRoundIcon data-icon="inline-start" aria-hidden />
          Reset MFA
        </ActionBarItem>
        <ActionBarItem onClick={() => act("Exported")}>
          <DownloadIcon data-icon="inline-start" aria-hidden />
          Export
        </ActionBarItem>
      </ActionBar>
    </div>
  );
}

const invoiceStatus: Record<InvoiceStatus, { kind: StatusKind; label: string }> = {
  paid: { kind: "success", label: "Paid" },
  sent: { kind: "info", label: "Sent" },
  overdue: { kind: "danger", label: "Overdue" },
  draft: { kind: "muted", label: "Draft" },
  void: { kind: "muted", label: "Void" },
};

/** Overdue invoices: reminders, PDFs and a destructive void, split by a separator. */
function InvoiceBulkActions() {
  const rows = invoices.slice(0, 5);
  const { selected, setSelected, toggle } = useSelection([
    "QP-INV-2026-00409",
    "QP-INV-2026-00408",
  ]);
  return (
    <div className="relative w-full overflow-hidden rounded-lg border bg-card pb-16">
      <ul className="divide-y">
        {rows.map((invoice) => {
          const status = invoiceStatus[invoice.status];
          return (
            <li key={invoice.number} className="flex items-center gap-3 px-3 py-2.5">
              <Checkbox
                aria-label={`Select ${invoice.number}`}
                checked={selected.has(invoice.number)}
                onCheckedChange={(on) => toggle(invoice.number, on)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{invoice.customer}</span>
                <span className="block font-mono text-caption text-muted-foreground">
                  {invoice.number}
                </span>
              </span>
              <span className="hidden text-sm tabular-nums sm:inline">
                {formatInr(invoiceTotals(invoice).total)}
              </span>
              <StatusPill kind={status.kind}>{status.label}</StatusPill>
            </li>
          );
        })}
      </ul>
      <ActionBar
        open={selected.size > 0}
        selectionCount={selected.size}
        onClearSelection={() => setSelected(new Set())}
        aria-label="Bulk invoice actions"
        className={pinned}
      >
        <ActionBarItem>
          <BellRingIcon data-icon="inline-start" aria-hidden />
          Send reminders
        </ActionBarItem>
        <ActionBarItem>
          <DownloadIcon data-icon="inline-start" aria-hidden />
          Download PDFs
        </ActionBarItem>
        <ActionBarItem size="icon-sm" aria-label="Copy invoice numbers">
          <CopyIcon aria-hidden />
        </ActionBarItem>
        <ActionBarSeparator />
        <ActionBarItem variant="destructive">
          <TrashIcon data-icon="inline-start" aria-hidden />
          Void
        </ActionBarItem>
      </ActionBar>
    </div>
  );
}

/** In a narrow panel the bar keeps its actions on one line and scrolls sideways. */
function NarrowPanelActions() {
  const [open, setOpen] = useState(true);
  return (
    <div className="relative h-48 w-full max-w-sm overflow-hidden rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">12 sessions selected</span>
        <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
          {open ? "Clear" : "Select 12"}
        </Button>
      </div>
      <p className="mt-2 text-caption text-muted-foreground">
        A 384px side panel: the bar is capped to the panel and scrolls horizontally.
      </p>
      <ActionBar
        open={open}
        selectionCount={12}
        onClearSelection={() => setOpen(false)}
        aria-label="Bulk session actions"
        className={pinned}
      >
        <ActionBarItem>
          <LogOutIcon data-icon="inline-start" aria-hidden />
          Sign out
        </ActionBarItem>
        <ActionBarItem>
          <ShieldCheckIcon data-icon="inline-start" aria-hidden />
          Mark trusted
        </ActionBarItem>
        <ActionBarItem>
          <DownloadIcon data-icon="inline-start" aria-hidden />
          Export
        </ActionBarItem>
        <ActionBarSeparator />
        <ActionBarItem variant="destructive">
          <BanIcon data-icon="inline-start" aria-hidden />
          Revoke all
        </ActionBarItem>
      </ActionBar>
    </div>
  );
}

const playgroundItems = [
  { label: "Suspend", icon: BanIcon, iconName: "BanIcon" },
  { label: "Reset MFA", icon: KeyRoundIcon, iconName: "KeyRoundIcon" },
  { label: "Export", icon: DownloadIcon, iconName: "DownloadIcon" },
] as const;

const actionBarControls = {
  open: bool(true, "Open"),
  selectionCount: num(3, { min: 0, max: 50, step: 1, label: "Selected rows" }),
  clearable: bool(true, "Selection pill with clear (onClearSelection)"),
  iconOnly: bool(false, 'Icon-only items (size="icon-sm")'),
  destructive: bool(false, "Destructive action after a separator"),
};

export const examples: FamilyExamples = {
  "action-bar": {
    layout: "wide",
    minHeight: 1100,
    demos: [
      {
        name: "Bulk user actions",
        description:
          "Appears while rows are selected and hides (inert) when the selection clears. Untick every row, or press ×, to dismiss it.",
        render: () => <UserBulkActions />,
      },
      {
        name: "With a destructive action",
        description:
          '`ActionBarSeparator` sets the destructive action apart from the safe ones; an icon-only item takes `size="icon-sm"` and an `aria-label`.',
        render: () => <InvoiceBulkActions />,
      },
      {
        name: "Narrow panel",
        description:
          "Capped to its container, the bar scrolls sideways instead of running off-screen. Arrow keys move between actions (one Tab stop).",
        render: () => <NarrowPanelActions />,
      },
    ],
    playground: definePlayground({
      controls: actionBarControls,
      render: (v) => (
        <div className="relative h-40 w-[min(100%,640px)] rounded-lg border border-dashed">
          <ActionBar
            open={v.open}
            selectionCount={v.clearable ? v.selectionCount : undefined}
            onClearSelection={v.clearable ? () => undefined : undefined}
            className={pinned}
          >
            {playgroundItems.map((item) => {
              const Glyph = item.icon;
              return v.iconOnly ? (
                <ActionBarItem key={item.label} size="icon-sm" aria-label={item.label}>
                  <Glyph aria-hidden />
                </ActionBarItem>
              ) : (
                <ActionBarItem key={item.label}>
                  <Glyph data-icon="inline-start" aria-hidden />
                  {item.label}
                </ActionBarItem>
              );
            })}
            {v.destructive && <ActionBarSeparator />}
            {v.destructive && (
              <ActionBarItem variant="destructive">
                <TrashIcon data-icon="inline-start" aria-hidden />
                Delete
              </ActionBarItem>
            )}
          </ActionBar>
        </div>
      ),
      code: (v) =>
        jsx(
          "ActionBar",
          {
            open: v.open ? true : expr("false"),
            selectionCount: v.clearable ? v.selectionCount : undefined,
            onClearSelection: v.clearable ? expr("() => setSelected(new Set())") : undefined,
          },
          [
            ...playgroundItems.map((item) =>
              v.iconOnly
                ? jsx("ActionBarItem", { size: "icon-sm", "aria-label": item.label }, [
                    `<${item.iconName} aria-hidden />`,
                  ])
                : jsx("ActionBarItem", {}, [
                    `<${item.iconName} data-icon="inline-start" aria-hidden />`,
                    item.label,
                  ]),
            ),
            v.destructive ? "<ActionBarSeparator />" : "",
            v.destructive
              ? jsx("ActionBarItem", { variant: "destructive" }, [
                  '<TrashIcon data-icon="inline-start" aria-hidden />',
                  "Delete",
                ])
              : "",
          ],
        ),
    }),
  },
};
