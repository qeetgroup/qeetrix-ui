import {
  BanknoteIcon,
  CheckIcon,
  FileTextIcon,
  type IconProps,
  MailIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  XIcon,
} from "@qeetrix/icons";
import {
  Avatar,
  AvatarFallback,
  Button,
  Feed,
  FeedItem,
  Spinner,
  StatusPill,
  Timeline,
  TimelineContent,
  TimelineDescription,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
  type TimelineTone,
  useFeedItemLabel,
} from "@qeetrix/ui";
import { type ComponentType, useId } from "react";
import {
  type AuditRecord,
  auditRecords,
  dateTimeFormat,
  daysAgo,
  formatInr,
  invoices,
  invoiceTotals,
  minutesAgo,
  NOW,
} from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

const relative = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });

/** Relative to the playground's fixed `NOW`, so screenshots are stable. */
function sinceNow(iso: string): string {
  const minutes = Math.round((NOW.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  return relative.format(-Math.round(hours / 24), "day");
}

/* ── Feed ──────────────────────────────────────────────────────────────────────────────────── */

/** Names its enclosing feed article from inside, via `useFeedItemLabel`. */
function AuditArticle({ record }: { record: AuditRecord }) {
  const titleId = useId();
  useFeedItemLabel({ labelledBy: titleId });
  return (
    <div className="flex gap-3">
      <Avatar size="sm">
        <AvatarFallback>{record.actor.initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p id={titleId} className="text-sm">
            <span className="font-medium text-foreground">{record.actor.name}</span>{" "}
            <span className="text-muted-foreground">{record.summary}</span>
          </p>
          <time dateTime={record.timestamp} className="text-caption text-muted-foreground">
            {sinceNow(record.timestamp)}
          </time>
        </div>
        <p className="text-caption text-muted-foreground">
          <code className="font-mono">{record.action}</code> · {record.target} · {record.ip} (
          {record.location})
        </p>
        {record.outcome === "failure" && (
          <StatusPill kind="danger" className="self-start">
            Failed
          </StatusPill>
        )}
      </div>
    </div>
  );
}

interface Delivery {
  id: string;
  channel: string;
  icon: ComponentType<IconProps<"outline">>;
  title: string;
  detail: string;
  status: "delivered" | "failed" | "pending";
  at: string;
}

const deliveries: Delivery[] = [
  {
    id: "dlv_01",
    channel: "SMS",
    icon: MessageSquareIcon,
    title: "Sign-in OTP to +91 98•••• 4410",
    detail: "otp_login_v3 · Kaleyra · 1.2 s",
    status: "delivered",
    at: minutesAgo(1),
  },
  {
    id: "dlv_02",
    channel: "WhatsApp",
    icon: MessageCircleIcon,
    title: "Invoice reminder QP-INV-2026-00409 to Kanpur Logistics",
    detail: "Template invoice_due_v2 is awaiting Meta approval",
    status: "failed",
    at: minutesAgo(8),
  },
  {
    id: "dlv_03",
    channel: "Email",
    icon: MailIcon,
    title: "New passkey added — rohan.mehta@acme.in",
    detail: "security_alert · SES ap-south-1",
    status: "delivered",
    at: minutesAgo(26),
  },
  {
    id: "dlv_04",
    channel: "Push",
    icon: SmartphoneIcon,
    title: "Approve sign-in from Mumbai on iPhone 17",
    detail: "APNs · waiting for the device to come online",
    status: "pending",
    at: minutesAgo(41),
  },
];

function DeliveryArticle({ delivery }: { delivery: Delivery }) {
  const Icon = delivery.icon;
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p id={`${delivery.id}-title`} className="text-sm font-medium text-foreground">
          {delivery.title}
        </p>
        <p className="text-caption text-muted-foreground">
          {delivery.channel} · {delivery.detail} · {sinceNow(delivery.at)}
        </p>
      </div>
      <StatusPill status={delivery.status} className="shrink-0" />
    </div>
  );
}

/* ── Timeline ──────────────────────────────────────────────────────────────────────────────── */

const invoice = invoices[1];
const total = invoiceTotals(invoice).total;

const lifecycle = [
  {
    id: "created",
    title: "Invoice created",
    description: `${invoice.number} for ${invoice.customer}, ${formatInr(invoice.subtotal)} + IGST 18%`,
    at: invoice.issued,
    icon: FileTextIcon,
    iconName: "FileTextIcon",
  },
  {
    id: "sent",
    title: "Sent to accounts@bharatfinserv.co.in",
    description: "Email and WhatsApp, with the GST invoice PDF attached",
    at: daysAgo(8.9),
    icon: SendIcon,
    iconName: "SendIcon",
  },
  {
    id: "debit",
    title: "NACH debit presented",
    description: "Mandate NACH-88213 on HDFC Bank ••4410",
    at: daysAgo(2),
    icon: BanknoteIcon,
    iconName: "BanknoteIcon",
  },
  {
    id: "paid",
    title: `Paid ${formatInr(total)}`,
    description: "Bank confirmed the debit; receipt emailed to the customer",
    at: minutesAgo(6),
    icon: CheckIcon,
    iconName: "CheckIcon",
  },
  {
    id: "settled",
    title: "Settlement scheduled",
    description: "T+2 working days to Qeet Pay current account ••0921",
    at: minutesAgo(5),
    icon: BanknoteIcon,
    iconName: "BanknoteIcon",
  },
] as const;

const incident: {
  id: string;
  title: string;
  description: string;
  at: string;
  icon: ComponentType<IconProps<"outline">>;
  tone: TimelineTone;
  label: string;
}[] = [
  {
    id: "detected",
    title: "Refresh-token reuse detected",
    description: "Session ses_04aa presented a rotated token from 185.220.101.7 (Frankfurt, DE)",
    at: minutesAgo(190),
    icon: ShieldAlertIcon,
    tone: "danger",
    label: "Threat",
  },
  {
    id: "revoked",
    title: "Session family revoked",
    description: "Qeet ID signed Kavya Sharma out of every device and product",
    at: minutesAgo(189),
    icon: XIcon,
    tone: "warning",
    label: "Contained",
  },
  {
    id: "notified",
    title: "Security team notified",
    description: "Email to secops@acme.in and a Qeet Notify push to on-call",
    at: minutesAgo(188),
    icon: SendIcon,
    tone: "info",
    label: "Notified",
  },
  {
    id: "resolved",
    title: "Account recovered with a new passkey",
    description: "Kavya re-enrolled after identity verification by Sanjay Gupta",
    at: minutesAgo(31),
    icon: ShieldCheckIcon,
    tone: "success",
    label: "Resolved",
  },
];

/** Meaningful events with housekeeping in between, marked `emphasis="minor"`. */
const scimHistory = [
  { id: "s1", title: "Okta SCIM connected by Rohan Mehta", at: daysAgo(12), minor: false },
  { id: "s2", title: "Sync ran · 0 changes", at: daysAgo(11), minor: true },
  { id: "s3", title: "Sync ran · 2 users updated", at: daysAgo(10), minor: true },
  { id: "s4", title: "Sync ran · 0 changes", at: daysAgo(9), minor: true },
  {
    id: "s5",
    title: "Attribute mapping changed: department ← costCenter",
    at: daysAgo(4),
    minor: false,
  },
  { id: "s6", title: "Sync ran · 11 users updated", at: daysAgo(4), minor: true },
  {
    id: "s7",
    title: "SCIM provisioning: 3 users created from Okta",
    at: minutesAgo(15),
    minor: false,
  },
];

/* ── Playground ────────────────────────────────────────────────────────────────────────────── */

const feedControls = {
  variant: select(["card", "list"] as const, "card"),
  items: num(3, { min: 0, max: auditRecords.length, step: 1, label: "Articles (0 = empty)" }),
  busy: bool(false, "busy (loading more)"),
  "aria-label": text("Security activity for Acme India", "aria-label"),
};

const tones = ["neutral", "brand", "info", "success", "warning", "danger"] as const;

const timelineControls = {
  items: num(4, { min: 2, max: lifecycle.length, step: 1, label: "Items" }),
  indicator: select(["dot", "icon"] as const, "dot", "Indicator"),
  tone: select(tones, "neutral", "tone"),
  descriptions: bool(true, "Descriptions"),
  times: bool(true, "Times"),
};

const noEvents = (
  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
    No security events match these filters in the last 30 days.
  </p>
);

export const examples: FamilyExamples = {
  feed: {
    layout: "wide",
    minHeight: 1700,
    demos: [
      {
        name: "Audit activity",
        description:
          "Each child becomes a focusable article with its position in the set, named from inside by `useFeedItemLabel`; Page Up / Page Down move between articles.",
        render: () => (
          <Feed aria-label="Security activity for Acme India" className="max-w-3xl">
            {auditRecords.map((record) => (
              <AuditArticle key={record.id} record={record} />
            ))}
          </Feed>
        ),
      },
      {
        name: "List variant",
        description:
          '`variant="list"` puts the articles in one bordered surface separated by hairlines — for long, scannable streams such as Qeet Notify deliveries. Each child is an explicit `FeedItem` named by its title (`aria-labelledby`).',
        render: () => (
          <Feed aria-label="Qeet Notify deliveries" variant="list" className="max-w-3xl">
            {deliveries.map((delivery) => (
              <FeedItem key={delivery.id} aria-labelledby={`${delivery.id}-title`}>
                <DeliveryArticle delivery={delivery} />
              </FeedItem>
            ))}
          </Feed>
        ),
      },
      {
        name: "Loading more",
        description: "`busy` sets aria-busy while older articles are fetched.",
        render: () => (
          <div className="flex max-w-3xl flex-col gap-3">
            <Feed aria-label="Older security activity" busy>
              {auditRecords.slice(3).map((record) => (
                <AuditArticle key={record.id} record={record} />
              ))}
            </Feed>
            <div className="flex items-center justify-center gap-2 text-caption text-muted-foreground">
              <Spinner size="sm" aria-hidden className="text-current" />
              Loading events older than 24 hours…
            </div>
          </div>
        ),
      },
      {
        name: "Empty",
        description: "`empty` renders in place of the feed when there are no articles.",
        render: () => (
          <Feed aria-label="Filtered security activity" className="max-w-3xl" empty={noEvents} />
        ),
      },
    ],
    playground: definePlayground({
      controls: feedControls,
      render: (v) => (
        <div className="flex w-full max-w-3xl flex-col gap-3">
          <Feed aria-label={v["aria-label"]} busy={v.busy} variant={v.variant} empty={noEvents}>
            {auditRecords.slice(0, v.items).map((record) => (
              <AuditArticle key={record.id} record={record} />
            ))}
          </Feed>
          {v.busy ? (
            <div className="flex items-center justify-center gap-2 text-caption text-muted-foreground">
              <Spinner size="sm" aria-hidden className="text-current" />
              Loading older events…
            </div>
          ) : (
            v.items > 0 && (
              <Button variant="outline" size="sm" className="self-center">
                Load older events
              </Button>
            )
          )}
        </div>
      ),
      code: (v) =>
        jsx(
          "Feed",
          {
            "aria-label": v["aria-label"],
            variant: v.variant === "card" ? undefined : v.variant,
            busy: v.busy,
            empty: expr("<p>No security events match these filters.</p>"),
          },
          "{events.map((event) => <AuditArticle key={event.id} event={event} />)}",
        ),
    }),
  },

  timeline: {
    layout: "wide",
    minHeight: 1500,
    demos: [
      {
        name: "Invoice lifecycle",
        description: `${invoice.number}: from draft to settlement, newest last.`,
        render: () => (
          <Timeline className="max-w-xl">
            {lifecycle.map((step) => (
              <TimelineItem key={step.id}>
                <TimelineIndicator tone={step.id === "paid" ? "success" : "neutral"} />
                <TimelineContent>
                  <TimelineTitle>{step.title}</TimelineTitle>
                  <TimelineTime dateTime={step.at}>
                    {dateTimeFormat.format(new Date(step.at))}
                  </TimelineTime>
                  <TimelineDescription>{step.description}</TimelineDescription>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        ),
      },
      {
        name: "Icon markers with tones",
        description:
          "`icon` + `tone` on `TimelineIndicator` mark the events that matter; `label` says what the colour means to screen readers.",
        render: () => (
          <Timeline className="max-w-xl">
            {incident.map((step) => {
              const Icon = step.icon;
              return (
                <TimelineItem key={step.id}>
                  <TimelineIndicator
                    icon={<Icon aria-hidden />}
                    tone={step.tone}
                    label={step.label}
                  />
                  <TimelineContent>
                    <TimelineHeader>
                      <TimelineTitle>{step.title}</TimelineTitle>
                      <TimelineTime dateTime={step.at}>{sinceNow(step.at)}</TimelineTime>
                    </TimelineHeader>
                    <TimelineDescription>{step.description}</TimelineDescription>
                  </TimelineContent>
                </TimelineItem>
              );
            })}
          </Timeline>
        ),
      },
      {
        name: "Minor events",
        description:
          '`emphasis="minor"` shrinks housekeeping (scheduled SCIM syncs) into a quiet run between the events that matter.',
        render: () => (
          <Timeline className="max-w-xl">
            {scimHistory.map((event) => (
              <TimelineItem key={event.id} emphasis={event.minor ? "minor" : "default"}>
                <TimelineIndicator tone={event.minor ? "neutral" : "brand"} />
                <TimelineContent>
                  <TimelineHeader>
                    <TimelineTitle>{event.title}</TimelineTitle>
                    <TimelineTime dateTime={event.at}>{sinceNow(event.at)}</TimelineTime>
                  </TimelineHeader>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        ),
      },
      {
        name: "Audit trail, titles only",
        render: () => (
          <Timeline className="max-w-xl">
            {auditRecords.map((record) => (
              <TimelineItem key={record.id}>
                <TimelineIndicator tone={record.outcome === "failure" ? "danger" : "neutral"} />
                <TimelineContent>
                  <TimelineHeader>
                    <TimelineTitle>
                      {record.actor.name}{" "}
                      <span className="font-normal text-muted-foreground">{record.summary}</span>
                    </TimelineTitle>
                    <TimelineTime dateTime={record.timestamp}>
                      {sinceNow(record.timestamp)}
                    </TimelineTime>
                  </TimelineHeader>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        ),
      },
    ],
    playground: definePlayground({
      controls: timelineControls,
      render: (v) => (
        <Timeline className="w-full max-w-xl">
          {lifecycle.slice(0, v.items).map((step) => {
            const Icon = step.icon;
            return (
              <TimelineItem key={step.id}>
                <TimelineIndicator
                  tone={v.tone}
                  icon={v.indicator === "icon" ? <Icon aria-hidden /> : undefined}
                />
                <TimelineContent>
                  <TimelineTitle>{step.title}</TimelineTitle>
                  {v.times && (
                    <TimelineTime dateTime={step.at}>
                      {dateTimeFormat.format(new Date(step.at))}
                    </TimelineTime>
                  )}
                  {v.descriptions && <TimelineDescription>{step.description}</TimelineDescription>}
                </TimelineContent>
              </TimelineItem>
            );
          })}
        </Timeline>
      ),
      code: (v) =>
        jsx(
          "Timeline",
          {},
          lifecycle.slice(0, v.items).map((step) =>
            jsx("TimelineItem", {}, [
              jsx("TimelineIndicator", {
                tone: v.tone === "neutral" ? undefined : v.tone,
                icon: v.indicator === "icon" ? expr(`<${step.iconName} aria-hidden />`) : undefined,
              }),
              jsx("TimelineContent", {}, [
                jsx("TimelineTitle", {}, step.title),
                v.times
                  ? jsx(
                      "TimelineTime",
                      { dateTime: step.at },
                      dateTimeFormat.format(new Date(step.at)),
                    )
                  : "",
                v.descriptions ? jsx("TimelineDescription", {}, step.description) : "",
              ]),
            ]),
          ),
        ),
    }),
  },
};
