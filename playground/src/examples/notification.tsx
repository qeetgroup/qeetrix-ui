import { FingerprintPatternIcon } from "@qeetrix/icons";
import { Button, Notification } from "@qeetrix/ui";
import { useState } from "react";
import { formatInr } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/* ── Notification ─────────────────────────────────────────────────────────────────────────── */

const notificationVariants = ["info", "success", "warning", "destructive", "error"] as const;

const notificationControls = {
  variant: select(notificationVariants, "warning"),
  title: text("Settlement delayed — HDFC NEFT window", "Title"),
  description: text(
    `Today’s payout of ${formatInr(482310.5)} will be credited after the 14:00 IST batch.`,
    "Description",
  ),
  time: text("12 min ago", "Time (opposite the title)"),
  unread: bool(true, "Unread (dot + semibold title)"),
  size: select(["default", "sm"] as const, "default"),
  dismissible: bool(true, "Dismissible (onClose)"),
  action: bool(true, "Action"),
  loading: bool(false, "Loading (spinner, aria-busy)"),
  icon: bool(true, "Show icon"),
};

const inboxSeed = [
  {
    id: "ntf_security",
    variant: "warning",
    title: "New sign-in from Frankfurt, DE",
    description: "curl/8.9 on Linux · 185.220.101.7. Revoke the session if this wasn’t you.",
    time: "3 min ago",
  },
  {
    id: "ntf_paid",
    variant: "success",
    title: "Invoice QP-INV-2026-00411 paid",
    description: `${formatInr(1386500)} received from Bharat FinServ via NACH.`,
    time: "6 min ago",
  },
  {
    id: "ntf_scim",
    variant: "info",
    title: "Okta SCIM sync complete",
    description: "3 users created, 11 updated, 0 errors.",
    time: "15 min ago",
  },
] as const;

/** Events for the activity feed: unread ones first, newest first. */
const feedSeed = [
  {
    id: "evt_reuse",
    variant: "error",
    title: "Refresh token reuse detected",
    description: "Kavya Sharma’s session family was revoked.",
    time: "12 min",
  },
  {
    id: "evt_quota",
    variant: "warning",
    title: "Ingest at 92% of quota",
    description: "qeet-logs-ingest samples debug logs at 100%.",
    time: "38 min",
  },
  {
    id: "evt_mention",
    variant: "info",
    title: "Priya Nair mentioned you",
    description: "“@Rohan can you approve the Staging CI key scopes?”",
    time: "1 h",
  },
  {
    id: "evt_paid",
    variant: "success",
    title: "Invoice QP-INV-2026-00410 paid",
    description: `${formatInr(96880)} from Zenvia Health via UPI.`,
    time: "3 h",
  },
] as const;

function ActivityFeedDemo() {
  const [unread, setUnread] = useState<readonly string[]>([
    "evt_reuse",
    "evt_quota",
    "evt_mention",
  ]);
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Activity · {unread.length} unread</span>
        <Button
          size="xs"
          variant="ghost"
          disabled={unread.length === 0}
          onClick={() => setUnread([])}
        >
          Mark all read
        </Button>
      </div>
      <ul className="flex flex-col gap-2">
        {feedSeed.map((event) => (
          <Notification
            key={event.id}
            // A list item, not a live region: in a feed every card must not announce itself.
            role="listitem"
            aria-live="off"
            size="sm"
            variant={event.variant}
            unread={unread.includes(event.id)}
            title={event.title}
            description={event.description}
            time={event.time}
          />
        ))}
      </ul>
    </div>
  );
}

function DismissibleNotificationsDemo() {
  const [visible, setVisible] = useState<readonly string[]>(inboxSeed.map((item) => item.id));
  const shown = inboxSeed.filter((item) => visible.includes(item.id));
  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {shown.map((item) => (
        <Notification
          key={item.id}
          variant={item.variant}
          title={item.title}
          description={item.description}
          time={item.time}
          onClose={() => setVisible((ids) => ids.filter((id) => id !== item.id))}
          action={
            item.id === "ntf_security" ? (
              <Button size="sm" variant="outline">
                Review sessions
              </Button>
            ) : undefined
          }
        />
      ))}
      {shown.length === 0 && (
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => setVisible(inboxSeed.map((item) => item.id))}
        >
          Restore notifications
        </Button>
      )}
    </div>
  );
}

