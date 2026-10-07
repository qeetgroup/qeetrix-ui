import {
  BuildingComplexIcon,
  DatabaseIcon,
  FolderIcon,
  KeyRoundIcon,
  ServerIcon,
  ShieldCheckIcon,
  UsersIcon,
  WaypointsIcon,
} from "@qeetrix/icons";
import { Button, type TreeNode, TreeView } from "@qeetrix/ui";
import { type ReactNode, useState } from "react";
import { tenants } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, text } from "../registry/types";

/** A label with a muted count after it: "Platform · 24". */
function counted(label: string, count: string): ReactNode {
  return (
    <>
      {label} <span className="text-muted-foreground">· {count}</span>
    </>
  );
}

const acme = tenants[0];

function directory({
  open = true,
  icons = true,
}: {
  open?: boolean;
  icons?: boolean;
} = {}): TreeNode[] {
  const icon = (Icon: TreeNode["icon"]) => (icons ? Icon : undefined);
  return [
    {
      id: acme.id,
      label: counted(acme.name, `${acme.users.toLocaleString("en-IN")} users`),
      icon: icon(BuildingComplexIcon),
      defaultOpen: open,
      children: [
        {
          id: "ou_engineering",
          label: counted("Engineering", "612"),
          icon: icon(FolderIcon),
          defaultOpen: open,
          children: [
            { id: "ou_platform", label: counted("Platform", "184"), icon: icon(UsersIcon) },
            { id: "ou_payments", label: counted("Payments", "142"), icon: icon(UsersIcon) },
            { id: "ou_data", label: counted("Data", "96"), icon: icon(UsersIcon) },
            { id: "ou_sre", label: counted("Site reliability", "38"), icon: icon(UsersIcon) },
          ],
        },
        {
          id: "ou_finance",
          label: counted("Finance", "74"),
          icon: icon(FolderIcon),
          children: [
            { id: "ou_billing", label: counted("Billing operations", "22"), icon: icon(UsersIcon) },
            { id: "ou_tax", label: counted("GST & compliance", "9"), icon: icon(UsersIcon) },
          ],
        },
        {
          id: "ou_risk",
          label: counted("Risk & Compliance", "31"),
          icon: icon(FolderIcon),
        },
        {
          id: "ou_sales",
          label: counted("Sales — West region", "208"),
          icon: icon(FolderIcon),
          children: [
            { id: "ou_mumbai", label: counted("Mumbai", "121"), icon: icon(UsersIcon) },
            { id: "ou_pune", label: counted("Pune", "87"), icon: icon(UsersIcon) },
          ],
        },
      ],
    },
  ];
}

const logStreams: TreeNode[] = [
  {
    id: "idx_ap_south_1",
    label: "logs-ap-south-1",
    icon: DatabaseIcon,
    defaultOpen: true,
    children: [
      {
        id: "svc_id",
        label: "qeet-id-server",
        icon: ServerIcon,
        defaultOpen: true,
        children: [
          { id: "str_id_auth", label: counted("auth", "1.2M events/day"), icon: WaypointsIcon },
          { id: "str_id_webauthn", label: counted("webauthn", "418K"), icon: WaypointsIcon },
          { id: "str_id_scim", label: counted("scim", "12K"), icon: WaypointsIcon },
        ],
      },
      {
        id: "svc_pay",
        label: "qeet-pay-api",
        icon: ServerIcon,
        children: [
          { id: "str_pay_upi", label: counted("upi", "860K"), icon: WaypointsIcon },
          { id: "str_pay_nach", label: counted("nach", "44K"), icon: WaypointsIcon },
          { id: "str_pay_webhooks", label: counted("webhooks", "302K"), icon: WaypointsIcon },
        ],
      },
      {
        id: "svc_notify",
        label: "notify-worker",
        icon: ServerIcon,
        children: [
          { id: "str_notify_sms", label: counted("sms", "96K"), icon: WaypointsIcon },
          { id: "str_notify_whatsapp", label: counted("whatsapp", "71K"), icon: WaypointsIcon },
          { id: "str_notify_email", label: counted("email", "128K"), icon: WaypointsIcon },
        ],
      },
    ],
  },
  {
    id: "idx_eu_central_1",
    label: "logs-eu-central-1",
    icon: DatabaseIcon,
    children: [
      {
        id: "svc_eu_id",
        label: "qeet-id-server",
        icon: ServerIcon,
        children: [
          {
            id: "str_eu_auth",
            label: counted("auth", "no access — EU residency"),
            icon: WaypointsIcon,
            disabled: true,
          },
        ],
      },
    ],
  },
];

const roleTree: TreeNode[] = [
  {
    id: "role_owner",
    label: "Owner",
    icon: ShieldCheckIcon,
    children: [
      { id: "perm_owner_all", label: "tenant:* (all permissions)", icon: KeyRoundIcon },
      { id: "perm_owner_transfer", label: "tenant:transfer", icon: KeyRoundIcon },
    ],
  },
  {
    id: "role_admin",
    label: "Admin",
    icon: ShieldCheckIcon,
    children: [
      { id: "perm_admin_users", label: "users:read, users:write", icon: KeyRoundIcon },
      { id: "perm_admin_sessions", label: "sessions:revoke", icon: KeyRoundIcon },
      { id: "perm_admin_sso", label: "sso:configure", icon: KeyRoundIcon },
    ],
  },
  {
    id: "role_billing",
    label: "Billing",
    icon: ShieldCheckIcon,
    children: [
      { id: "perm_billing_invoices", label: "invoices:read, invoices:write", icon: KeyRoundIcon },
      { id: "perm_billing_refunds", label: "refunds:create", icon: KeyRoundIcon },
    ],
  },
  {
    id: "role_auditor",
    label: "Auditor",
    icon: ShieldCheckIcon,
    children: [{ id: "perm_auditor_logs", label: "audit:read, audit:export", icon: KeyRoundIcon }],
  },
];

