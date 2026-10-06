import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Banner,
  Button,
  Callout,
} from "@qeetrix/ui";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  InfoIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WrenchIcon,
} from "lucide-react";
import { type ComponentType, useState } from "react";
import { formatInr } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/* ── Alert ────────────────────────────────────────────────────────────────────────────────── */

const alertVariants = ["default", "info", "success", "warning", "destructive", "danger"] as const;
type AlertVariant = (typeof alertVariants)[number];

/** The icon a consumer would pick for each tone (Alert has no built-in icon). */
const alertIcons: Record<
  AlertVariant,
  { icon: ComponentType<{ className?: string }>; name: string }
> = {
  default: { icon: KeyRoundIcon, name: "KeyRoundIcon" },
  info: { icon: InfoIcon, name: "InfoIcon" },
  success: { icon: CheckCircle2Icon, name: "CheckCircle2Icon" },
  warning: { icon: AlertTriangleIcon, name: "AlertTriangleIcon" },
  destructive: { icon: CircleAlertIcon, name: "CircleAlertIcon" },
  danger: { icon: CircleAlertIcon, name: "CircleAlertIcon" },
};

const alertControls = {
  variant: select(alertVariants, "warning"),
  title: text("Settlement delayed — HDFC NEFT window", "Title"),
  description: text(
    `Today’s payout of ${formatInr(482310.5)} will be credited after the 14:00 IST NEFT batch.`,
    "Description",
  ),
  icon: bool(true, "Leading icon"),
  action: bool(false, "Action (AlertAction)"),
  role: select(["alert", "status"] as const, "alert", "role (alert interrupts; status is polite)"),
};

function AlertPlayground({
  variant,
  title,
  description,
  icon,
  action,
  role,
}: {
  variant: AlertVariant;
  title: string;
  description: string;
  icon: boolean;
  action: boolean;
  role: "alert" | "status";
}) {
  const Icon = alertIcons[variant].icon;
  return (
    <div className="w-full max-w-xl">
      <Alert variant={variant} role={role}>
        {icon && <Icon aria-hidden />}
        {title && <AlertTitle>{title}</AlertTitle>}
        {description && <AlertDescription>{description}</AlertDescription>}
        {action && (
          <AlertAction>
            <Button size="sm" variant="outline">
              View payout
            </Button>
          </AlertAction>
        )}
      </Alert>
    </div>
  );
}

/* ── Banner ───────────────────────────────────────────────────────────────────────────────── */

const bannerVariants = ["default", "info", "success", "warning", "destructive", "danger"] as const;

const bannerControls = {
  variant: select(bannerVariants, "info"),
  message: text(
    "Scheduled maintenance for ap-south-1 (Mumbai) on 12 Oct, 01:00–03:00 IST.",
    "Message",
  ),
  icon: select(["default", "custom", "none"] as const, "default", "Icon"),
  link: bool(true, "Trailing link"),
  dismissible: bool(true, "Dismissible (onDismiss)"),
};

const STATUS_URL = "https://status.qeet.in/incidents/ap-south-1-maintenance";

function DismissibleBannerDemo() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-2.5 text-sm text-muted-foreground">
        Banner dismissed for this session.
        <Button size="xs" variant="outline" onClick={() => setDismissed(false)}>
          Show again
        </Button>
      </div>
    );
  }
  return (
    <Banner
      variant="warning"
      aria-label="Maintenance notice"
      icon={<WrenchIcon aria-hidden />}
      onDismiss={() => setDismissed(true)}
    >
      <span>
        ap-south-1 maintenance tonight 01:00–03:00 IST — the admin console will be read-only.{" "}
        <a href={STATUS_URL} target="_blank" rel="noreferrer">
          Status page
        </a>
      </span>
    </Banner>
  );
}

