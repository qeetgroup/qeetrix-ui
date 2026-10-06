import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  TagInput,
} from "@qeetrix/ui";
import { useState } from "react";
import { tenants } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, text } from "../registry/types";

const DOMAIN_PATTERN = /^(?=.{3,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/;

function normaliseDomain(tag: string): string | null {
  const domain = tag
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  return DOMAIN_PATTERN.test(domain) ? domain : null;
}

function normaliseRedirect(tag: string): string | null {
  try {
    const url = new URL(tag.trim());
    return url.protocol === "https:" || url.hostname === "localhost" ? url.href : null;
  } catch {
    return null;
  }
}

function AllowedDomainsDemo() {
  const [domains, setDomains] = useState<string[]>(["acme.in", "acme.co.in"]);
  return (
    <Field className="w-96 max-w-full">
      <FieldLabel>Allowed sign-up domains</FieldLabel>
      <FieldControl
        render={
          <TagInput
            value={domains}
            onChange={setDomains}
            validate={normaliseDomain}
            placeholder="Add a domain"
          />
        }
      />
      <FieldDescription>
        Press Enter or comma to add. Anyone at these domains can join {tenants[0].name}.
      </FieldDescription>
    </Field>
  );
}

function RedirectUrisDemo() {
  const [uris, setUris] = useState<string[]>([
    "https://pay.acme.in/auth/callback",
    "http://localhost:5173/callback",
  ]);
  const [rejected, setRejected] = useState<string | null>(null);
  return (
    <Field className="w-96 max-w-full">
      <FieldLabel>Redirect URIs</FieldLabel>
      <FieldControl
        render={
          <TagInput
            value={uris}
            onChange={(next) => {
              setUris(next);
              setRejected(null);
            }}
            validate={(tag) => {
              const uri = normaliseRedirect(tag);
              if (!uri) setRejected(tag);
              return uri;
            }}
            addOnComma={false}
            placeholder="https://…"
            className="font-mono"
          />
        }
      />
      {rejected ? (
        <FieldError>
          “{rejected}” isn't allowed: redirect URIs must use https (or localhost).
        </FieldError>
      ) : (
        <FieldDescription>Qeet ID only redirects to an exact match.</FieldDescription>
      )}
    </Field>
  );
}

function ScopesDemo() {
  const [scopes, setScopes] = useState<string[]>(["openid", "profile", "email"]);
  const max = 5;
  return (
    <Field className="w-96 max-w-full">
      <FieldLabel>Default OAuth scopes</FieldLabel>
      <FieldControl
        render={
          <TagInput
            value={scopes}
            onChange={setScopes}
            maxTags={max}
            validate={(tag) => tag.toLowerCase().replace(/\s+/g, "")}
            placeholder={scopes.length >= max ? "" : "Add a scope"}
          />
        }
      />
      <FieldDescription>
        {scopes.length} of {max}. ArrowLeft moves onto the tags; Backspace removes one.
      </FieldDescription>
    </Field>
  );
}

function EscalationDemo() {
  const [emails, setEmails] = useState<string[]>([]);
  return (
    <Field className="w-96 max-w-full">
      <FieldLabel>Escalation contacts</FieldLabel>
      <FieldControl
        render={
          <TagInput
            value={emails}
            onChange={setEmails}
            validate={(tag) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tag) ? tag.toLowerCase() : null)}
            placeholder="name@acme.in"
          />
        }
      />
      {emails.length === 0 ? (
        <FieldError>Add at least one contact for P1 incidents.</FieldError>
      ) : (
        <FieldDescription>Paged by SMS and WhatsApp through Qeet Notify.</FieldDescription>
      )}
    </Field>
  );
}

function PlaygroundTags({
  placeholder,
  addOnComma,
  dedupe,
  maxTags,
  disabled,
}: {
  placeholder: string;
  addOnComma: boolean;
  dedupe: boolean;
  maxTags: number;
  disabled: boolean;
}) {
  const [tags, setTags] = useState<string[]>(["payments", "invoices", "gst"]);
  return (
    <TagInput
      aria-label="Webhook event filters"
      value={tags}
      onChange={setTags}
      placeholder={placeholder}
      addOnComma={addOnComma}
      dedupe={dedupe}
      maxTags={maxTags > 0 ? maxTags : undefined}
      disabled={disabled}
    />
  );
}

const tagControls = {
  placeholder: text("Add a filter", "Placeholder"),
  addOnComma: bool(true, "addOnComma"),
  dedupe: bool(true, "dedupe"),
  maxTags: num(0, { min: 0, max: 20, label: "maxTags (0 = none)" }),
  disabled: bool(false),
};

export const examples: FamilyExamples = {
  "tag-input": {
    minHeight: 360,
    demos: [
      {
        name: "Allowed domains",
        description:
          "`validate` normalises each entry (lower-case, scheme stripped) or rejects it.",
        render: () => <AllowedDomainsDemo />,
      },
      {
        name: "Rejected entries",
        description: "Type `http://acme.in/cb` and press Enter to see the error.",
        render: () => <RedirectUrisDemo />,
      },
      {
        name: "Maximum",
        render: () => <ScopesDemo />,
      },
      {
        name: "Invalid",
        description: "Empty and required: the FieldError clears once an address is added.",
        render: () => <EscalationDemo />,
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-96 max-w-full" data-disabled="true">
            <FieldLabel>SCIM group mappings</FieldLabel>
            <FieldControl
              render={
                <TagInput
                  value={["Engineering", "Finance", "Risk & Compliance"]}
                  onChange={() => undefined}
                  disabled
                />
              }
            />
            <FieldDescription>Synced from Okta every 40 minutes.</FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls: tagControls,
      render: (v) => (
        <div className="w-96 max-w-full">
          <PlaygroundTags
            placeholder={v.placeholder}
            addOnComma={v.addOnComma}
            dedupe={v.dedupe}
            maxTags={v.maxTags}
            disabled={v.disabled}
          />
        </div>
      ),
      code: (v) =>
        jsx("TagInput", {
          "aria-label": "Webhook event filters",
          value: expr("tags"),
          onChange: expr("setTags"),
          placeholder: v.placeholder || undefined,
          ...changedProps(v, tagControls, ["addOnComma", "dedupe"]),
          maxTags: v.maxTags > 0 ? v.maxTags : undefined,
          disabled: v.disabled,
        }),
    }),
  },
};
