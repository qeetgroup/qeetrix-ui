import { Badge, Button, SecurityItem, type StatusKind, toast } from "@qeetrix/ui";
import {
  FingerprintIcon,
  KeyRoundIcon,
  KeySquareIcon,
  LaptopIcon,
  ListChecksIcon,
  MessageSquareIcon,
  MonitorSmartphoneIcon,
  ServerIcon,
  SmartphoneIcon,
} from "lucide-react";
import { apiKeys, dateFormat, minutesAgo, NOW, type Session, sessions } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const relative = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });

function sinceNow(iso: string): string {
  const minutes = Math.round((NOW.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "Active now";
  if (minutes < 60) return relative.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return relative.format(-hours, "hour");
  return relative.format(-Math.round(hours / 24), "day");
}

const sessionIcon = (session: Session) =>
  session.device.startsWith("iPhone") ? (
    <SmartphoneIcon className="size-4" />
  ) : session.os === "Linux" ? (
    <ServerIcon className="size-4" />
  ) : (
    <LaptopIcon className="size-4" />
  );

const sessionStatus = (session: Session): { status: string; kind: StatusKind } =>
  session.risk === "high"
    ? { status: "High risk", kind: "danger" }
    : session.risk === "medium"
      ? { status: "Unusual location", kind: "warning" }
      : { status: "Active", kind: "success" };

const liveKey = apiKeys[0];

const itemControls = {
  title: text("MacBook Pro Touch ID", "title"),
  description: text("Passkey synced with iCloud Keychain", "description"),
  status: select(["active", "pending", "expiring", "revoked", "none"] as const, "active", "status"),
  icon: bool(true, "Icon"),
  badge: bool(false, "badge (Primary)"),
  details: bool(true, "Details"),
  actions: bool(true, "Actions"),
};

export const examples: FamilyExamples = {
  "security-item": {
    layout: "wide",
    minHeight: 1500,
    demos: [
      {
        name: "Passkeys",
        description:
          "One row per credential: what it is, its state, the facts that matter, and what you can do.",
        render: () => (
          <div className="flex max-w-3xl flex-col gap-3">
            <SecurityItem
              title="MacBook Pro Touch ID"
              description="Passkey synced with iCloud Keychain"
              badge={<Badge variant="secondary">Primary</Badge>}
              status="active"
              icon={<FingerprintIcon className="size-4" />}
              details={[
                { label: "Added", value: "12 Aug 2026 from Bengaluru, IN" },
                { label: "Last used", value: sinceNow(minutesAgo(4)) },
                { label: "Backed up", value: "Yes — available on your other Apple devices" },
              ]}
              actions={
                <>
                  <Button size="sm" variant="outline">
                    Rename
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive-text">
                    Remove
                  </Button>
                </>
              }
            />
            <SecurityItem
              title="YubiKey 5C NFC"
              description="Hardware security key · device-bound passkey"
              status="active"
              icon={<KeySquareIcon className="size-4" />}
              details={[
                { label: "Added", value: "3 Feb 2026" },
                { label: "Last used", value: "18 days ago" },
                { label: "Attestation", value: "FIDO2 · Yubico, certified L1" },
              ]}
              actions={
                <Button size="sm" variant="outline">
                  Rename
                </Button>
              }
            />
          </div>
        ),
      },
      {
        name: "Sessions",
        description:
          "Signed-in devices from Qeet ID with the risk signal as the status; `badge` marks this device beside the title, and `headingLevel={4}` fits the rows under a section heading. A danger status tints the icon and draws an inline-start rule.",
        render: () => (
          <div className="flex max-w-3xl flex-col gap-3">
            {sessions.map((session) => {
              const { status, kind } = sessionStatus(session);
              return (
                <SecurityItem
                  key={session.id}
                  title={session.device}
                  description={`${session.browser} on ${session.os}`}
                  status={status}
                  statusKind={kind}
                  badge={session.current ? <Badge variant="brand">This device</Badge> : undefined}
                  headingLevel={4}
                  icon={sessionIcon(session)}
                  details={[
                    { label: "Location", value: `${session.location} · ${session.ip}` },
                    { label: "Signed in with", value: session.method },
                    { label: "Last seen", value: sinceNow(session.lastSeen) },
                  ]}
                  actions={
                    session.current ? undefined : (
                      <Button
                        size="sm"
                        variant={session.risk === "high" ? "destructive" : "outline"}
                        onClick={() => toast.success(`Signed out of ${session.device}`)}
                      >
                        Sign out
                      </Button>
                    )
                  }
                />
              );
            })}
          </div>
        ),
      },
      {
        name: "Two-factor methods",
        description:
          "Fallback factors with their own states: an enabled app, a weak SMS fallback, low recovery codes.",
        render: () => (
          <div className="flex max-w-3xl flex-col gap-3">
            <SecurityItem
              title="Authenticator app"
              description="Google Authenticator on Pixel 9"
              status="enabled"
              icon={<MonitorSmartphoneIcon className="size-4" />}
              details={[{ label: "Added", value: "21 Jan 2025" }]}
              actions={
                <Button size="sm" variant="outline">
                  Replace
                </Button>
              }
            />
            <SecurityItem
              title="SMS one-time codes"
              description="+91 98•••• 4410 · weaker than a passkey; your admin may turn it off"
              status="Fallback only"
              statusKind="warning"
              icon={<MessageSquareIcon className="size-4" />}
              actions={
                <Button size="sm" variant="ghost" className="text-destructive-text">
                  Turn off
                </Button>
              }
            />
            <SecurityItem
              title="Recovery codes"
              description="Single-use codes for when you lose every device"
              status="2 of 10 left"
              statusKind="danger"
              icon={<ListChecksIcon className="size-4" />}
              actions={<Button size="sm">Regenerate</Button>}
            />
          </div>
        ),
      },
      {
        name: "API key",
        render: () => (
          <SecurityItem
            className="max-w-3xl"
            title={liveKey.name}
            description={`Created by ${liveKey.createdBy}`}
            status="live"
            icon={<KeyRoundIcon className="size-4" />}
            details={[
              {
                label: "Key",
                value: <code className="font-mono">{liveKey.prefix}••••••••••••</code>,
              },
              {
                label: "Scopes",
                value: (
                  <span className="flex flex-wrap gap-1">
                    {liveKey.scopes.map((scope) => (
                      <Badge key={scope} variant="outline" className="font-mono">
                        {scope}
                      </Badge>
                    ))}
                  </span>
                ),
              },
              {
                label: "Last used",
                value: liveKey.lastUsed ? sinceNow(liveKey.lastUsed) : "Never",
              },
              { label: "Expires", value: dateFormat.format(new Date(liveKey.expires)) },
            ]}
            actions={
              <>
                <Button size="sm" variant="outline">
                  Rotate
                </Button>
                <Button size="sm" variant="destructive">
                  Revoke
                </Button>
              </>
            }
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: itemControls,
      render: (v) => (
        <SecurityItem
          className="w-full max-w-3xl"
          title={v.title}
          description={v.description || undefined}
          status={v.status === "none" ? undefined : v.status}
          badge={v.badge ? <Badge variant="secondary">Primary</Badge> : undefined}
          icon={v.icon ? <FingerprintIcon className="size-4" /> : undefined}
          details={
            v.details
              ? [
                  { label: "Added", value: "12 Aug 2026 from Bengaluru, IN" },
                  { label: "Last used", value: "4 minutes ago" },
                ]
              : undefined
          }
          actions={
            v.actions ? (
              <Button size="sm" variant="outline">
                Rename
              </Button>
            ) : undefined
          }
        />
      ),
      code: (v) =>
        jsx("SecurityItem", {
          title: v.title,
          description: v.description || undefined,
          status: v.status === "none" ? undefined : v.status,
          badge: v.badge ? expr('<Badge variant="secondary">Primary</Badge>') : undefined,
          icon: v.icon ? expr('<FingerprintIcon className="size-4" />') : undefined,
          details: v.details
            ? expr(
                '[\n  { label: "Added", value: "12 Aug 2026 from Bengaluru, IN" },\n  { label: "Last used", value: "4 minutes ago" },\n]',
              )
            : undefined,
          actions: v.actions
            ? expr('<Button size="sm" variant="outline">Rename</Button>')
            : undefined,
        }),
    }),
  },
};
