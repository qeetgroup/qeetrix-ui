import { Badge, Button, Chip, ChipGroup, type StatusKind, StatusPill } from "@qeetrix/ui";
import {
  BellRingIcon,
  CrownIcon,
  KeyRoundIcon,
  MailIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  ServerIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { formatInr, type InvoiceStatus, invoices, invoiceTotals, tenants } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/* ── Badge ────────────────────────────────────────────────────────────────────────────────── */

const badgeVariants = [
  "default",
  "secondary",
  "outline",
  "brand",
  "info",
  "success",
  "warning",
  "destructive",
  "muted",
] as const;

const badgeControls = {
  variant: select(badgeVariants, "default"),
  children: text("Enterprise", "Label"),
  icon: bool(false, "Leading icon"),
};

const invoiceBadge: Record<
  InvoiceStatus,
  { variant: (typeof badgeVariants)[number]; label: string }
> = {
  paid: { variant: "success", label: "Paid" },
  sent: { variant: "info", label: "Sent" },
  overdue: { variant: "destructive", label: "Overdue" },
  draft: { variant: "muted", label: "Draft" },
  void: { variant: "outline", label: "Void" },
};

/* ── Chip ─────────────────────────────────────────────────────────────────────────────────── */

const logLevels = [
  { value: "all", label: "All levels" },
  { value: "error", label: "Error" },
  { value: "warn", label: "Warn" },
  { value: "info", label: "Info" },
  { value: "debug", label: "Debug" },
] as const;

const channels = [
  { value: "email", label: "Email", icon: MailIcon },
  { value: "sms", label: "SMS", icon: MessageSquareIcon },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircleIcon },
  { value: "push", label: "Push", icon: BellRingIcon },
] as const;

const initialFilters = [
  { id: "service", label: "service: qeet-pay-api" },
  { id: "level", label: "level: error" },
  { id: "region", label: "region: ap-south-1" },
  { id: "tenant", label: "tenant: tnt_acme" },
] as const;