const frame = "w-full max-w-md rounded-lg border bg-card p-2";

/** Every branch id in a tree, for "Expand all". */
function branchIds(nodes: TreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.children?.length ? [node.id, ...branchIds(node.children)] : [],
  );
}

/** "qeet-id-server / webauthn" for every stream leaf, from its service and its id. */
const streamPaths = new Map(
  logStreams.flatMap((index) =>
    (index.children ?? []).flatMap((service) =>
      (service.children ?? []).map(
        (stream) =>
          [stream.id, `${String(service.label)} / ${stream.id.split("_").at(-1)}`] as const,
      ),
    ),
  ),
);

/** Pick the stream to tail: single selection, controlled, with a disabled EU stream. */
function StreamPickerDemo() {
  const [selectedId, setSelectedId] = useState<string | null>("str_id_webauthn");
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <TreeView
        data={logStreams}
        aria-label="Log stream to tail"
        className={frame}
        selectedId={selectedId}
        onSelectedIdChange={(id) => setSelectedId(id)}
      />
      <p className="text-caption text-muted-foreground" aria-live="polite">
        {selectedId && streamPaths.has(selectedId) ? (
          <>
            Tailing <span className="font-mono text-foreground">{streamPaths.get(selectedId)}</span>{" "}
            in Qeet Logs
          </>
        ) : (
          "Select a stream to tail it"
        )}
      </p>
    </div>
  );
}

/** Expansion owned by the page, so toolbar buttons can open or close every branch. */
function ControlledExpansionDemo() {
  const all = branchIds(roleTree);
  const [expandedIds, setExpandedIds] = useState<string[]>(["role_admin"]);
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setExpandedIds(all)}>
          Expand all
        </Button>
        <Button size="sm" variant="outline" onClick={() => setExpandedIds([])}>
          Collapse all
        </Button>
        <span className="ms-auto self-center text-caption text-muted-foreground">
          {expandedIds.length} of {all.length} roles open
        </span>
      </div>
      <TreeView
        data={roleTree}
        aria-label="Roles and permissions"
        className={frame}
        expandedIds={expandedIds}
        onExpandedIdsChange={setExpandedIds}
        defaultSelectedId="perm_admin_sso"
      />
    </div>
  );
}

const treeControls = {
  defaultOpen: bool(true, "Branches start open (defaultOpen)"),
  selectable: bool(true, "Single selection (defaultSelectedId)"),
  showGuides: bool(true, "showGuides"),
  icons: bool(true, "Node icons"),
  "aria-label": text("Acme India org units", "aria-label"),
};

export const examples: FamilyExamples = {
  "tree-view": {
    layout: "wide",
    minHeight: 1800,
    demos: [
      {
        name: "Tenant org units",
        description:
          "Branches with `defaultOpen` start expanded. Arrow keys move and expand/collapse, Home/End jump, Enter or Space toggles.",
        render: () => (
          <TreeView data={directory()} aria-label="Acme India org units" className={frame} />
        ),
      },
      {
        name: "Selection",
        description:
          "Passing `selectedId` (or `defaultSelectedId` / `onSelectedIdChange`) makes the tree single-select: click, Enter or Space selects and the node carries aria-selected. A `disabled` node stays focusable but cannot be chosen.",
        render: () => <StreamPickerDemo />,
      },
      {
        name: "Controlled expansion",
        description:
          "`expandedIds` + `onExpandedIdsChange` let the page open or close branches; `*` on the keyboard expands all siblings, and typing a letter jumps to the next match.",
        render: () => <ControlledExpansionDemo />,
      },
      {
        name: "Without guides",
        description: "`showGuides={false}` drops the depth hairlines for a shallow tree.",
        render: () => (
          <TreeView
            data={logStreams}
            aria-label="Log streams"
            className={frame}
            showGuides={false}
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: treeControls,
      render: (v) => (
        <TreeView
          // `defaultOpen` is read once per node, so remount to apply a change.
          key={`${v.defaultOpen}-${v.selectable}`}
          data={directory({ open: v.defaultOpen, icons: v.icons })}
          aria-label={v["aria-label"]}
          defaultSelectedId={v.selectable ? "ou_payments" : undefined}
          showGuides={v.showGuides}
          className={frame}
        />
      ),
      code: (v) => {
        const icon = (name: string) => (v.icons ? `, icon: ${name}` : "");
        return [
          "const data: TreeNode[] = [",
          "  {",
          `    id: "${acme.id}",`,
          `    label: "${acme.name}",`,
          ...(v.icons ? ["    icon: BuildingComplexIcon,"] : []),
          ...(v.defaultOpen ? ["    defaultOpen: true,"] : []),
          "    children: [",
          `      { id: "ou_platform", label: "Platform"${icon("UsersIcon")} },`,
          `      { id: "ou_payments", label: "Payments"${icon("UsersIcon")} },`,
          "    ],",
          "  },",
          "];",
          "",
          jsx("TreeView", {
            data: expr("data"),
            "aria-label": v["aria-label"],
            defaultSelectedId: v.selectable ? "ou_payments" : undefined,
            showGuides: v.showGuides ? undefined : expr("false"),
          }),
        ].join("\n");
      },
    }),
  },
};
