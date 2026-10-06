import {
  Button,
  CurrencyInput,
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Form,
  FormActions,
  FormErrorSummary,
  type FormErrorSummaryItem,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  MaskInput,
  NativeSelect,
  NumberField,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Switch,
  toast,
} from "@qeetrix/ui";
import { SendIcon } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import type { UserRole } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, text } from "../registry/types";

const roles: readonly { value: UserRole; description: string }[] = [
  { value: "Admin", description: "Manage users, policies and SSO" },
  { value: "Developer", description: "API keys, webhooks and logs" },
  { value: "Billing", description: "Invoices, GST and payment methods" },
  { value: "Auditor", description: "Read-only access to the audit log" },
  { value: "Member", description: "Sign in to connected apps" },
];

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]{3}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Invite member (Qeet ID) ──────────────────────────────────────────────────────────────── */

function InviteMemberForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a work email address, such as neha.joshi@acme.in.");
      return;
    }
    setError(null);
    toast.success(`Invitation sent to ${email}`, {
      description: `Role: ${data.get("role")} · SSO ${data.get("sso") ? "required" : "optional"}`,
    });
  }

  return (
    <Form focusInvalidOnSubmit noValidate onSubmit={handleSubmit} className="w-[26rem] max-w-full">
      <FieldGroup>
        <Field>
          <FieldLabel>Work email</FieldLabel>
          <FieldControl
            render={
              <Input
                name="email"
                type="email"
                autoComplete="off"
                placeholder="neha.joshi@acme.in"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            }
          />
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>They'll get a magic link valid for 72 hours.</FieldDescription>
          )}
        </Field>
        <Field>
          <FieldLabel>Role</FieldLabel>
          <Select name="role" defaultValue="Developer">
            <FieldControl
              render={
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              }
            />
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>Developers can create API keys and read service logs.</FieldDescription>
        </Field>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel>Require SSO</FieldLabel>
            <FieldDescription>Sign in through Okta only; passwords are disabled.</FieldDescription>
          </FieldContent>
          <FieldControl render={<Switch name="sso" defaultChecked />} />
        </Field>
      </FieldGroup>
      <FormActions>
        <Button type="reset" variant="outline" onClick={() => setEmail("")}>
          Cancel
        </Button>
        <Button type="submit">
          <SendIcon data-icon="inline-start" aria-hidden />
          Send invite
        </Button>
      </FormActions>
    </Form>
  );
}

/* ── Billing profile with validation (Qeet Pay) ───────────────────────────────────────────── */

interface BillingValues {
  legalName: string;
  gstin: string;
  email: string;
}

function validateBilling(values: BillingValues): Partial<Record<keyof BillingValues, string>> {
  const errors: Partial<Record<keyof BillingValues, string>> = {};
  if (values.legalName.trim().length < 3) errors.legalName = "Enter the legal entity name.";
  if (!GSTIN_PATTERN.test(values.gstin)) {
    errors.gstin = "GSTIN must be 15 characters, e.g. 29AAACA1234F1Z5.";
  }
  if (!EMAIL_PATTERN.test(values.email)) errors.email = "Enter a valid billing email address.";
  return errors;
}

