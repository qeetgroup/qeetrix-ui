import {
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Label,
  Switch,
} from "@qeetrix/ui";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const notifyChannels = [
  {
    id: "email",
    label: "Email",
    description: "Invoices, receipts and weekly digests.",
    on: true,
  },
  {
    id: "sms",
    label: "SMS",
    description: "One-time codes over DLT-registered templates.",
    on: true,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Payment reminders from the verified Qeet Pay sender.",
    on: false,
  },
  { id: "push", label: "Push", description: "Sign-in approvals in the Qeet ID app.", on: true },
] as const;

const switchControls = {
  label: text("Require SSO for all members", "Label"),
  size: select(["default", "sm"] as const, "default"),
  defaultChecked: bool(true),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  required: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

export const examples: FamilyExamples = {
  switch: {
    minHeight: 340,
    demos: [
      {
        name: "Notification channels",
        description:
          "Horizontal Fields: label and description on the start side, switch at the end.",
        render: () => (
          <FieldSet className="w-96 max-w-full">
            <FieldLegend variant="label">Qeet Notify channels</FieldLegend>
            <FieldGroup className="gap-4">
              {notifyChannels.map((channel) => (
                <Field key={channel.id} orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>{channel.label}</FieldLabel>
                    <FieldDescription>{channel.description}</FieldDescription>
                  </FieldContent>
                  <FieldControl render={<Switch name={channel.id} defaultChecked={channel.on} />} />
                </Field>
              ))}
            </FieldGroup>
          </FieldSet>
        ),
      },
      {
        name: "Sizes",
        render: () => (
          <div className="flex flex-col gap-3">
            <Label className="font-normal">
              <Switch defaultChecked />
              Default
            </Label>
            <Label className="font-normal">
              <Switch size="sm" defaultChecked />
              Small, for dense tables
            </Label>
          </div>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field orientation="horizontal" className="w-80">
            <FieldContent>
              <FieldLabel>Deliver OTPs by SMS</FieldLabel>
              <FieldError>
                Turn on SMS or WhatsApp: the sign-in policy needs one OTP channel.
              </FieldError>
            </FieldContent>
            <FieldControl render={<Switch />} />
          </Field>
        ),
      },
      {
        name: "Disabled and read-only",
        render: () => (
          <div className="flex w-80 flex-col gap-3">
            <Field orientation="horizontal" data-disabled="true">
              <FieldLabel>Password sign-in</FieldLabel>
              <FieldControl render={<Switch disabled />} />
            </Field>
            <Field orientation="horizontal" data-disabled="true">
              <FieldLabel>Audit logging</FieldLabel>
              <FieldControl render={<Switch disabled defaultChecked />} />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel>Data residency (India)</FieldLabel>
                <FieldDescription>Locked by your Enterprise contract.</FieldDescription>
              </FieldContent>
              <FieldControl render={<Switch readOnly defaultChecked />} />
            </Field>
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: switchControls,
      render: (v) => (
        <Label className="font-normal">
          <Switch
            key={String(v.defaultChecked)}
            size={v.size}
            defaultChecked={v.defaultChecked}
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
          jsx("Switch", {
            ...changedProps(v, switchControls, ["size"]),
            defaultChecked: v.defaultChecked,
            ...changedProps(v, switchControls, ["disabled", "readOnly", "required"]),
            "aria-invalid": v.invalid,
          }),
          v.label,
        ]),
    }),
  },
};
