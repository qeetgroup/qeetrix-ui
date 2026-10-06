import {
  Checkbox,
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldSuccess,
  FieldWarning,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Textarea,
  toast,
} from "@qeetrix/ui";
import { CopyIcon, SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { apiKeys } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/* ── Field ────────────────────────────────────────────────────────────────────────────────── */

const fieldControls = {
  label: text("Work email", "Label"),
  description: text("We'll send the invitation to this address.", "Description"),
  error: text("", "Error (empty = valid)"),
  warning: text("", "Warning (FieldWarning)"),
  success: text("", "Success (FieldSuccess)"),
  orientation: select(["vertical", "horizontal"] as const, "vertical"),
  placeholder: text("rohan.mehta@acme.in", "Placeholder"),
  required: bool(false, "required (FieldLabel + input)"),
  readOnly: bool(false, "Read-only"),
  disabled: bool(false),
};

/* ── Input ────────────────────────────────────────────────────────────────────────────────── */

const inputTypes = ["text", "email", "url", "tel", "search", "number", "file"] as const;

const inputControls = {
  type: select(inputTypes, "email"),
  placeholder: text("rohan.mehta@acme.in", "Placeholder"),
  "aria-label": text("Work email", "aria-label"),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  required: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

/* ── InputGroup ───────────────────────────────────────────────────────────────────────────── */

const inputGroupControls = {
  prefix: text("https://", "Leading addon"),
  suffix: text("", "Trailing addon"),
  variant: select(["segment", "inline"] as const, "segment", "Addon variant"),
  placeholder: text("id.acme.in", "Placeholder"),
  "aria-label": text("Custom domain", "aria-label"),
  button: bool(false, "Trailing InputGroupButton (copy)"),
  readOnly: bool(false, "Read-only"),
  disabled: bool(false),
};

/* ── Textarea ─────────────────────────────────────────────────────────────────────────────── */

const textareaControls = {
  placeholder: text("Why does this user need production access?", "Placeholder"),
  defaultValue: text("", "Default value", { multiline: true }),
  "aria-label": text("Access request reason", "aria-label"),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  required: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

const NOTE_LIMIT = 280;

function RevocationNoteDemo() {
  const [note, setNote] = useState(
    "Revoked ses_04aa: sign-in from Frankfurt did not match Kavya's usual devices.",
  );
  return (
    <Field className="w-80">
      <FieldLabel>Revocation note</FieldLabel>
      <FieldControl
        render={
          <Textarea
            value={note}
            maxLength={NOTE_LIMIT}
            onChange={(event) => setNote(event.target.value)}
          />
        }
      />
      <div className="flex items-start justify-between gap-4">
        <FieldDescription>Saved to the audit log with the session record.</FieldDescription>
        <span className="shrink-0 text-caption text-muted-foreground tabular-nums">
          {note.length}/{NOTE_LIMIT}
        </span>
      </div>
    </Field>
  );
}

const liveKey = apiKeys[0];

function UserSearchDemo() {
  const [query, setQuery] = useState("priya");
  return (
    <InputGroup className="w-72">
      <InputGroupAddon>
        <SearchIcon aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        aria-label="Search users"
        placeholder="Name or email"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query && (
        <InputGroupAddon align="end">
          <InputGroupButton aria-label="Clear search" onClick={() => setQuery("")}>
            <XIcon aria-hidden />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

export const examples: FamilyExamples = {
  field: {
    demos: [
      {
        name: "Label, control, description",
        description:
          "FieldControl wires the generated id, aria-labelledby and aria-describedby onto the input.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Work email</FieldLabel>
            <FieldControl render={<Input type="email" placeholder="rohan.mehta@acme.in" />} />
            <FieldDescription>We'll send the invitation to this address.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Invalid",
        description:
          "A FieldError with content marks the whole field invalid and sets aria-invalid on the control.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Custom domain</FieldLabel>
            <FieldControl render={<Input defaultValue="acme" />} />
            <FieldError>Enter a fully qualified domain, such as id.acme.in.</FieldError>
          </Field>
        ),
      },
      {
        name: "Warning and success",
        description:
          "FieldWarning (polite, non-blocking) and FieldSuccess join aria-describedby and tint the boundary.",
        render: () => (
          <div className="flex w-72 flex-col gap-4">
            <Field>
              <FieldLabel>Invitee email</FieldLabel>
              <FieldControl render={<Input type="email" defaultValue="neha.joshi@gmail.com" />} />
              <FieldWarning>Outside acme.in: they'll join as a guest.</FieldWarning>
            </Field>
            <Field>
              <FieldLabel>Tenant slug</FieldLabel>
              <FieldControl render={<Input defaultValue="acme-india" />} />
              <FieldSuccess>id.qeet.in/t/acme-india is available.</FieldSuccess>
            </Field>
          </div>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-72" data-disabled="true">
            <FieldLabel>Tenant ID</FieldLabel>
            <FieldControl render={<Input defaultValue="tnt_acme" disabled />} />
            <FieldDescription>Assigned when the tenant was created.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Required",
        render: () => (
          <Field className="w-72">
            <FieldLabel required>Legal entity name</FieldLabel>
            <FieldControl render={<Input required placeholder="Acme India Pvt Ltd" />} />
            <FieldDescription>Printed on GST invoices exactly as entered.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Horizontal",
        description: "Checkboxes and switches sit beside a FieldContent of label and description.",
        render: () => (
          <Field orientation="horizontal" className="w-80">
            <FieldControl render={<Checkbox defaultChecked />} />
            <FieldContent>
              <FieldLabel>Require passkeys for admins</FieldLabel>
              <FieldDescription>
                Owners and admins must register a passkey before their next sign-in.
              </FieldDescription>
            </FieldContent>
          </Field>
        ),
      },
      {
        name: "FieldSet and group",
        render: () => (
          <FieldSet className="w-80">
            <FieldLegend>Tenant profile</FieldLegend>
            <FieldDescription>Shown on the hosted Qeet ID sign-in page.</FieldDescription>
            <FieldGroup>
              <Field>
                <FieldLabel>Display name</FieldLabel>
                <FieldControl render={<Input defaultValue="Acme India" />} />
              </Field>
              <FieldSeparator>or</FieldSeparator>
              <Field>
                <FieldLabel>Support email</FieldLabel>
                <FieldControl render={<Input type="email" defaultValue="it-help@acme.in" />} />
              </Field>
            </FieldGroup>
          </FieldSet>
        ),
      },
    ],
    minHeight: 420,
    playground: definePlayground({
      controls: fieldControls,
      render: (v) => (
        <div className="w-96">
          <Field orientation={v.orientation} data-disabled={v.disabled ? "true" : undefined}>
            <FieldLabel required={v.required}>{v.label}</FieldLabel>
            <FieldControl
              render={
                <Input
                  type="email"
                  placeholder={v.placeholder}
                  required={v.required}
                  readOnly={v.readOnly}
                  disabled={v.disabled}
                />
              }
            />
            {v.description && <FieldDescription>{v.description}</FieldDescription>}
            {v.error && <FieldError>{v.error}</FieldError>}
            {v.warning && <FieldWarning>{v.warning}</FieldWarning>}
            {v.success && <FieldSuccess>{v.success}</FieldSuccess>}
          </Field>
        </div>
      ),
      code: (v) =>
        jsx(
          "Field",
          {
            ...changedProps(v, fieldControls, ["orientation"]),
            "data-disabled": v.disabled ? "true" : undefined,
          },
          [
            jsx("FieldLabel", { required: v.required }, v.label),
            jsx("FieldControl", {
              render: expr(
                jsx("Input", {
                  type: "email",
                  placeholder: v.placeholder || undefined,
                  required: v.required,
                  readOnly: v.readOnly,
                  disabled: v.disabled,
                }),
              ),
            }),
            v.description ? jsx("FieldDescription", {}, v.description) : "",
            v.error ? jsx("FieldError", {}, v.error) : "",
            v.warning ? jsx("FieldWarning", {}, v.warning) : "",
            v.success ? jsx("FieldSuccess", {}, v.success) : "",
          ],
        ),
    }),
  },

  input: {
    demos: [
      {
        name: "Default",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Work email</FieldLabel>
            <FieldControl
              render={<Input type="email" autoComplete="email" placeholder="rohan.mehta@acme.in" />}
            />
          </Field>
        ),
      },
      {
        name: "Filled",
        render: () => (
          <Field className="w-72">
            <FieldLabel>UPI ID (VPA)</FieldLabel>
            <FieldControl render={<Input defaultValue="accounts@acmeindia" spellCheck={false} />} />
            <FieldDescription>Collect requests are raised against this VPA.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Invalid",
        description: "aria-invalid draws the destructive border and ring; FieldError says why.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>UPI ID (VPA)</FieldLabel>
            <FieldControl render={<Input defaultValue="accounts@" spellCheck={false} />} />
            <FieldError>Enter a UPI ID in the form name@bank, e.g. accounts@acmeindia.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-72" data-disabled="true">
            <FieldLabel>Tenant ID</FieldLabel>
            <FieldControl render={<Input defaultValue="tnt_acme" disabled />} />
          </Field>
        ),
      },
      {
        name: "Read-only",
        render: () => (
          <Field className="w-72">
            <FieldLabel>OIDC issuer</FieldLabel>
            <FieldControl render={<Input readOnly value="https://id.qeet.in/t/acme" />} />
            <FieldDescription>Paste this into your identity provider.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Required",
        render: () => (
          <Field className="w-72">
            <FieldLabel required>PAN</FieldLabel>
            <FieldControl
              render={<Input required placeholder="AAACA1234F" maxLength={10} spellCheck={false} />}
            />
          </Field>
        ),
      },
      {
        name: "File",
        render: () => (
          <Field className="w-72">
            <FieldLabel>SAML metadata</FieldLabel>
            <FieldControl render={<Input type="file" accept=".xml,application/xml" />} />
            <FieldDescription>The XML file exported from Okta or Entra ID.</FieldDescription>
          </Field>
        ),
      },
    ],
    minHeight: 320,
    playground: definePlayground({
      controls: inputControls,
      render: (v) => (
        <div className="w-72">
          <Input
            type={v.type}
            placeholder={v.placeholder}
            aria-label={v["aria-label"]}
            disabled={v.disabled}
            readOnly={v.readOnly}
            required={v.required}
            aria-invalid={v.invalid || undefined}
          />
        </div>
      ),
      code: (v) =>
        jsx("Input", {
          type: v.type === "text" ? undefined : v.type,
          placeholder: v.placeholder || undefined,
          "aria-label": v["aria-label"],
          disabled: v.disabled,
          readOnly: v.readOnly,
          required: v.required,
          "aria-invalid": v.invalid,
        }),
    }),
  },

  "input-group": {
    demos: [
      {
        name: "Leading addon",
        description:
          '`variant="segment"`: a divided, tinted cell for fixed text, so the tenant types only the host.',
        render: () => (
          <Field className="w-80">
            <FieldLabel>Custom domain</FieldLabel>
            <InputGroup>
              <InputGroupAddon variant="segment">https://</InputGroupAddon>
              <FieldControl render={<InputGroupInput placeholder="id.acme.in" />} />
            </InputGroup>
            <FieldDescription>Add a CNAME to tenants.qeet.in before verifying.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Trailing unit",
        description:
          '`variant="inline"` (the default) sits on the field surface, for units and icons.',
        render: () => (
          <Field className="w-64">
            <FieldLabel>Idle session timeout</FieldLabel>
            <InputGroup>
              <FieldControl
                render={<InputGroupInput type="number" defaultValue={30} min={5} max={720} />}
              />
              <InputGroupAddon align="end">minutes</InputGroupAddon>
            </InputGroup>
          </Field>
        ),
      },
      {
        name: "Both sides",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Refund amount</FieldLabel>
            <InputGroup>
              <InputGroupAddon>₹</InputGroupAddon>
              <FieldControl
                render={<InputGroupInput inputMode="decimal" defaultValue="12,500.00" />}
              />
              <InputGroupAddon align="end" variant="segment">
                INR
              </InputGroupAddon>
            </InputGroup>
          </Field>
        ),
      },
      {
        name: "Icon and clear button",
        description:
          "Inline addons hold icons; InputGroupButton is the in-field action (type=button, needs an aria-label).",
        render: () => <UserSearchDemo />,
      },
      {
        name: "Read-only with copy",
        description: "A read-only group draws the dashed boundary; the copy action stays usable.",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Live API key</FieldLabel>
            <InputGroup>
              <FieldControl
                render={
                  <InputGroupInput
                    readOnly
                    value={`${liveKey.prefix}••••••••••••`}
                    className="font-mono"
                  />
                }
              />
              <InputGroupAddon align="end">
                <InputGroupButton
                  aria-label="Copy API key"
                  onClick={() => toast.success(`Copied ${liveKey.name} key`)}
                >
                  <CopyIcon aria-hidden />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Custom domain</FieldLabel>
            <InputGroup>
              <InputGroupAddon variant="segment">https://</InputGroupAddon>
              <FieldControl render={<InputGroupInput defaultValue="acme" />} />
            </InputGroup>
            <FieldError>Enter a fully qualified domain, such as id.acme.in.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-80" data-disabled="true">
            <FieldLabel>Webhook endpoint</FieldLabel>
            <InputGroup>
              <InputGroupAddon variant="segment">https://</InputGroupAddon>
              <FieldControl
                render={<InputGroupInput disabled defaultValue="hooks.acme.in/qeet-pay" />}
              />
            </InputGroup>
            <FieldDescription>
              Webhooks are paused while the tenant is in test mode.
            </FieldDescription>
          </Field>
        ),
      },
    ],
    minHeight: 320,
    playground: definePlayground({
      controls: inputGroupControls,
      render: (v) => (
        <InputGroup className="w-80">
          {v.prefix && <InputGroupAddon variant={v.variant}>{v.prefix}</InputGroupAddon>}
          <InputGroupInput
            placeholder={v.placeholder}
            aria-label={v["aria-label"]}
            readOnly={v.readOnly}
            disabled={v.disabled}
          />
          {v.suffix && (
            <InputGroupAddon align="end" variant={v.variant}>
              {v.suffix}
            </InputGroupAddon>
          )}
          {v.button && (
            <InputGroupAddon align="end">
              <InputGroupButton
                aria-label="Copy domain"
                disabled={v.disabled}
                onClick={() => toast.success("Copied")}
              >
                <CopyIcon aria-hidden />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      ),
      code: (v) =>
        jsx("InputGroup", {}, [
          v.prefix
            ? jsx(
                "InputGroupAddon",
                { variant: v.variant === "inline" ? undefined : v.variant },
                v.prefix,
              )
            : "",
          jsx("InputGroupInput", {
            placeholder: v.placeholder || undefined,
            "aria-label": v["aria-label"],
            readOnly: v.readOnly,
            disabled: v.disabled,
          }),
          v.suffix
            ? jsx(
                "InputGroupAddon",
                { align: "end", variant: v.variant === "inline" ? undefined : v.variant },
                v.suffix,
              )
            : "",
          v.button
            ? jsx(
                "InputGroupAddon",
                { align: "end" },
                jsx(
                  "InputGroupButton",
                  { "aria-label": "Copy domain", onClick: expr("copyDomain") },
                  "<CopyIcon aria-hidden />",
                ),
              )
            : "",
        ]),
    }),
  },

  textarea: {
    demos: [
      {
        name: "Default",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Reason for access</FieldLabel>
            <FieldControl
              render={<Textarea placeholder="Why does this user need production access?" />}
            />
            <FieldDescription>Approvers see this alongside the request.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "With counter",
        description: "Controlled value with a character budget shown beside the description.",
        render: () => <RevocationNoteDemo />,
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Refund reason</FieldLabel>
            <FieldControl render={<Textarea defaultValue="dup" />} />
            <FieldError>
              Describe the reason in at least 20 characters for the GST credit note.
            </FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-80" data-disabled="true">
            <FieldLabel>Invoice footer</FieldLabel>
            <FieldControl
              render={
                <Textarea
                  disabled
                  defaultValue="Thank you for your business. Payment due in 30 days."
                />
              }
            />
          </Field>
        ),
      },
      {
        name: "Read-only",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Signing certificate fingerprint</FieldLabel>
            <FieldControl
              render={
                <Textarea
                  readOnly
                  className="font-mono text-xs"
                  value="SHA-256 4B:F9:2F:35:77:B3:4D:A6:A3:CE:92:9D:0E:0E:47:36:00:F0:67:AA:0B:A9:02:B7"
                />
              }
            />
          </Field>
        ),
      },
    ],
    minHeight: 360,
    playground: definePlayground({
      controls: textareaControls,
      render: (v) => (
        <div className="w-80">
          <Textarea
            key={v.defaultValue}
            placeholder={v.placeholder}
            defaultValue={v.defaultValue || undefined}
            aria-label={v["aria-label"]}
            disabled={v.disabled}
            readOnly={v.readOnly}
            required={v.required}
            aria-invalid={v.invalid || undefined}
          />
        </div>
      ),
      code: (v) =>
        jsx("Textarea", {
          placeholder: v.placeholder || undefined,
          defaultValue: v.defaultValue || undefined,
          "aria-label": v["aria-label"],
          disabled: v.disabled,
          readOnly: v.readOnly,
          required: v.required,
          "aria-invalid": v.invalid,
        }),
    }),
  },
};
