import { BellIcon, MailIcon, MessageCircleIcon, MessageSquareTextIcon } from "@qeetrix/icons";
import {
  Badge,
  Checkbox,
  CheckboxCard,
  CheckboxCardGroup,
  CheckboxGroup,
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  Label,
} from "@qeetrix/ui";
import { type ReactNode, useId, useState } from "react";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, text } from "../registry/types";

interface Channel {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  disabled?: boolean;
}

const channels: readonly Channel[] = [
  {
    id: "email",
    label: "Email",
    description: "Sign-in alerts and invoices to rohan.mehta@acme.in",
    icon: <MailIcon aria-hidden className="size-4 text-muted-foreground" />,
  },
  {
    id: "sms",
    label: "SMS",
    description: "One-time codes to +91 98450 •••21 (DLT-registered)",
    icon: <MessageSquareTextIcon aria-hidden className="size-4 text-muted-foreground" />,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Payment receipts through the Qeet Pay business account",
    icon: <MessageCircleIcon aria-hidden className="size-4 text-muted-foreground" />,
  },
  {
    id: "push",
    label: "Push",
    description: "Approve sign-ins from the Qeet ID mobile app",
    icon: <BellIcon aria-hidden className="size-4 text-muted-foreground" />,
    disabled: true,
  },
];

const allChannelIds = channels.map((channel) => channel.id);

function ChannelGroupDemo() {
  const labelId = useId();
  const [value, setValue] = useState<string[]>(["email", "push"]);
  return (
    <CheckboxGroup
      aria-labelledby={labelId}
      value={value}
      onValueChange={setValue}
      allValues={allChannelIds}
    >
      <Label id={labelId}>
        <Checkbox parent indeterminate={value.length > 0 && value.length < allChannelIds.length} />
        All alert channels
      </Label>
      <div className="flex flex-col gap-3 ps-6">
        {channels.map((channel) => (
          <Label key={channel.id} className="font-normal">
            <Checkbox value={channel.id} />
            {channel.label}
          </Label>
        ))}
      </div>
    </CheckboxGroup>
  );
}

