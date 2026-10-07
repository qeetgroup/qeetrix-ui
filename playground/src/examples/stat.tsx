import {
  type IconProps,
  IndianRupeeIcon,
  KeyRoundIcon,
  ReceiptTextIcon,
  ServerCrashIcon,
  TimerIcon,
  UsersIcon,
  WebhookIcon,
} from "@qeetrix/icons";
import { Sparkline, Stat } from "@qeetrix/ui";
import type { ComponentType } from "react";
import { formatInrCompact, invoices, invoiceTotals, monthlyRevenue, tenants } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const september = monthlyRevenue[10];
const august = monthlyRevenue[9];
const openInvoices = invoices.filter((invoice) => ["sent", "overdue"].includes(invoice.status));
const outstanding = openInvoices.reduce((sum, invoice) => sum + invoiceTotals(invoice).total, 0);
const overdueCount = openInvoices.filter((invoice) => invoice.status === "overdue").length;

const collectionsDelta = ((september.collected - august.collected) / august.collected) * 100;
const collectedSeries = monthlyRevenue.slice(0, 11).map((month) => month.collected);

type Trend = "up" | "down" | "neutral";
type Tone = "positive" | "negative" | "neutral";

const kpis: {
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  tone?: Tone;
  hint: string;
  icon: ComponentType<IconProps<"outline">>;
}[] = [
  {
    label: "Collections (Sep)",
    value: formatInrCompact(september.collected),
    delta: `+${collectionsDelta.toFixed(1)}%`,
    trend: "up",
    hint: `vs ${formatInrCompact(august.collected)} in August`,
    icon: IndianRupeeIcon,
  },
  {
    label: "Active users",
    value: tenants[0].users.toLocaleString("en-IN"),
    delta: "+3.1%",
    trend: "up",
    hint: "Acme India · last 30 days",
    icon: UsersIcon,
  },
  {
    label: "Webhook delivery",
    value: "99.2%",
    delta: "−0.5 pts",
    trend: "down",
    hint: "below the 99.5% SLO for qeet-pay-api",
    icon: WebhookIcon,
  },
  {
    label: "Passkey adoption",
    value: "72%",
    delta: "+6 pts",
    trend: "up",
    hint: "of members with a registered passkey",
    icon: KeyRoundIcon,
  },
];

/** Movements whose direction and meaning disagree — what `tone` is for. */
const toned: typeof kpis = [
  {
    label: "5xx error rate (qeet-pay-api)",
    value: "1.42%",
    delta: "+0.9 pts",
    trend: "up",
    tone: "negative",
    hint: "UPI collect timeouts since 10:00 IST",
    icon: ServerCrashIcon,
  },
  {
    label: "Median settlement time",
    value: "1.6 days",
    delta: "−0.4 days",
    trend: "down",
    tone: "positive",
    hint: "T+2 → T+1 for UPI since the September switch",
    icon: TimerIcon,
  },
  {
    label: "Failed sign-ins (24 h)",
    value: "128",
    delta: "−31%",
    trend: "down",
    tone: "positive",
    hint: "after passkeys became mandatory for admins",
    icon: KeyRoundIcon,
  },
  {
    label: "Refunds (Sep)",
    value: formatInrCompact(september.refunds),
    delta: "+43%",
    trend: "up",
    tone: "neutral",
    hint: "seasonal: festive-sale returns",
    icon: ReceiptTextIcon,
  },
];

const statControls = {
  label: text("Collections (Sep)", "label"),
  value: text(formatInrCompact(september.collected), "value"),
  delta: text(`+${collectionsDelta.toFixed(1)}%`, "delta"),
  trend: select(["none", "up", "down", "neutral"] as const, "up", "trend"),
  tone: select(
    ["auto", "positive", "negative", "neutral"] as const,
    "auto",
    "tone (auto = from trend)",
  ),
  size: select(["sm", "default", "lg"] as const, "default"),
  hint: text(`vs ${formatInrCompact(august.collected)} in August`, "hint"),
  icon: bool(true, "Icon"),
  sparkline: bool(false, "Sparkline footer (children)"),
  loading: bool(false, "loading"),
};

const grid = "grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4";

