import { MailIcon, MessageCircleIcon, MessageSquareIcon, SmartphoneIcon } from "@qeetrix/icons";
import {
  Button,
  NotificationPreferenceMatrix,
  type PrefCategory,
  type PrefChannel,
  type PreferenceMatrix,
  toast,
} from "@qeetrix/ui";
import { type FormEvent, useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const allChannels: PrefChannel[] = [
  { key: "email", label: "Email", icon: <MailIcon aria-hidden /> },
  { key: "sms", label: "SMS", icon: <MessageSquareIcon aria-hidden /> },
  { key: "whatsapp", label: "WhatsApp", icon: <MessageCircleIcon aria-hidden /> },
  { key: "push", label: "Push", icon: <SmartphoneIcon aria-hidden /> },
];

const accountCategories: PrefCategory[] = [
  {
    key: "new_sign_in",
    label: "New sign-in",
    description: "A device or location we have not seen for your account",
    locked: ["email"],
  },
  {
    key: "passkey_changes",
    label: "Passkey and 2FA changes",
    description: "A passkey, authenticator app or phone number is added or removed",
    locked: ["email"],
  },
  {
    key: "access_reviews",
    label: "Access reviews",
    description: "A quarterly review is assigned to you or is about to expire",
  },
  {
    key: "role_changes",
    label: "Role changes",
    description: "An admin changes your role or group membership",
  },
  {
    key: "product_updates",
    label: "Product updates",
    description: "New Qeet ID features and planned maintenance windows",
    channels: ["email", "push"],
  },
];

const accountDefaults: PreferenceMatrix = {
  new_sign_in: { email: true, sms: false, whatsapp: true, push: true },
  passkey_changes: { email: true, sms: true, whatsapp: false, push: true },
  access_reviews: { email: true, sms: false, whatsapp: false, push: false },
  role_changes: { email: true, sms: false, whatsapp: false, push: false },
  product_updates: { email: false, sms: false, whatsapp: false, push: false },
};

const payChannels: PrefChannel[] = allChannels.slice(0, 3);

const payCategories: PrefCategory[] = [
  { key: "payment_captured", label: "Payment captured", description: "UPI, cards and net banking" },
  { key: "payment_failed", label: "Payment failed", description: "Including bounced NACH debits" },
  { key: "refund_processed", label: "Refund processed" },
  { key: "settlement", label: "Settlement credited", description: "Daily T+2 payout to your bank" },
  { key: "gst_invoice", label: "GST invoice issued", description: "PDF and e-invoice IRN" },
];

const payDefaults: PreferenceMatrix = {
  payment_captured: { email: false, sms: false, whatsapp: false },
  payment_failed: { email: true, sms: true, whatsapp: true },
  refund_processed: { email: true, sms: false, whatsapp: false },
  settlement: { email: true, sms: false, whatsapp: true },
  gst_invoice: { email: true, sms: false, whatsapp: false },
};

function countEnabled(value: PreferenceMatrix): number {
  return Object.values(value).reduce(
    (total, row) => total + Object.values(row).filter(Boolean).length,
    0,
  );
}

function AccountPreferencesDemo() {
  const [value, setValue] = useState(accountDefaults);
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <NotificationPreferenceMatrix
        channels={allChannels}
        categories={accountCategories}
        value={value}
        onValueChange={setValue}
        caption="Qeet ID account notifications for rohan.mehta@acme.in"
      />
      <div className="flex items-center gap-3">
        <span className="text-caption text-muted-foreground">
          {countEnabled(value)} notifications on · SMS and WhatsApp are sent to +91 98•••• 4410
        </span>
        <Button
          size="sm"
          variant="outline"
          className="ms-auto"
          onClick={() => toast.success("Notification preferences saved")}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

function PayAlertsDemo() {
  const [value, setValue] = useState(payDefaults);
  const [saving, setSaving] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      toast.success("Qeet Pay alert routing saved for the finance team");
    }, 900);
  };
  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-3">
      <NotificationPreferenceMatrix
        channels={payChannels}
        categories={payCategories}
        value={value}
        onValueChange={setValue}
        control="checkbox"
        disabled={saving}
        caption="Qeet Pay alerts for the Acme India finance team"
        captionVisible
        categoryHeader="Qeet Pay event"
      />
      <Button type="submit" size="sm" className="self-end" disabled={saving}>
        {saving ? "Saving…" : "Save routing"}
      </Button>
    </form>
  );
}

function PlaygroundMatrix({
  channels,
  caption,
  captionVisible,
  categoryHeader,
  control,
  disabled,
}: {
  channels: PrefChannel[];
  caption: string;
  captionVisible: boolean;
  categoryHeader: string;
  control: "switch" | "checkbox";
  disabled: boolean;
}) {
  const [value, setValue] = useState(accountDefaults);
  return (
    <NotificationPreferenceMatrix
      className="w-full max-w-3xl"
      channels={channels}
      categories={accountCategories}
      value={value}
      onValueChange={setValue}
      caption={caption || undefined}
      captionVisible={captionVisible}
      categoryHeader={categoryHeader || undefined}
      control={control}
      disabled={disabled}
    />
  );
}

const channelSets = {
  "Email, SMS, WhatsApp, Push": allChannels,
  "Email and Push": [allChannels[0], allChannels[3]],
  "Email only": [allChannels[0]],
} as const;

const matrixControls = {
  channels: select(
    ["Email, SMS, WhatsApp, Push", "Email and Push", "Email only"] as const,
    "Email, SMS, WhatsApp, Push",
    "Channels",
  ),
  caption: text("Qeet ID account notifications", "caption"),
  captionVisible: bool(false, "captionVisible"),
  categoryHeader: text("", "categoryHeader (empty = default)"),
  control: select(["switch", "checkbox"] as const, "switch", "control"),
  disabled: bool(false, "disabled"),
};

export const examples: FamilyExamples = {
  "notification-preference-matrix": {
    layout: "wide",
    minHeight: 900,
    demos: [
      {
        name: "Account notifications",
        description:
          "Every switch names both axes (“New sign-in, WhatsApp”). Security emails are locked on by the tenant admin, and product updates are only offered by email and push.",
        render: () => <AccountPreferencesDemo />,
      },
      {
        name: "Checkboxes in a form",
        description:
          '`control="checkbox"` for a matrix that is submitted as a whole; `disabled` while it saves. The caption is visible and the first column has a custom header.',
        render: () => <PayAlertsDemo />,
      },
    ],
    playground: definePlayground({
      controls: matrixControls,
      render: (v) => (
        <PlaygroundMatrix
          channels={[...channelSets[v.channels]]}
          caption={v.caption}
          captionVisible={v.captionVisible}
          categoryHeader={v.categoryHeader}
          control={v.control}
          disabled={v.disabled}
        />
      ),
      code: (v) =>
        jsx("NotificationPreferenceMatrix", {
          channels: expr(
            `[${channelSets[v.channels].map((channel) => `{ key: "${channel.key}", label: "${channel.label}" }`).join(", ")}]`,
          ),
          categories: expr("categories"),
          value: expr("value"),
          onValueChange: expr("setValue"),
          caption: v.caption || undefined,
          captionVisible: v.captionVisible,
          categoryHeader: v.categoryHeader || undefined,
          control: v.control === "switch" ? undefined : v.control,
          disabled: v.disabled,
        }),
    }),
  },
};
