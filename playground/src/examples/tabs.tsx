import {
  BellIcon,
  FileClockIcon,
  MonitorSmartphoneIcon,
  ReceiptIcon,
  ShieldIcon,
  UserIcon,
} from "@qeetrix/icons";
import {
  Badge,
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@qeetrix/ui";
import { auditRecords, dateFormat, NOW, sessions, users } from "../data/qeet";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select } from "../registry/types";

const rohan = users[1];

function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((NOW.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
}

const riskVariant = { low: "success", medium: "warning", high: "destructive" } as const;
const riskLabel = { low: "Low risk", medium: "Medium risk", high: "High risk" } as const;

function OverviewPanel() {
  return (
    <DescriptionList className="sm:grid-cols-[9rem_1fr]">
      <DescriptionTerm>Email</DescriptionTerm>
      <DescriptionDetails>{rohan.email}</DescriptionDetails>
      <DescriptionTerm>Role</DescriptionTerm>
      <DescriptionDetails>{rohan.role}</DescriptionDetails>
      <DescriptionTerm>Department</DescriptionTerm>
      <DescriptionDetails>
        {rohan.department} · {rohan.location}
      </DescriptionDetails>
      <DescriptionTerm>Sign-in method</DescriptionTerm>
      <DescriptionDetails>Passkey (2 registered)</DescriptionDetails>
      <DescriptionTerm>Member since</DescriptionTerm>
      <DescriptionDetails>{dateFormat.format(new Date(rohan.createdAt))}</DescriptionDetails>
    </DescriptionList>
  );
}

function SessionsPanel() {
  return (
    <ul className="divide-y rounded-lg border text-sm">
      {sessions.map((session) => (
        <li key={session.id} className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-medium">
              {session.device} · {session.browser}
              {session.current && <span className="text-muted-foreground"> (this device)</span>}
            </p>
            <p className="truncate text-caption text-muted-foreground">
              {session.location} · {session.method} · {ago(session.lastSeen)}
            </p>
          </div>
          <Badge variant={riskVariant[session.risk]}>{riskLabel[session.risk]}</Badge>
        </li>
      ))}
    </ul>
  );
}

function AuditPanel() {
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {auditRecords.slice(0, 4).map((record) => (
        <li key={record.id} className="flex items-baseline justify-between gap-3">
          <span className="min-w-0">
            <span className="font-medium">{record.actor.name}</span>{" "}
            <span className="text-muted-foreground">{record.summary}</span>
          </span>
          <span className="shrink-0 text-caption text-muted-foreground">
            {ago(record.timestamp)}
          </span>
        </li>
      ))}
    </ul>
  );
}

const tabValues = ["overview", "sessions", "audit"] as const;

