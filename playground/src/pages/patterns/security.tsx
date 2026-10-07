import {
  FingerprintPatternIcon,
  KeyRoundIcon,
  LaptopIcon,
  LayoutDashboardIcon,
  MonitorSmartphoneIcon,
  ScrollTextIcon,
  ServerIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  UsersIcon,
} from "@qeetrix/icons";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CodeBlock,
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
  Meter,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TimeSince,
  toast,
} from "@qeetrix/ui";
import { useState } from "react";
// Blocks are copy-paste source in the repo, not exports of @qeetrix/ui: an app copies the file
// and imports it locally, as this page does.
import { AccessReview, type AccessReviewItem } from "@/blocks/access-review/access-review";
import { AuditEvent, AuditLog } from "@/blocks/audit-event/audit-event";
import { SecurityItem } from "@/blocks/security-item/security-item";
import { auditRecords, dateFormat, dateTimeFormat, sessions } from "../../data/qeet";
import { ConsoleFrame } from "./console-frame";

const initialReview: AccessReviewItem[] = [
  {
    id: "billing-admin",
    label: "Billing administrator",
    description: "Edit invoices, refunds and payout accounts",
    state: "granted",
    scope: "Qeet Pay · Acme India",
  },
  {
    id: "user-admin",
    label: "User administrator",
    description: "Invite, suspend and change roles",
    state: "granted",
    scope: "Qeet ID · all groups",
    inherited: true,
  },
  {
    id: "api-keys",
    label: "Manage API keys",
    description: "Create and revoke live keys",
    state: "mixed",
    scope: "3 of 5 applications",
  },
  {
    id: "audit-export",
    label: "Export audit log",
    description: "Download events older than 90 days",
    state: "denied",
    scope: "Qeet Logs",
  },
  {
    id: "owner",
    label: "Tenant owner",
    description: "Transfer ownership, delete tenant",
    state: "granted",
    scope: "Acme India",
    locked: true,
  },
  {
    id: "sso",
    label: "Configure SSO",
    description: "Okta SAML connection settings",
    state: "pending",
    scope: "Qeet ID",
  },
];

const sessionIcon = (device: string) =>
  device.includes("iPhone") ? (
    <SmartphoneIcon />
  ) : device.includes("Linux") ? (
    <ServerIcon />
  ) : (
    <LaptopIcon />
  );