function LogLevelChipsDemo() {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-label text-muted-foreground">
        Log level
      </span>
      <ChipGroup defaultValue="error" aria-labelledby={labelId}>
        {logLevels.map((level) => (
          <Chip key={level.value} value={level.value}>
            {level.label}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  );
}

function ChannelChipsDemo() {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-label text-muted-foreground">
        Notify via
      </span>
      <ChipGroup multiple defaultValue={["email", "whatsapp"]} aria-labelledby={labelId}>
        {channels.map((channel) => (
          <Chip
            key={channel.value}
            value={channel.value}
            icon={<channel.icon aria-hidden className="size-3.5" />}
          >
            {channel.label}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  );
}

function RemovableChipsDemo() {
  const [filters, setFilters] =
    useState<readonly (typeof initialFilters)[number][]>(initialFilters);
  return (
    <div className="flex max-w-md flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <Chip
          key={filter.id}
          size="sm"
          onRemove={() => setFilters((current) => current.filter((f) => f.id !== filter.id))}
          messages={{ remove: `Remove filter ${filter.label}` }}
        >
          {filter.label}
        </Chip>
      ))}
      {filters.length === 0 ? (
        <Button size="xs" variant="outline" onClick={() => setFilters(initialFilters)}>
          Restore filters
        </Button>
      ) : (
        <Button size="xs" variant="ghost" onClick={() => setFilters([])}>
          Clear all
        </Button>
      )}
    </div>
  );
}

function StandaloneChipDemo() {
  const [liveTail, setLiveTail] = useState(true);
  return (
    <Chip
      selected={liveTail}
      onClick={() => setLiveTail((on) => !on)}
      icon={<ServerIcon aria-hidden className="size-3.5" />}
    >
      Live tail
    </Chip>
  );
}

const chipControls = {
  size: select(["sm", "md", "lg"] as const, "md"),
  children: text("WhatsApp", "Label"),
  selected: bool(true, "Selected"),
  icon: bool(true, "Leading icon"),
  removable: bool(false, "Removable (onRemove)"),
  disabled: bool(false),
};

function ChipPlayground({
  size,
  children,
  selected: initialSelected,
  icon,
  removable,
  disabled,
}: {
  size: "sm" | "md" | "lg";
  children: string;
  selected: boolean;
  icon: boolean;
  removable: boolean;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const [removed, setRemoved] = useState(false);
  if (removed) {
    return (
      <Button size="sm" variant="outline" onClick={() => setRemoved(false)}>
        Restore chip
      </Button>
    );
  }
  return (
    <Chip
      size={size}
      selected={selected}
      onClick={() => setSelected((on) => !on)}
      onRemove={removable ? () => setRemoved(true) : undefined}
      disabled={disabled}
      icon={icon ? <MessageCircleIcon aria-hidden className="size-3.5" /> : undefined}
    >
      {children}
    </Chip>
  );
}

/* ── StatusPill ───────────────────────────────────────────────────────────────────────────── */

/** Every status string StatusPill knows, grouped by the kind it maps to. */
const knownStatuses: readonly { kind: StatusKind; statuses: readonly string[] }[] = [
  {
    kind: "success",
    statuses: [
      "active",
      "enabled",
      "verified",
      "trusted",
      "ok",
      "up",
      "delivered",
      "succeeded",
      "live",
    ],
  },
  {
    kind: "info",
    statuses: ["processing", "running", "syncing", "queued", "scheduled", "invited"],
  },
  {
    kind: "warning",
    statuses: ["pending", "expiring", "degraded", "warn", "unverified", "untrusted"],
  },
  {
    kind: "danger",
    statuses: [
      "expired",
      "revoked",
      "disabled",
      "suspended",
      "locked",
      "blocked",
      "compromised",
      "deleted",
      "failed",
      "down",
    ],
  },
  { kind: "muted", statuses: ["draft", "archived", "inactive"] },
];

const statusKinds = ["success", "warning", "danger", "info", "muted", "neutral"] as const;

const statusPillControls = {
  status: select(
    [
      "active",
      "pending",
      "expiring",
      "expired",
      "revoked",
      "suspended",
      "failed",
      "delivered",
      "draft",
      "archived",
      "syncing",
      "invited",
      "past_due",
    ] as const,
    "active",
  ),
  kind: select(["auto", ...statusKinds] as const, "auto", "Kind override"),
  label: text("", "Custom label (empty = automatic)"),
  dot: bool(true, "Dot"),
};

export const examples: FamilyExamples = {
  badge: {
    minHeight: 280,
    demos: [
      {
        name: "Variants",
        description:
          "All nine: `default` is the one solid fill — use it sparingly; tints for status, graphite for metadata.",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <Badge>New</Badge>
            <Badge variant="secondary">ap-south-1</Badge>
            <Badge variant="outline">SAML</Badge>
            <Badge variant="brand">Enterprise</Badge>
            <Badge variant="info">Beta</Badge>
            <Badge variant="success">Paid</Badge>
            <Badge variant="warning">Due in 3 days</Badge>
            <Badge variant="destructive">Overdue</Badge>
            <Badge variant="muted">Draft</Badge>
          </div>
        ),
      },
      {
        name: "With icon",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">
              <ShieldCheckIcon aria-hidden />
              Passkey
            </Badge>
            <Badge variant="secondary">
              <KeyRoundIcon aria-hidden />
              TOTP
            </Badge>
            <Badge variant="outline">
              <CrownIcon aria-hidden />
              Owner
            </Badge>
          </div>
        ),
      },
      {
        name: "In a list",
        description: "Invoice status next to the amount, as on the Qeet Pay invoices page.",
        render: () => (
          <ul className="flex w-80 max-w-full flex-col divide-y rounded-lg border text-sm">
            {invoices.slice(2, 6).map((invoice) => (
              <li key={invoice.number} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{invoice.customer}</div>
                  <div className="text-caption text-muted-foreground">{invoice.number}</div>
                </div>
                <span className="tabular-nums">{formatInr(invoiceTotals(invoice).total)}</span>
                <Badge variant={invoiceBadge[invoice.status].variant}>
                  {invoiceBadge[invoice.status].label}
                </Badge>
              </li>
            ))}
          </ul>
        ),
      },
    ],
    playground: definePlayground({
      controls: badgeControls,
      render: (v) => (
        <Badge variant={v.variant}>
          {v.icon && <ShieldCheckIcon aria-hidden />}
          {v.children}
        </Badge>
      ),
      code: (v) =>
        jsx("Badge", changedProps(v, badgeControls, ["variant"]), [
          v.icon ? "<ShieldCheckIcon aria-hidden />" : "",
          v.children,
        ]),
    }),
  },

  chip: {
    minHeight: 360,
    demos: [
      {
        name: "Single select",
        description: "A `ChipGroup` without `multiple` is a radio group: one level at a time.",
        render: () => <LogLevelChipsDemo />,
      },
      {
        name: "Multi select",
        description:
          "`multiple` gives checkbox semantics — e.g. the channels an alert fans out to.",
        render: () => <ChannelChipsDemo />,
      },
      {
        name: "Removable",
        description: "`onRemove` adds a separately focusable × button; the caller drops the chip.",
        render: () => <RemovableChipsDemo />,
      },
      {
        name: "Standalone toggle",
        render: () => <StandaloneChipDemo />,
      },
      {
        name: "Sizes",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" selected>
              Small
            </Chip>
            <Chip size="md" selected>
              Medium
            </Chip>
            <Chip size="lg" selected>
              Large
            </Chip>
          </div>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <ChipGroup disabled defaultValue="upi" aria-label="Payment method">
            <Chip value="upi">UPI</Chip>
            <Chip value="card">Card</Chip>
            <Chip value="nach">NACH</Chip>
          </ChipGroup>
        ),
      },
    ],
    playground: definePlayground({
      controls: chipControls,
      render: (v) => <ChipPlayground key={String(v.selected)} {...v} />,
      code: (v) =>
        jsx(
          "Chip",
          {
            ...changedProps(v, chipControls, ["size"]),
            selected: expr("selected"),
            onClick: expr("() => setSelected((on) => !on)"),
            onRemove: v.removable ? expr('() => removeChannel("whatsapp")') : undefined,
            disabled: v.disabled,
            icon: v.icon
              ? expr('<MessageCircleIcon aria-hidden className="size-3.5" />')
              : undefined,
          },
          v.children,
        ),
    }),
  },

  "status-pill": {
    layout: "wide",
    minHeight: 420,
    demos: [
      {
        name: "Known statuses",
        description:
          "Pass the API’s status string; StatusPill maps it to a colour and label (case-insensitive).",
        render: () => (
          <dl className="grid w-full max-w-3xl grid-cols-[6rem_1fr] items-start gap-x-4 gap-y-3 text-sm">
            {knownStatuses.map((group) => (
              <div key={group.kind} className="contents">
                <dt className="pt-0.5 text-caption text-muted-foreground">{group.kind}</dt>
                <dd className="flex flex-wrap gap-2">
                  {group.statuses.map((status) => (
                    <StatusPill key={status} status={status} />
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        ),
      },
      {
        name: "Explicit kind",
        description: "For states the API doesn’t name, set `kind` and the label yourself.",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill kind="success">Settled</StatusPill>
            <StatusPill kind="warning">Awaiting NEFT</StatusPill>
            <StatusPill kind="danger">Chargeback</StatusPill>
            <StatusPill kind="info">Syncing</StatusPill>
            <StatusPill kind="muted">Paused</StatusPill>
            <StatusPill kind="neutral">Scheduled</StatusPill>
          </div>
        ),
      },
      {
        name: "Unknown status",
        description:
          "Unmapped strings fall back to neutral with a readable label; lookup is case-insensitive.",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status="past_due" />
            <StatusPill status="in-review" />
            <StatusPill status="ACTIVE" />
          </div>
        ),
      },
      {
        name: "Without dot",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status="verified" dot={false} />
            <StatusPill status="expiring" dot={false} />
            <StatusPill status="revoked" dot={false} />
          </div>
        ),
      },
      {
        name: "In a table",
        render: () => (
          <ul className="flex w-full max-w-md flex-col divide-y rounded-lg border text-sm">
            {tenants.map((tenant) => (
              <li key={tenant.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{tenant.name}</div>
                  <div className="text-caption text-muted-foreground">
                    {tenant.domain} · {tenant.region}
                  </div>
                </div>
                <StatusPill status={tenant.status} />
              </li>
            ))}
          </ul>
        ),
      },
    ],
    playground: definePlayground({
      controls: statusPillControls,
      render: (v) => (
        <StatusPill status={v.status} kind={v.kind === "auto" ? undefined : v.kind} dot={v.dot}>
          {v.label || undefined}
        </StatusPill>
      ),
      code: (v) =>
        jsx(
          "StatusPill",
          {
            status: v.status,
            kind: v.kind === "auto" ? undefined : v.kind,
            dot: v.dot ? undefined : expr("false"),
          },
          v.label || null,
        ),
    }),
  },
};