function UserTabs({
  defaultValue = "overview",
  orientation = "horizontal",
  variant = "default",
  activateOnFocus = false,
  icons = true,
  disableAudit = false,
}: {
  defaultValue?: (typeof tabValues)[number];
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "line";
  activateOnFocus?: boolean;
  icons?: boolean;
  disableAudit?: boolean;
}) {
  return (
    <Tabs defaultValue={defaultValue} orientation={orientation} className="w-full max-w-xl">
      <TabsList variant={variant} activateOnFocus={activateOnFocus}>
        <TabsTrigger value="overview">
          {icons && <UserIcon aria-hidden />}
          Overview
        </TabsTrigger>
        <TabsTrigger value="sessions">
          {icons && <MonitorSmartphoneIcon aria-hidden />}
          Sessions
          <Badge variant="secondary" className="px-1.5">
            {sessions.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="audit" disabled={disableAudit}>
          {icons && <FileClockIcon aria-hidden />}
          Audit log
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <OverviewPanel />
      </TabsContent>
      <TabsContent value="sessions">
        <SessionsPanel />
      </TabsContent>
      <TabsContent value="audit">
        <AuditPanel />
      </TabsContent>
    </Tabs>
  );
}

const settingsSections = [
  {
    value: "general",
    label: "General",
    icon: UserIcon,
    body: "Tenant name, primary domain (acme.in) and default locale (English – India).",
  },
  {
    value: "security",
    label: "Security",
    icon: ShieldIcon,
    body: "Passkeys are required for Owners and Admins; sessions expire after 12 hours.",
  },
  {
    value: "billing",
    label: "Billing",
    icon: ReceiptIcon,
    body: "GSTIN 29AAACA1234F1Z5 · invoices emailed to accounts@acme.in on the 1st.",
  },
  {
    value: "notifications",
    label: "Notifications",
    icon: BellIcon,
    body: "Security alerts go to email and WhatsApp; weekly digests by email only.",
  },
] as const;

const tabsControls = {
  variant: select(["default", "line"] as const, "default", "variant (TabsList)"),
  orientation: select(["horizontal", "vertical"] as const, "horizontal"),
  defaultValue: select(tabValues, "overview"),
  activateOnFocus: bool(false, "activateOnFocus (TabsList)"),
  icons: bool(true, "Icons"),
  disableAudit: bool(false, "Disable “Audit log”"),
};

export const examples: FamilyExamples = {
  tabs: {
    layout: "wide",
    minHeight: 1180,
    demos: [
      {
        name: "User detail",
        description:
          "Overview, Sessions and Audit log for one user. Arrow keys move between tabs; Enter or Space activates.",
        render: () => <UserTabs />,
      },
      {
        name: "Line",
        description:
          '`variant="line"` on TabsList: tabs on a 1px track with a Qeet underline for the selected one — for page- and section-level navigation. The contained default suits a card or a panel.',
        render: () => <UserTabs variant="line" defaultValue="sessions" />,
      },
      {
        name: "Line, vertical",
        description:
          "Vertical line tabs put the indicator on the inline-start track, like the sidebar.",
        render: () => (
          <Tabs defaultValue="billing" orientation="vertical" className="w-full max-w-xl">
            <TabsList variant="line">
              {settingsSections.map((section) => (
                <TabsTrigger key={section.value} value={section.value}>
                  <section.icon aria-hidden />
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {settingsSections.map((section) => (
              <TabsContent key={section.value} value={section.value} className="text-sm">
                <p className="font-medium">{section.label}</p>
                <p className="text-muted-foreground">{section.body}</p>
              </TabsContent>
            ))}
          </Tabs>
        ),
      },
      {
        name: "Vertical",
        render: () => (
          <Tabs defaultValue="security" orientation="vertical" className="w-full max-w-xl">
            <TabsList>
              {settingsSections.map((section) => (
                <TabsTrigger key={section.value} value={section.value}>
                  <section.icon aria-hidden />
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {settingsSections.map((section) => (
              <TabsContent key={section.value} value={section.value} className="text-sm">
                <p className="font-medium">{section.label}</p>
                <p className="text-muted-foreground">{section.body}</p>
              </TabsContent>
            ))}
          </Tabs>
        ),
      },
      {
        name: "Disabled tab",
        description:
          "An Auditor-only tab, disabled for this Developer: still reachable with the arrow keys (aria-disabled) but it cannot be selected.",
        render: () => <UserTabs defaultValue="sessions" icons={false} disableAudit />,
      },
    ],
    playground: definePlayground({
      controls: tabsControls,
      render: (v) => (
        <UserTabs
          key={`${v.defaultValue}-${v.orientation}-${v.variant}`}
          defaultValue={v.defaultValue}
          orientation={v.orientation}
          variant={v.variant}
          activateOnFocus={v.activateOnFocus}
          icons={v.icons}
          disableAudit={v.disableAudit}
        />
      ),
      code: (v) =>
        jsx(
          "Tabs",
          { defaultValue: v.defaultValue, ...changedProps(v, tabsControls, ["orientation"]) },
          [
            jsx("TabsList", changedProps(v, tabsControls, ["variant", "activateOnFocus"]), [
              jsx("TabsTrigger", { value: "overview" }, [
                v.icons ? "<UserIcon />" : "",
                "Overview",
              ]),
              jsx("TabsTrigger", { value: "sessions" }, [
                v.icons ? "<MonitorSmartphoneIcon />" : "",
                "Sessions",
              ]),
              jsx("TabsTrigger", { value: "audit", disabled: v.disableAudit }, [
                v.icons ? "<FileClockIcon />" : "",
                "Audit log",
              ]),
            ]),
            jsx("TabsContent", { value: "overview" }, "…"),
            jsx("TabsContent", { value: "sessions" }, "…"),
            jsx("TabsContent", { value: "audit" }, "…"),
          ],
        ),
    }),
  },
};