function BannerPlayground({
  variant,
  message,
  icon,
  link,
  dismissible,
}: {
  variant: (typeof bannerVariants)[number];
  message: string;
  icon: "default" | "custom" | "none";
  link: boolean;
  dismissible: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  return (
    <div className="w-full max-w-3xl">
      {dismissed ? (
        <Button size="sm" variant="outline" onClick={() => setDismissed(false)}>
          Restore banner
        </Button>
      ) : (
        <Banner
          variant={variant}
          aria-label="Announcement"
          icon={icon === "none" ? null : icon === "custom" ? <WrenchIcon aria-hidden /> : undefined}
          onDismiss={dismissible ? () => setDismissed(true) : undefined}
        >
          <span>
            {message}
            {link && (
              <>
                {" "}
                <a href={STATUS_URL} target="_blank" rel="noreferrer">
                  View status
                </a>
              </>
            )}
          </span>
        </Banner>
      )}
    </div>
  );
}

/* ── Callout ──────────────────────────────────────────────────────────────────────────────── */

const calloutVariants = ["info", "success", "warning", "destructive", "error", "muted"] as const;

const calloutControls = {
  variant: select(calloutVariants, "warning"),
  title: text("GSTR-1 due in 3 days", "Title"),
  children: text(
    "File outward supplies for September 2026 by 11 Oct to avoid the ₹50/day late fee.",
    "Body",
  ),
  icon: select(["default", "custom", "none"] as const, "default", "Icon"),
};

export const examples: FamilyExamples = {
  alert: {
    layout: "wide",
    minHeight: 700,
    demos: [
      {
        name: "Variants",
        description:
          "Every tone side by side. Alert has no built-in icon — pass a Lucide icon as the first child.",
        render: () => (
          <div className="flex w-full max-w-2xl flex-col gap-3">
            <Alert>
              <KeyRoundIcon aria-hidden />
              <AlertTitle>Signing key rotates on 1 Nov</AlertTitle>
              <AlertDescription>
                The webhook signing secret for Checkout service (prod) is 340 days old. Qeet Pay
                will issue a new one automatically.
              </AlertDescription>
            </Alert>
            <Alert variant="info">
              <ShieldCheckIcon aria-hidden />
              <AlertTitle>Passkeys are now required for admins</AlertTitle>
              <AlertDescription>
                From 1 Nov, Owners and Admins of Acme India must sign in with a passkey. 2 admins
                haven’t enrolled one yet.
              </AlertDescription>
            </Alert>
            <Alert variant="success">
              <CheckCircle2Icon aria-hidden />
              <AlertTitle>Settlement credited</AlertTitle>
              <AlertDescription>
                {formatInr(1386500)} for QP-INV-2026-00411 reached HDFC Bank ••4821 via NACH.
              </AlertDescription>
            </Alert>
            <Alert variant="warning">
              <AlertTriangleIcon aria-hidden />
              <AlertTitle>Settlement delayed — HDFC NEFT window</AlertTitle>
              <AlertDescription>
                Today’s payout of {formatInr(482310.5)} will be credited after the 14:00 IST NEFT
                batch.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden />
              <AlertTitle>SCIM sync failed</AlertTitle>
              <AlertDescription>
                Okta returned 401 Unauthorized. Rotate the SCIM bearer token in Settings → Directory
                sync.
              </AlertDescription>
            </Alert>
          </div>
        ),
      },
      {
        name: "Danger (alias)",
        description:
          "`danger` predates `destructive` and renders identically; prefer `destructive` in new code.",
        render: () => (
          <div className="w-full max-w-2xl">
            <Alert variant="danger">
              <CircleAlertIcon aria-hidden />
              <AlertTitle>Refresh token reuse detected</AlertTitle>
              <AlertDescription>
                The session family for Kavya Sharma was revoked. She will need to sign in again.
              </AlertDescription>
            </Alert>
          </div>
        ),
      },
      {
        name: "With action",
        description: "`AlertAction` puts trailing actions in their own column beside the text.",
        render: () => (
          <div className="w-full max-w-2xl">
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden />
              <AlertTitle>Couldn’t reach the HDFC settlement API</AlertTitle>
              <AlertDescription>Last successful sync 18 minutes ago.</AlertDescription>
              <AlertAction>
                <Button size="sm" variant="outline">
                  <RefreshCwIcon data-icon="inline-start" aria-hidden />
                  Retry
                </Button>
              </AlertAction>
            </Alert>
          </div>
        ),
      },
      {
        name: "Actions below",
        description: "Several follow-ups read better in a column-2 row under the text.",
        render: () => (
          <div className="w-full max-w-2xl">
            <Alert variant="info">
              <InfoIcon aria-hidden />
              <AlertTitle>Verify acme.in to turn on SSO</AlertTitle>
              <AlertDescription>
                Add the TXT record below to your DNS. Verification usually completes within 15
                minutes.
              </AlertDescription>
              <div className="col-start-2 mt-2 flex flex-wrap gap-2">
                <Button size="sm">Copy TXT record</Button>
                <Button size="sm" variant="outline">
                  Remind me later
                </Button>
              </div>
            </Alert>
          </div>
        ),
      },
      {
        name: "Polite, title only",
        description:
          'For a message already on screen at load, `role="status"` announces without interrupting.',
        render: () => (
          <div className="w-full max-w-2xl">
            <Alert variant="success" role="status">
              <CheckCircle2Icon aria-hidden />
              <AlertTitle>Invoice QP-INV-2026-00410 marked as paid.</AlertTitle>
            </Alert>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: alertControls,
      render: (v) => <AlertPlayground {...v} />,
      code: (v) =>
        jsx(
          "Alert",
          {
            variant: v.variant === "default" ? undefined : v.variant,
            role: v.role === "alert" ? undefined : v.role,
          },
          [
            v.icon ? `<${alertIcons[v.variant].name} aria-hidden />` : "",
            v.title ? jsx("AlertTitle", {}, v.title) : "",
            v.description ? jsx("AlertDescription", {}, v.description) : "",
            v.action
              ? jsx("AlertAction", {}, [
                  jsx("Button", { size: "sm", variant: "outline" }, "View payout"),
                ])
              : "",
          ],
        ),
    }),
  },

  banner: {
    layout: "wide",
    minHeight: 460,
    demos: [
      {
        name: "Variants",
        description:
          "Calm, full-width bars with a per-variant icon; links inside are underlined automatically.",
        render: () => (
          <div className="flex w-full flex-col gap-2">
            <Banner aria-label="Product update" icon={<SparklesIcon aria-hidden />}>
              <span>
                Qeet Logs query language v3 is in beta.{" "}
                <a href="https://docs.qeet.in/logs/query-v3" target="_blank" rel="noreferrer">
                  Try it
                </a>
              </span>
            </Banner>
            <Banner variant="info" aria-label="Maintenance notice">
              <span>
                Scheduled maintenance for ap-south-1 (Mumbai) on 12 Oct, 01:00–03:00 IST.{" "}
                <a href={STATUS_URL} target="_blank" rel="noreferrer">
                  Details
                </a>
              </span>
            </Banner>
            <Banner variant="success" aria-label="Product update">
              <span>UPI AutoPay mandates are now live on every Growth plan.</span>
            </Banner>
            <Banner variant="warning" aria-label="Plan limit">
              <span>
                Log ingest is at 92% of this month’s quota.{" "}
                <a href="https://console.qeet.in/billing/plan" target="_blank" rel="noreferrer">
                  Upgrade plan
                </a>
              </span>
            </Banner>
            <Banner variant="destructive" aria-label="Payouts paused">
              <span>
                Payouts paused: KYC documents for Acme India have expired.{" "}
                <a href="https://console.qeet.in/pay/kyc" target="_blank" rel="noreferrer">
                  Re-submit KYC
                </a>
              </span>
            </Banner>
          </div>
        ),
      },
      {
        name: "Danger (alias)",
        description: "`danger` is the older name for `destructive`; both render the same bar.",
        render: () => (
          <Banner variant="danger" aria-label="Access policy">
            <span>Sign-ins from outside India are blocked by your tenant’s geo policy.</span>
          </Banner>
        ),
      },
      {
        name: "Dismissible, custom icon",
        description:
          "`onDismiss` renders the close button (the caller hides it); `icon` replaces the default.",
        render: () => <DismissibleBannerDemo />,
      },
      {
        name: "No icon",
        render: () => (
          <Banner variant="info" icon={null} aria-label="Announcement">
            <span>Qeet Notify now delivers WhatsApp templates in Hindi, Tamil and Marathi.</span>
          </Banner>
        ),
      },
    ],
    playground: definePlayground({
      controls: bannerControls,
      render: (v) => <BannerPlayground {...v} />,
      code: (v) =>
        jsx(
          "Banner",
          {
            variant: v.variant === "default" ? undefined : v.variant,
            "aria-label": "Announcement",
            icon:
              v.icon === "none"
                ? expr("null")
                : v.icon === "custom"
                  ? expr("<WrenchIcon aria-hidden />")
                  : undefined,
            onDismiss: v.dismissible ? expr("() => setDismissed(true)") : undefined,
          },
          [
            v.link
              ? `<span>\n  ${v.message} <a href="${STATUS_URL}">View status</a>\n</span>`
              : jsx("span", {}, v.message),
          ],
        ),
    }),
  },

  callout: {
    layout: "wide",
    minHeight: 640,
    demos: [
      {
        name: "Variants",
        description:
          'Each variant brings its own icon; `role="note"` keeps it out of live regions.',
        render: () => (
          <div className="flex w-full max-w-2xl flex-col gap-3">
            <Callout title="Data residency">
              Tenant data for Acme India is stored in ap-south-1 (Mumbai) and never leaves India, as
              the DPDP Act requires.
            </Callout>
            <Callout variant="success" title="GSTIN verified">
              29AAACA1234F1Z5 matches Acme India Pvt Ltd on the GST portal.
            </Callout>
            <Callout variant="warning" title="GSTR-1 due in 3 days">
              File outward supplies for September 2026 by 11 Oct to avoid the ₹50/day late fee.
            </Callout>
            <Callout variant="destructive" title="Webhook endpoint failing">
              https://acme.in/hooks/qeet-pay returned 500 for the last 14 deliveries. Retries stop
              after 24 hours.
            </Callout>
            <Callout variant="muted" title="How refunds settle">
              Refunds return to the original UPI handle or card within 5–7 working days.
            </Callout>
          </div>
        ),
      },
      {
        name: "Error (alias)",
        description: "`error` predates `destructive` and renders identically.",
        render: () => (
          <div className="w-full max-w-2xl">
            <Callout variant="error" title="DLT template not registered">
              SMS OTPs to Indian numbers will fail until template otp_login_v3 is approved on the
              DLT portal.
            </Callout>
          </div>
        ),
      },
      {
        name: "Custom icon, no icon",
        render: () => (
          <div className="flex w-full max-w-2xl flex-col gap-3">
            <Callout title="Passkeys replace passwords" icon={<KeyRoundIcon aria-hidden />}>
              A passkey is bound to the user’s device — nothing to phish and nothing to reuse.
            </Callout>
            <Callout variant="success" icon={null}>
              Your SAML certificate is valid until 14 Mar 2027.
            </Callout>
          </div>
        ),
      },
      {
        name: "Body only",
        render: () => (
          <div className="w-full max-w-2xl">
            <Callout variant="warning">
              Refunds above {formatInr(200000)} need a second approver from Finance.
            </Callout>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: calloutControls,
      render: (v) => (
        <div className="w-full max-w-xl">
          <Callout
            variant={v.variant}
            title={v.title || undefined}
            icon={
              v.icon === "none" ? null : v.icon === "custom" ? (
                <KeyRoundIcon aria-hidden />
              ) : undefined
            }
          >
            {v.children}
          </Callout>
        </div>
      ),
      code: (v) =>
        jsx(
          "Callout",
          {
            variant: v.variant === "info" ? undefined : v.variant,
            title: v.title || undefined,
            icon:
              v.icon === "none"
                ? expr("null")
                : v.icon === "custom"
                  ? expr("<KeyRoundIcon aria-hidden />")
                  : undefined,
          },
          v.children,
        ),
    }),
  },
};