function ChannelCardsDemo() {
  const [selected, setSelected] = useState<string[]>(["email", "whatsapp"]);
  return (
    <div className="flex w-96 max-w-full flex-col gap-2">
      <CheckboxGroup
        aria-label="Notification channels"
        value={selected}
        onValueChange={setSelected}
      >
        <CheckboxCardGroup>
          {channels.map((channel) => (
            <CheckboxCard
              key={channel.id}
              value={channel.id}
              name="channels"
              disabled={channel.disabled}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {channel.icon}
                {channel.label}
                {channel.disabled && <Badge variant="muted">Coming soon</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{channel.description}</p>
            </CheckboxCard>
          ))}
        </CheckboxCardGroup>
      </CheckboxGroup>
      <p className="text-caption text-muted-foreground" aria-live="polite">
        {selected.length} of {channels.length} channels on
      </p>
    </div>
  );
}

function DpaCardDemo() {
  const errorId = useId();
  const [accepted, setAccepted] = useState(false);
  return (
    <div className="flex w-96 max-w-full flex-col gap-2">
      <CheckboxCard
        value="dpa"
        name="dpa"
        required
        checked={accepted}
        onCheckedChange={setAccepted}
        aria-invalid={!accepted || undefined}
        aria-describedby={accepted ? undefined : errorId}
      >
        <p className="text-sm font-medium">Data Processing Addendum</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Qeet ID processes Acme India's user data in ap-south-1 under the DPDP Act, 2023.
        </p>
      </CheckboxCard>
      {!accepted && <FieldError id={errorId}>Accept the DPA to activate the tenant.</FieldError>}
    </div>
  );
}

const checkboxControls = {
  label: text("Email me when a new device signs in", "Label"),
  defaultChecked: bool(true),
  indeterminate: bool(false),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  required: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

const checkboxCardControls = {
  defaultChecked: bool(true),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  required: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
  title: text("Enforce SSO", "Title"),
  description: text("Members must sign in through Okta; passwords are turned off.", "Description"),
};

export const examples: FamilyExamples = {
  checkbox: {
    minHeight: 300,
    demos: [
      {
        name: "Default",
        description: "Wrap the checkbox in a Label to name it.",
        render: () => (
          <div className="flex flex-col gap-3">
            <Label className="font-normal">
              <Checkbox defaultChecked />
              Email me when a new device signs in
            </Label>
            <Label className="font-normal">
              <Checkbox />
              Send a weekly security digest
            </Label>
          </div>
        ),
      },
      {
        name: "With description",
        render: () => (
          <Field orientation="horizontal" className="w-80">
            <FieldControl render={<Checkbox defaultChecked />} />
            <FieldContent>
              <FieldLabel>Remember this device for 30 days</FieldLabel>
              <FieldDescription>
                Skip the passkey prompt on this browser. Revoke it any time from Sessions.
              </FieldDescription>
            </FieldContent>
          </Field>
        ),
      },
      {
        name: "Parent and children",
        description:
          "CheckboxGroup with `allValues` and a `parent` checkbox that goes indeterminate when some channels are on.",
        render: () => <ChannelGroupDemo />,
      },
      {
        name: "Invalid",
        render: () => (
          <Field orientation="horizontal" className="w-80">
            <FieldControl render={<Checkbox required />} />
            <FieldContent>
              <FieldLabel>I accept the Data Processing Addendum</FieldLabel>
              <FieldError>Accept the DPA to enable Qeet ID for Acme India.</FieldError>
            </FieldContent>
          </Field>
        ),
      },
      {
        name: "Disabled and read-only",
        render: () => (
          <div className="flex flex-col gap-3">
            <Field orientation="horizontal" data-disabled="true">
              <FieldControl render={<Checkbox disabled />} />
              <FieldLabel>Allow password sign-in</FieldLabel>
            </Field>
            <Field orientation="horizontal" data-disabled="true">
              <FieldControl render={<Checkbox disabled defaultChecked />} />
              <FieldLabel>Provisioned by SCIM</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <FieldControl render={<Checkbox readOnly defaultChecked />} />
              <FieldLabel>Audit logging (always on for Enterprise)</FieldLabel>
            </Field>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: checkboxControls,
      render: (v) => (
        <Label className="font-normal">
          <Checkbox
            key={String(v.defaultChecked)}
            defaultChecked={v.defaultChecked}
            indeterminate={v.indeterminate}
            disabled={v.disabled}
            readOnly={v.readOnly}
            required={v.required}
            aria-invalid={v.invalid || undefined}
          />
          {v.label}
        </Label>
      ),
      code: (v) =>
        jsx("Label", {}, [
          jsx("Checkbox", {
            ...changedProps(v, checkboxControls, [
              "indeterminate",
              "disabled",
              "readOnly",
              "required",
            ]),
            defaultChecked: v.defaultChecked,
            "aria-invalid": v.invalid,
          }),
          v.label,
        ]),
    }),
  },

  "checkbox-card": {
    minHeight: 560,
    demos: [
      {
        name: "In a CheckboxGroup",
        description:
          "Cards inside a CheckboxGroup are identified by `value`; the group owns the selection.",
        render: () => <ChannelCardsDemo />,
      },
      {
        name: "Standalone",
        description:
          "Uncontrolled with `defaultChecked`: the card reads its state from the checkbox, so it highlights without being controlled.",
        render: () => (
          <CheckboxCard value="scim" name="scim" defaultChecked className="w-96 max-w-full">
            <p className="text-sm font-medium">Provision users with SCIM</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Okta creates, updates and suspends Acme India accounts automatically.
            </p>
          </CheckboxCard>
        ),
      },
      {
        name: "Invalid and required",
        render: () => <DpaCardDemo />,
      },
      {
        name: "Disabled",
        render: () => (
          <CheckboxCardGroup className="w-96 max-w-full">
            <CheckboxCard value="password" disabled>
              <p className="text-sm font-medium">Password sign-in</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Turned off by the tenant's passkeys-only policy.
              </p>
            </CheckboxCard>
            <CheckboxCard value="audit" disabled defaultChecked>
              <p className="text-sm font-medium">Audit log retention (1 year)</p>
              <p className="mt-1 text-sm text-muted-foreground">Included in Enterprise.</p>
            </CheckboxCard>
          </CheckboxCardGroup>
        ),
      },
      {
        name: "Read-only",
        render: () => (
          <CheckboxCard value="residency" readOnly defaultChecked className="w-96 max-w-full">
            <p className="text-sm font-medium">Keep data in India</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Locked by the Enterprise contract for Bharat FinServ.
            </p>
          </CheckboxCard>
        ),
      },
    ],
    playground: definePlayground({
      controls: checkboxCardControls,
      render: (v) => (
        <CheckboxCard
          key={String(v.defaultChecked)}
          value="sso"
          defaultChecked={v.defaultChecked}
          disabled={v.disabled}
          readOnly={v.readOnly}
          required={v.required}
          aria-invalid={v.invalid || undefined}
          className="w-80"
        >
          <p className="text-sm font-medium">{v.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{v.description}</p>
        </CheckboxCard>
      ),
      code: (v) =>
        jsx(
          "CheckboxCard",
          {
            value: "sso",
            defaultChecked: v.defaultChecked,
            disabled: v.disabled,
            readOnly: v.readOnly,
            required: v.required,
            "aria-invalid": v.invalid,
          },
          [
            jsx("p", { className: "text-sm font-medium" }, v.title),
            jsx("p", { className: "mt-1 text-sm text-muted-foreground" }, v.description),
          ],
        ),
    }),
  },
};