export const examples: FamilyExamples = {
  stat: {
    layout: "wide",
    minHeight: 1250,
    demos: [
      {
        name: "KPI row",
        description:
          "`trend` arrows the delta and, without a `tone`, colours it too: up reads good, down bad. The hint gives the comparison.",
        render: () => (
          <div className={grid}>
            {kpis.map((kpi) => (
              <Stat
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                trend={kpi.trend}
                hint={kpi.hint}
                icon={kpi.icon}
              />
            ))}
          </div>
        ),
      },
      {
        name: "Tone: when up is bad",
        description:
          "`tone` says whether the change is good news, independent of its direction: an error rate going up is negative, a settlement time going down is positive.",
        render: () => (
          <div className={grid}>
            {toned.map((kpi) => (
              <Stat
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                trend={kpi.trend}
                tone={kpi.tone}
                hint={kpi.hint}
                icon={kpi.icon}
              />
            ))}
          </div>
        ),
      },
      {
        name: "Sizes",
        description:
          "`size` scales padding and the value: `sm` for dense side panels, `lg` for a hero figure.",
        render: () => (
          <div className="grid w-full items-start gap-4 sm:grid-cols-3">
            {(["sm", "default", "lg"] as const).map((size) => (
              <Stat
                key={size}
                size={size}
                label={`Settled today · ${size}`}
                value={formatInrCompact(2160000)}
                delta="+12%"
                trend="up"
                hint="NACH and UPI settlements, IST"
              />
            ))}
          </div>
        ),
      },
      {
        name: "Loading",
        description:
          "`loading` keeps the label and the tile's place while the figures load, and marks it aria-busy.",
        render: () => (
          <div className={grid}>
            <Stat
              label="Collections (Oct, MTD)"
              value=""
              loading
              hint="vs last month"
              icon={IndianRupeeIcon}
            />
            <Stat label="Active sessions" value="" loading icon={UsersIcon} />
            <Stat
              label="Webhook delivery"
              value=""
              loading
              hint="vs last month"
              icon={WebhookIcon}
            />
          </div>
        ),
      },
      {
        name: "Neutral and no delta",
        description:
          'Omit `trend` for a delta that is just a note (no glyph); `trend="neutral"` draws a level dash for “no change”.',
        render: () => (
          <div className={grid}>
            <Stat
              label="Open invoices"
              value={String(openInvoices.length)}
              icon={ReceiptTextIcon}
              hint={`${formatInrCompact(outstanding)} outstanding, ${overdueCount} overdue`}
            />
            <Stat
              label="SCIM sync"
              value="11 updated"
              delta="3 created"
              hint="Okta · 15 minutes ago"
            />
            <Stat
              label="Seats in use"
              value="1,842 / 2,000"
              delta="0%"
              trend="neutral"
              hint="unchanged since last week"
            />
            <Stat
              label="Settlements (Oct)"
              value="—"
              hint="The first settlement lands T+2 working days"
            />
          </div>
        ),
      },
      {
        name: "With a sparkline footer",
        description:
          "`children` render as the tile's footer — here a Sparkline with a matching `tone`.",
        render: () => (
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <Stat
              label="Collections, last 11 months"
              value={formatInrCompact(september.collected)}
              delta={`+${collectionsDelta.toFixed(1)}%`}
              trend="up"
            >
              <Sparkline
                data={collectedSeries}
                type="area"
                tone="positive"
                height={40}
                label="Monthly collections, November to September, rising"
              />
            </Stat>
            <Stat
              label="Refunds, last 11 months"
              value={formatInrCompact(september.refunds)}
              delta="+43%"
              trend="up"
              tone="neutral"
            >
              <Sparkline
                data={monthlyRevenue.slice(0, 11).map((month) => month.refunds)}
                tone="neutral"
                height={40}
                label="Monthly refunds, November to September, uneven"
              />
            </Stat>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: statControls,
      render: (v) => (
        <Stat
          label={v.label}
          value={v.value}
          delta={v.delta || undefined}
          trend={v.trend === "none" ? undefined : v.trend}
          tone={v.tone === "auto" ? undefined : v.tone}
          size={v.size}
          hint={v.hint || undefined}
          icon={v.icon ? IndianRupeeIcon : undefined}
          loading={v.loading}
          className="w-72"
        >
          {v.sparkline ? (
            <Sparkline
              data={collectedSeries}
              type="area"
              tone={v.tone === "auto" ? "default" : v.tone}
              height={36}
              label="Monthly collections, November to September, rising"
            />
          ) : null}
        </Stat>
      ),
      code: (v) =>
        jsx(
          "Stat",
          {
            label: v.label,
            value: v.value,
            delta: v.delta || undefined,
            trend: v.delta && v.trend !== "none" ? v.trend : undefined,
            tone: v.delta && v.tone !== "auto" ? v.tone : undefined,
            size: v.size === "default" ? undefined : v.size,
            icon: v.icon ? expr("IndianRupeeIcon") : undefined,
            hint: v.hint || undefined,
            loading: v.loading,
          },
          v.sparkline
            ? jsx("Sparkline", {
                data: expr("monthlyCollections"),
                type: "area",
                tone: v.tone === "auto" ? undefined : v.tone,
                height: 36,
                label: "Monthly collections, November to September, rising",
              })
            : null,
        ),
    }),
  },
};