export function SecurityPattern() {
  const [review, setReview] = useState(initialReview);
  const [revoked, setRevoked] = useState<string[]>([]);
  const risky = sessions.find(
    (session) => session.risk === "high" && !revoked.includes(session.id),
  );
  return (
    <ConsoleFrame
      product="Qeet ID"
      tenant="Acme India Pvt Ltd"
      crumbs={["Acme India", "Security", "Rohan Mehta"]}
      nav={[
        { label: "Overview", items: [{ label: "Dashboard", icon: LayoutDashboardIcon }] },
        { label: "Directory", items: [{ label: "Users", icon: UsersIcon }] },
        {
          label: "Security",
          items: [
            { label: "Account security", icon: ShieldCheckIcon, active: true },
            { label: "Passkeys", icon: FingerprintPatternIcon },
            { label: "Audit log", icon: ScrollTextIcon },
          ],
        },
      ]}
    >
      <PageHeader
        title="Security for Rohan Mehta"
        description="Admin · rohan.mehta@acme.in · passkeys required by the admin-mfa policy (v7)."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              toast.success("Recovery codes regenerated", {
                description: "The previous 10 codes no longer work.",
              })
            }
          >
            <KeyRoundIcon data-icon="inline-start" aria-hidden />
            Regenerate recovery codes
          </Button>
        }
      />
      {risky && (
        <Alert variant="destructive">
          <ShieldAlertIcon aria-hidden />
          <AlertTitle>Unrecognised session from {risky.location}</AlertTitle>
          <AlertDescription>
            {risky.browser} on {risky.os} signed in with a password and TOTP at{" "}
            {dateTimeFormat.format(new Date(risky.createdAt))}. Refresh-token reuse was detected;
            revoke it unless you recognise it.
          </AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue="devices">
        <TabsList>
          <TabsTrigger value="devices">Passkeys &amp; sessions</TabsTrigger>
          <TabsTrigger value="access">Access review</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>
        <TabsContent value="devices" className="flex flex-col gap-6 pt-2">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-sm font-semibold">Passkeys</h2>
              <SecurityItem
                icon={<FingerprintPatternIcon />}
                title="MacBook Pro Touch ID"
                description="iCloud Keychain · synced passkey"
                status="active"
                details={[
                  { label: "Added", value: dateFormat.format(new Date("2026-03-14")) },
                  {
                    label: "Last used",
                    value: <TimeSince value={sessions[0]?.lastSeen ?? ""} locale="en-IN" />,
                  },
                  {
                    label: "AAGUID",
                    value: <code className="font-mono">fbfc3007-154e-4ecc-8c0b-6e020557d7bd</code>,
                  },
                ]}
                actions={
                  <Button variant="ghost" size="sm">
                    Rename
                  </Button>
                }
              />
              <SecurityItem
                icon={<KeyRoundIcon />}
                title="YubiKey 5C NFC"
                description="Hardware security key · device-bound"
                status="active"
                details={[
                  { label: "Added", value: dateFormat.format(new Date("2025-11-02")) },
                  { label: "Last used", value: "12 days ago" },
                ]}
                actions={
                  <Button variant="ghost" size="sm">
                    Remove
                  </Button>
                }
              />
              <h2 className="mt-3 font-heading text-sm font-semibold">Sessions</h2>
              {sessions
                .filter((session) => !revoked.includes(session.id))
                .map((session) => (
                  <SecurityItem
                    key={session.id}
                    icon={sessionIcon(session.device)}
                    title={`${session.device} · ${session.browser}`}
                    description={`${session.location} · ${session.ip}`}
                    status={
                      session.current ? "active" : session.risk === "high" ? "suspended" : "enabled"
                    }
                    statusKind={
                      session.risk === "high" ? "danger" : session.current ? "success" : "neutral"
                    }
                    details={[
                      { label: "Signed in with", value: session.method },
                      {
                        label: "Last seen",
                        value: <TimeSince value={session.lastSeen} locale="en-IN" />,
                      },
                      { label: "Session", value: <code className="font-mono">{session.id}</code> },
                    ]}
                    actions={
                      session.current ? (
                        <Badge variant="outline">This device</Badge>
                      ) : (
                        <Button
                          variant={session.risk === "high" ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => {
                            setRevoked((list) => [...list, session.id]);
                            toast.success("Session revoked", {
                              description: `${session.device} was signed out.`,
                            });
                          }}
                        >
                          Revoke
                        </Button>
                      )
                    }
                  />
                ))}
            </div>
            <Card size="sm" className="self-start">
              <CardHeader>
                <CardTitle>Security posture</CardTitle>
                <CardDescription>Against the Acme India admin policy</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Meter label="Phishing-resistant sign-ins" value={94} intent="success" />
                <Meter label="Sessions within max age" value={75} intent="warning" />
                <DescriptionList className="gap-y-1.5 text-sm sm:grid-cols-[1fr_auto]">
                  <DescriptionTerm>Recovery codes</DescriptionTerm>
                  <DescriptionDetails>8 of 10 left</DescriptionDetails>
                  <DescriptionTerm>Last password</DescriptionTerm>
                  <DescriptionDetails>Never set</DescriptionDetails>
                  <DescriptionTerm>Devices</DescriptionTerm>
                  <DescriptionDetails className="inline-flex items-center gap-1">
                    <MonitorSmartphoneIcon aria-hidden className="size-3.5" />3
                  </DescriptionDetails>
                </DescriptionList>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="access" className="flex flex-col gap-3 pt-2">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Q3 2026 access review</CardTitle>
              <CardDescription>
                Certify Rohan’s entitlements by 15 Oct. Inherited and locked grants are reviewed on
                their source.
              </CardDescription>
              <CardAction>
                <Button
                  size="sm"
                  onClick={() =>
                    toast.success("Review submitted", {
                      description: "Sent to Ananya Iyer for sign-off.",
                    })
                  }
                >
                  Submit review
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <AccessReview
                aria-label="Rohan Mehta's entitlements"
                items={review}
                onStateChange={(id, state) =>
                  setReview((items) =>
                    items.map((item) => (item.id === id ? { ...item, state } : item)),
                  )
                }
                renderActions={(item) => (
                  <Button variant="ghost" size="sm" disabled={item.locked}>
                    History
                  </Button>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audit" className="pt-2">
          <AuditLog aria-label="Audit trail">
            {auditRecords.map((record) => (
              <AuditEvent
                key={record.id}
                eventId={record.id}
                actor={record.actor.name}
                action={record.summary}
                resource={record.target}
                timestamp={record.timestamp}
                locale="en-IN"
                severity={
                  record.outcome === "failure"
                    ? "danger"
                    : record.action.startsWith("session")
                      ? "warning"
                      : "success"
                }
                description={`${record.action} · ${record.ip} · ${record.location}`}
                diff={
                  record.changes ? (
                    <ul className="flex flex-col gap-1 text-sm">
                      {record.changes.map((change) => (
                        <li key={change.field}>
                          <code className="font-mono text-xs">{change.field}</code>:{" "}
                          <span className="text-destructive-text line-through">{change.from}</span>{" "}
                          → <span className="text-success-text">{change.to}</span>
                        </li>
                      ))}
                    </ul>
                  ) : undefined
                }
                raw={
                  <CodeBlock
                    language="json"
                    copy={false}
                    value={JSON.stringify(record, null, 2)}
                    maxHeight="max-h-48"
                  />
                }
              />
            ))}
          </AuditLog>
        </TabsContent>
      </Tabs>
    </ConsoleFrame>
  );
}