function NotificationPlayground({
  variant,
  title,
  description,
  time,
  unread,
  size,
  dismissible,
  action,
  loading,
  icon,
}: {
  variant: (typeof notificationVariants)[number];
  title: string;
  description: string;
  time: string;
  unread: boolean;
  size: "default" | "sm";
  dismissible: boolean;
  action: boolean;
  loading: boolean;
  icon: boolean;
}) {
  const [closed, setClosed] = useState(false);
  if (closed) {
    return (
      <Button size="sm" variant="outline" onClick={() => setClosed(false)}>
        Restore notification
      </Button>
    );
  }
  return (
    <div className="w-[26rem] max-w-full">
      <Notification
        variant={variant}
        title={title || undefined}
        description={description || undefined}
        time={time || undefined}
        unread={unread}
        size={size}
        loading={loading}
        icon={icon ? undefined : null}
        onClose={dismissible ? () => setClosed(true) : undefined}
        action={
          action ? (
            <Button size="sm" variant="outline">
              View payout
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

export const examples: FamilyExamples = {
  notification: {
    layout: "wide",
    minHeight: 1100,
    demos: [
      {
        name: "Variants",
        description:
          "The status lives in the icon tile; `destructive`/`error` are role=alert (assertive), the rest role=status.",
        render: () => (
          <div className="flex w-full max-w-md flex-col gap-3">
            <Notification
              title="Passkeys are now required for admins"
              description="From 1 Nov, Owners and Admins must sign in with a passkey."
            />
            <Notification
              variant="success"
              title="Invoice QP-INV-2026-00410 paid"
              description={`${formatInr(96880)} from Zenvia Health via UPI.`}
            />
            <Notification
              variant="warning"
              title="Settlement delayed — HDFC NEFT window"
              description={`Today’s payout of ${formatInr(482310.5)} lands after the 14:00 IST batch.`}
            />
            <Notification
              variant="destructive"
              title="SMS OTPs failing"
              description="DLT template otp_login_v3 isn’t registered. Users fall back to WhatsApp."
            />
          </div>
        ),
      },
      {
        name: "Error (alias)",
        description: "`error` predates `destructive` and is announced assertively.",
        render: () => (
          <div className="w-full max-w-md">
            <Notification
              variant="error"
              title="Webhook deliveries failing"
              description="https://acme.in/hooks/qeet-pay returned 500 for the last 14 events."
            />
          </div>
        ),
      },
      {
        name: "Feed: unread and time",
        description:
          "`unread` adds a Qeet dot and a semibold title; `time` sits opposite. In a feed, override the live-region role.",
        render: () => <ActivityFeedDemo />,
      },
      {
        name: "Dismissible, with action",
        render: () => <DismissibleNotificationsDemo />,
      },
      {
        name: "Sizes",
        render: () => (
          <div className="flex w-full max-w-md flex-col gap-3">
            <Notification
              variant="success"
              title="GSTR-1 for September filed"
              description="ARN AA2910260012345 · 214 invoices."
              time="Yesterday"
            />
            <Notification
              size="sm"
              variant="success"
              title="GSTR-1 for September filed"
              description="ARN AA2910260012345 · 214 invoices."
              time="Yesterday"
            />
          </div>
        ),
      },
      {
        name: "Loading",
        render: () => (
          <div className="w-full max-w-md">
            <Notification
              loading
              title="Syncing directory"
              description="Importing 214 users from Okta. You can leave this page."
            />
          </div>
        ),
      },
      {
        name: "Custom icon, no icon",
        render: () => (
          <div className="flex w-full max-w-md flex-col gap-3">
            <Notification
              variant="success"
              icon={<FingerprintPatternIcon aria-hidden />}
              title="Passkey added"
              description="“MacBook Pro 14″ — Chrome” can now sign in to Acme India."
            />
            <Notification
              icon={null}
              title="Weekly digest sent"
              description="Delivered to 1,842 members by email."
            />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: notificationControls,
      render: (v) => <NotificationPlayground key={v.variant} {...v} />,
      code: (v) =>
        jsx("Notification", {
          variant: v.variant === "info" ? undefined : v.variant,
          title: v.title || undefined,
          description: v.description || undefined,
          time: v.time || undefined,
          unread: v.unread,
          size: v.size === "default" ? undefined : v.size,
          loading: v.loading,
          icon: v.icon ? undefined : expr("null"),
          onClose: v.dismissible ? expr("() => dismiss(notification.id)") : undefined,
          action: v.action
            ? expr('<Button size="sm" variant="outline">View payout</Button>')
            : undefined,
        }),
    }),
  },
};