function BillingProfileForm({
  focusInvalidOnSubmit = true,
  showSummary = true,
  summaryTitle,
  submitLabel = "Save billing profile",
}: {
  focusInvalidOnSubmit?: boolean;
  showSummary?: boolean;
  summaryTitle?: string;
  submitLabel?: string;
}) {
  const id = useId();
  const ids = { legalName: `${id}-legal`, gstin: `${id}-gstin`, email: `${id}-email` };
  const [values, setValues] = useState<BillingValues>({
    legalName: "Acme India Pvt Ltd",
    gstin: "29AAACA1234",
    email: "finance@acme",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BillingValues, string>>>({});

  const summary: FormErrorSummaryItem[] = (Object.keys(ids) as (keyof BillingValues)[]).flatMap(
    (key) => {
      const message = errors[key];
      return message ? [{ controlId: ids[key], message }] : [];
    },
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validateBilling(values);
    setErrors(next);
    if (Object.keys(next).length === 0) toast.success("Billing profile saved");
  }

  return (
    <Form
      focusInvalidOnSubmit={focusInvalidOnSubmit}
      noValidate
      onSubmit={handleSubmit}
      className="w-[26rem] max-w-full"
    >
      {showSummary && <FormErrorSummary errors={summary} title={summaryTitle} />}
      <FieldSet>
        <FieldLegend>Billing profile</FieldLegend>
        <FieldDescription>Printed on every GST tax invoice Qeet Pay issues.</FieldDescription>
        <FieldGroup>
          <Field>
            <FieldLabel>Legal entity name</FieldLabel>
            <FieldControl
              render={
                <Input
                  id={ids.legalName}
                  value={values.legalName}
                  onChange={(event) => setValues({ ...values, legalName: event.target.value })}
                />
              }
            />
            {errors.legalName && <FieldError>{errors.legalName}</FieldError>}
          </Field>
          <Field>
            <FieldLabel>GSTIN</FieldLabel>
            <FieldControl
              render={
                <MaskInput
                  id={ids.gstin}
                  mask="##AAAAA####A***"
                  placeholder="29AAACA1234F1Z5"
                  value={values.gstin}
                  onValueChange={(_raw, formatted) =>
                    setValues({ ...values, gstin: formatted.toUpperCase() })
                  }
                />
              }
            />
            {errors.gstin ? (
              <FieldError>{errors.gstin}</FieldError>
            ) : (
              <FieldDescription>State code, PAN, entity number and checksum.</FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel>Billing email</FieldLabel>
            <FieldControl
              render={
                <Input
                  id={ids.email}
                  type="email"
                  value={values.email}
                  onChange={(event) => setValues({ ...values, email: event.target.value })}
                />
              }
            />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </Field>
        </FieldGroup>
      </FieldSet>
      <FormActions>
        <Button type="submit">{submitLabel}</Button>
      </FormActions>
    </Form>
  );
}

/* ── Tenant settings (Qeet ID) ────────────────────────────────────────────────────────────── */

function TenantSettingsForm() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    toast.success("Tenant settings saved", {
      description: `https://${data.get("domain")} · ${data.get("region")} · ${data.get("idle")} min idle timeout`,
    });
  }

  return (
    <Form onSubmit={handleSubmit} className="w-[26rem] max-w-full">
      <FieldSet>
        <FieldLegend>Acme India Pvt Ltd</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel>Custom domain</FieldLabel>
            <InputGroup>
              <InputGroupAddon>https://</InputGroupAddon>
              <FieldControl render={<InputGroupInput name="domain" defaultValue="id.acme.in" />} />
            </InputGroup>
            <FieldDescription>Verified 12 Sep 2026 via CNAME to tenants.qeet.in.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Data region</FieldLabel>
            <Select name="region" defaultValue="ap-south-1">
              <FieldControl
                render={
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                }
              />
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>India</SelectLabel>
                  <SelectItem value="ap-south-1">Mumbai (ap-south-1)</SelectItem>
                  <SelectItem value="ap-south-2">Hyderabad (ap-south-2)</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Europe</SelectLabel>
                  <SelectItem value="eu-central-1">Frankfurt (eu-central-1)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>Changing region schedules a migration window.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Idle session timeout (minutes)</FieldLabel>
            <FieldControl
              render={
                <NumberField
                  name="idle"
                  defaultValue={30}
                  min={5}
                  max={720}
                  step={5}
                  className="w-40"
                />
              }
            />
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>Enforce passkeys</FieldLabel>
              <FieldDescription>
                Users without a passkey are prompted at next sign-in.
              </FieldDescription>
            </FieldContent>
            <FieldControl render={<Switch name="passkeys" defaultChecked />} />
          </Field>
        </FieldGroup>
      </FieldSet>
      <FormActions>
        <Button type="reset" variant="outline">
          Discard
        </Button>
        <Button type="submit">Save settings</Button>
      </FormActions>
    </Form>
  );
}

/* ── Refund with server errors (Qeet Pay) ─────────────────────────────────────────────────── */

function RefundErrorsForm() {
  const id = useId();
  const amountId = `${id}-amount`;
  const reasonId = `${id}-reason`;
  const [amount, setAmount] = useState<number | undefined>(300000);
  return (
    <Form noValidate onSubmit={(event) => event.preventDefault()} className="w-[26rem] max-w-full">
      <FormErrorSummary
        title="2 problems with this refund"
        errors={[
          { controlId: amountId, message: "Refund can't exceed the captured ₹2,92,640." },
          { controlId: reasonId, message: "Choose why you're refunding this payment." },
        ]}
      />
      <FieldGroup>
        <Field>
          <FieldLabel>Refund amount</FieldLabel>
          <FieldControl
            render={
              <CurrencyInput
                id={amountId}
                currency="INR"
                locale="en-IN"
                value={amount}
                onValueChange={setAmount}
              />
            }
          />
          <FieldError>Refund can't exceed the captured ₹2,92,640.</FieldError>
        </Field>
        <Field>
          <FieldLabel>Reason</FieldLabel>
          <FieldControl
            render={
              <NativeSelect id={reasonId} defaultValue="">
                <option value="" disabled>
                  Select a reason
                </option>
                <option value="duplicate">Duplicate payment</option>
                <option value="cancelled">Order cancelled</option>
                <option value="gst">GST correction (credit note)</option>
              </NativeSelect>
            }
          />
          <FieldError>Choose why you're refunding this payment.</FieldError>
        </Field>
      </FieldGroup>
      <FormActions>
        <Button type="submit" variant="destructive">
          Refund ₹2,92,640
        </Button>
      </FormActions>
    </Form>
  );
}

const formControls = {
  focusInvalidOnSubmit: bool(true, "focusInvalidOnSubmit"),
  showSummary: bool(true, "Error summary"),
  summaryTitle: text("Fix these problems before saving", "Summary title"),
  submitLabel: text("Save billing profile", "Submit label"),
};

export const examples: FamilyExamples = {
  form: {
    minHeight: 900,
    demos: [
      {
        name: "Invite member",
        description:
          "Qeet ID invite: email, role Select and an SSO switch; submit raises a toast with the FormData.",
        render: () => <InviteMemberForm />,
      },
      {
        name: "Validation on submit",
        description:
          "Submit with the pre-filled values: errors appear inline and in a FormErrorSummary, and focus moves to the first invalid control.",
        render: () => <BillingProfileForm summaryTitle="Fix these problems before saving" />,
      },
      {
        name: "Tenant settings",
        description: "FieldSet with an https:// addon, a grouped region Select and a NumberField.",
        render: () => <TenantSettingsForm />,
      },
      {
        name: "Server-side errors",
        description:
          "Errors returned by the API, rendered as a summary plus inline FieldErrors on each control.",
        render: () => <RefundErrorsForm />,
      },
    ],
    playground: definePlayground({
      controls: formControls,
      render: (v) => (
        <div className="w-[28rem] max-w-full">
          <BillingProfileForm
            key={`${v.focusInvalidOnSubmit}-${v.showSummary}`}
            focusInvalidOnSubmit={v.focusInvalidOnSubmit}
            showSummary={v.showSummary}
            summaryTitle={v.summaryTitle}
            submitLabel={v.submitLabel}
          />
        </div>
      ),
      code: (v) =>
        jsx(
          "Form",
          { focusInvalidOnSubmit: v.focusInvalidOnSubmit, onSubmit: expr("handleSubmit") },
          [
            v.showSummary
              ? jsx("FormErrorSummary", {
                  errors: expr("summary"),
                  title: v.summaryTitle || undefined,
                })
              : "",
            jsx("FieldGroup", {}, [
              jsx("Field", {}, [
                jsx("FieldLabel", {}, "GSTIN"),
                jsx("FieldControl", {
                  render: expr(
                    '<MaskInput id="gstin" mask="##AAAAA####A***" value={gstin} onValueChange={(_raw, formatted) => setGstin(formatted)} />',
                  ),
                }),
                "{errors.gstin && <FieldError>{errors.gstin}</FieldError>}",
              ]),
            ]),
            jsx("FormActions", {}, jsx("Button", { type: "submit" }, v.submitLabel)),
          ],
        ),
    }),
  },
};
