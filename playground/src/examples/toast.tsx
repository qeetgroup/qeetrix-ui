import { ArchiveIcon, RefreshCwIcon, SendIcon } from "@qeetrix/icons";
import { Button, type ToastInput, type ToastType, toast } from "@qeetrix/ui";
import { invoices, logEvents } from "../data/qeet";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const overdue = invoices[3];

const show: Record<ToastType, (title: string, options?: ToastInput) => string> = {
  info: toast.info,
  success: toast.success,
  warning: toast.warning,
  error: toast.error,
};

/** Resolves (or rejects) after `ms`, like a request in flight. */
function settleAfter<T>(ms: number, outcome: { value: T } | { error: Error }): Promise<T> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if ("value" in outcome) resolve(outcome.value);
      else reject(outcome.error);
    }, ms);
  });
}

function archiveTenant() {
  const id = toast("Northwind Retail archived", {
    description: "724 users lose access at the end of the billing cycle.",
    timeout: 8000,
    actionProps: {
      children: "Undo",
      onClick: () => {
        toast.dismiss(id);
        toast.success("Northwind Retail restored");
      },
    },
  });
}

function syncScim() {
  void toast.promise(settleAfter(1800, { value: 14 }), {
    loading: { title: "Syncing users from Okta…", description: "SCIM · Acme India" },
    success: (count: number) => ({
      title: `${count} users synced`,
      description: "3 created · 11 updated · 0 deactivated",
      type: "success",
    }),
    error: { title: "SCIM sync failed", type: "error" },
  });
}

function sendTestSms() {
  const failure = logEvents[2];
  void toast
    .promise(settleAfter(1500, { error: new Error(String(failure.attributes["provider.code"])) }), {
      loading: { title: "Sending test SMS to +91 98450 12345…" },
      success: { title: "Test SMS delivered", type: "success" },
      error: (error: Error) => ({
        title: "SMS provider rejected the template",
        description: `${error.message}: DLT template otp_login_v3 is not registered.`,
        type: "error",
      }),
    })
    .catch(() => undefined);
}

const toastControls = {
  type: select(["info", "success", "warning", "error"] as const, "success"),
  title: text("Payment captured", "Title"),
  description: text("₹2,92,640.00 via UPI for QP-INV-2026-00412", "Description"),
  action: bool(false, "Action button"),
  timeout: select(
    ["default", "5000", "10000", "0"] as const,
    "default",
    "timeout (ms; 0 = sticky)",
  ),
  priority: select(["default", "low", "high"] as const, "default", "priority"),
};

export const examples: FamilyExamples = {
  toast: {
    demos: [
      {
        name: "Types",
        description:
          "Each type sets the icon and accent. Toasts stack bottom-end, pause on hover and announce politely.",
        render: () => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                toast("New sign-in from Mumbai", {
                  description: "ThinkPad X1 · Firefox 140 · SSO (Okta)",
                })
              }
            >
              Info
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.success("Invoice sent", {
                  description: "QP-INV-2026-00412 emailed to accounts@acme.in",
                })
              }
            >
              Success
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.warning("API key expires in 7 days", {
                  description: "Staging CI · qk_test_Ab91… — rotate it before 13 Oct.",
                })
              }
            >
              Warning
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast.error("UPI collect failed", {
                  description: `${overdue.number} · the payer's bank declined the request.`,
                })
              }
            >
              Error
            </Button>
          </div>
        ),
      },
      {
        name: "With action",
        description: "`actionProps` adds one button — typically Undo for a reversible action.",
        render: () => (
          <Button variant="outline" onClick={archiveTenant}>
            <ArchiveIcon data-icon="inline-start" aria-hidden />
            Archive tenant
          </Button>
        ),
      },
      {
        name: "Promise",
        description:
          "`toast.promise` shows a loading toast and updates it in place when the promise settles.",
        render: () => (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={syncScim}>
              <RefreshCwIcon data-icon="inline-start" aria-hidden />
              Sync SCIM users
            </Button>
            <Button variant="outline" onClick={sendTestSms}>
              <SendIcon data-icon="inline-start" aria-hidden />
              Send test SMS (fails)
            </Button>
          </div>
        ),
      },
      {
        name: "Sticky",
        description:
          "`timeout: 0` keeps it until dismissed — reserve it for security events. Errors already announce assertively (priority high), and errors, warnings and toasts with an action stay 10 s instead of 5 s.",
        render: () => (
          <Button
            variant="destructive"
            onClick={() =>
              toast.error("Refresh token reuse detected", {
                description: "Kavya Sharma's session family was revoked. Review the audit log.",
                timeout: 0,
              })
            }
          >
            Simulate token reuse
          </Button>
        ),
      },
    ],
    playground: definePlayground({
      controls: toastControls,
      render: (v) => (
        <Button
          variant="outline"
          onClick={() =>
            show[v.type](v.title, {
              description: v.description || undefined,
              timeout: v.timeout === "default" ? undefined : Number(v.timeout),
              priority: v.priority === "default" ? undefined : v.priority,
              actionProps: v.action
                ? { children: "View invoice", onClick: () => toast.dismiss() }
                : undefined,
            })
          }
        >
          Show toast
        </Button>
      ),
      code: (v) => {
        const fn = v.type === "info" ? "toast" : `toast.${v.type}`;
        const options = [
          v.description ? `description: ${JSON.stringify(v.description)}` : "",
          v.timeout !== "default" ? `timeout: ${v.timeout}` : "",
          v.priority !== "default" ? `priority: "${v.priority}"` : "",
          v.action ? 'actionProps: { children: "View invoice", onClick: openInvoice }' : "",
        ].filter(Boolean);
        const args = options.length
          ? `${JSON.stringify(v.title)}, {\n      ${options.join(",\n      ")},\n    }`
          : JSON.stringify(v.title);
        return `<Button\n  variant="outline"\n  onClick={() =>\n    ${fn}(${args})\n  }\n>\n  Show toast\n</Button>`;
      },
    }),
  },
};
