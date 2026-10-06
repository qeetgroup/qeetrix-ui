import { Field, FieldDescription, FieldError, FieldLabel, RichTextEditor } from "@qeetrix/ui";
import { useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const postmortem = `<h2>Postmortem: SMS OTP delivery failures (INC-2041)</h2>
<p><strong>Impact:</strong> 6 Oct 2026, 08:12–09:47 IST. 18% of SMS one-time passwords for Acme India and Bharat FinServ were rejected by the provider. Passkey and TOTP sign-ins were unaffected.</p>
<h3>Root cause</h3>
<p>The <code>otp_login_v3</code> template was deployed before its DLT registration was approved, so the provider returned <code>DLT-4041</code> for every message that used it.</p>
<h3>Action items</h3>
<ul>
<li>Block template deploys until the DLT id is verified (owner: Priya Nair)</li>
<li>Fail over to WhatsApp OTP when SMS rejects a template (owner: Arjun Reddy)</li>
<li>Alert on provider rejection rate above 2% for 5 minutes</li>
</ul>
<blockquote><p>No customer data was exposed. Affected users could retry with a passkey.</p></blockquote>`;

const releaseNote = `<h2>Qeet Pay 2026.10</h2>
<p>October's release focuses on settlements and GST.</p>
<ol>
<li><strong>Instant settlements</strong> for UPI captures under ₹2,00,000, in ap-south-1.</li>
<li><strong>GSTR-1 export</strong> now includes credit notes and the HSN summary.</li>
<li>NACH mandate retries back off over 3 business days instead of 24 hours.</li>
</ol>
<p>Questions? Reply to this note or write to <a href="mailto:billing@qeet.in">billing@qeet.in</a>.</p>`;

const runbook = `<h3>Runbook: rotate a leaked API key</h3>
<p>Revoke the key in <a href="https://console.qeet.in/acme/api-keys">Qeet ID → API keys</a>, then issue a replacement scoped to the same service.</p>
<ol>
<li>Find every caller in Qeet Logs with <code>api_key.prefix = qk_live_7Hc2</code>.</li>
<li>Deploy the new key to the checkout service, then revoke the old one.</li>
<li>Record the rotation in the security incident log.</li>
</ol>
<p>Link the incident ticket here.</p>`;

const contents = { postmortem, "release note": releaseNote, runbook, empty: "" } as const;

function PublishNoteDemo() {
  const [html, setHtml] = useState("");
  const words = html
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return (
    <Field>
      <FieldLabel>Release note for Qeet ID 4.2</FieldLabel>
      <RichTextEditor
        value={html}
        onChange={setHtml}
        name="release_note"
        placeholder="Summarise what changed for tenant admins…"
      />
      <FieldDescription>
        Sent to every tenant owner by Qeet Notify. {words} {words === 1 ? "word" : "words"}.
      </FieldDescription>
    </Field>
  );
}

const controls = {
  content: select(["postmortem", "release note", "runbook", "empty"] as const, "postmortem"),
  editable: bool(true),
  disabled: bool(false),
  placeholder: text("Write the incident summary…", "Placeholder"),
  toolbarLabel: text("Formatting", "Toolbar label"),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

export const examples: FamilyExamples = {
  "rich-text-editor": {
    layout: "wide",
    minHeight: 2300,
    demos: [
      {
        name: "Incident postmortem",
        description:
          "Headings, lists, inline code and quotes from Tiptap's StarterKit. The toolbar is one tab stop; arrow keys move within it.",
        render: () => <RichTextEditor defaultValue={postmortem} aria-label="INC-2041 postmortem" />,
      },
      {
        name: "Empty, controlled",
        description: "A Field labels the editing surface; `onChange` reports HTML on every edit.",
        render: () => <PublishNoteDemo />,
      },
      {
        name: "Links (Mod+K)",
        description:
          "Select text and press ⌘K / Ctrl+K (or the Link button) to open the link bar: Enter applies, Escape cancels, an existing link can be edited or removed.",
        render: () => (
          <RichTextEditor defaultValue={runbook} aria-label="API key rotation runbook" />
        ),
      },
      {
        name: "Read-only",
        description: "`editable={false}` hides the toolbar and reports aria-readonly.",
        render: () => (
          <RichTextEditor
            defaultValue={releaseNote}
            editable={false}
            aria-label="Qeet Pay 2026.10 release note"
          />
        ),
      },
      {
        name: "Disabled",
        description:
          "`disabled` makes the field inert: no focus, toolbar off, aria-disabled, and nothing submitted.",
        render: () => (
          <Field>
            <FieldLabel>Postmortem (locked)</FieldLabel>
            <RichTextEditor defaultValue={postmortem} disabled name="postmortem" />
            <FieldDescription>Locked after sign-off by Ananya Iyer on 6 Oct 2026.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field>
            <FieldLabel>Customer-facing summary</FieldLabel>
            <RichTextEditor placeholder="What happened, who was affected, what's fixed…" required />
            <FieldError>Add a summary before publishing the status page update.</FieldError>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls,
      render: (v) => (
        <div className="w-[min(48rem,90vw)]">
          <RichTextEditor
            key={v.content}
            defaultValue={contents[v.content]}
            editable={v.editable}
            disabled={v.disabled}
            placeholder={v.placeholder || undefined}
            toolbarLabel={v.toolbarLabel}
            aria-invalid={v.invalid || undefined}
            aria-label="Incident summary"
          />
        </div>
      ),
      code: (v) =>
        jsx("RichTextEditor", {
          defaultValue:
            v.content === "empty"
              ? undefined
              : expr(
                  {
                    postmortem: "postmortemHtml",
                    "release note": "releaseNoteHtml",
                    runbook: "runbookHtml",
                  }[v.content],
                ),
          editable: v.editable ? undefined : expr("false"),
          disabled: v.disabled,
          placeholder: v.placeholder || undefined,
          toolbarLabel: v.toolbarLabel === "Formatting" ? undefined : v.toolbarLabel,
          "aria-invalid": v.invalid,
          "aria-label": "Incident summary",
        }),
    }),
  },
};
