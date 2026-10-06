import { CodeBlock, type CodeLanguage } from "@qeetrix/ui";
import { curlExample, idTokenClaims, logEvents, paymentWebhook } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

const webhookJson = JSON.stringify(paymentWebhook, null, 2);

const refundRequest = `POST /pay/v1/refunds HTTP/1.1
Host: api.qeet.in
Authorization: Bearer qk_live_7Hc2••••••••
Content-Type: application/json
Idempotency-Key: 3d8f0c1e-refund-pay_8Kq2Nf

{"payment": "pay_8Kq2Nf", "amount": 292640, "reason": "duplicate_charge"}`;

const refundResponse = `HTTP/1.1 201 Created
Content-Type: application/json
Qeet-Request-Id: req_01J9ZC2T7M4B
RateLimit-Remaining: 498

{"id": "rfnd_5Ld9Qa", "status": "processing", "eta": "T+2 working days", "method": "upi"}`;

/** A compact-serialised ID token (header.payload.signature), the kind of value that needs `wrap`. */
const encodedIdToken = [
  "eyJhbGciOiJFUzI1NiIsImtpZCI6InFpZC1zaWduLTIwMjYtMDkiLCJ0eXAiOiJKV1QifQ",
  btoa(JSON.stringify(idTokenClaims)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"),
  "MEUCIQDl3pZb7m2c9Qy1X4pV8fLwN0sJr6Kq2tHc5bYv8aZgPAIgS1dWn4oRk9x3EmYz7uTb2QcLf6vNa0jHs8gPw4iDk",
].join(".");

/** A shell session with comments and a here-doc, to exercise the shell highlighter. */
const rotateKeyScript = `# Rotate the live checkout key and roll it out to the pods
export QEET_API_KEY="$(qeet keys rotate key_live_01 --format raw)"
kubectl -n checkout create secret generic qeet-pay \\
  --from-literal=api-key="$QEET_API_KEY" --dry-run=client -o yaml | kubectl apply -f -
kubectl -n checkout rollout restart deploy/checkout-api  # zero-downtime restart
qeet logs tail --service qeet-pay-api --level warn --since 5m`;

const logTail = logEvents
  .map(
    (event) =>
      `${event.timestamp.slice(11, 19)}Z  ${event.level.toUpperCase().padEnd(5)}  ${event.service.padEnd(16)}  ${event.message}  trace=${event.traceId}`,
  )
  .join("\n");

const samples: Record<CodeLanguage, { value: string; caption: string; name: string }> = {
  json: { value: webhookJson, caption: "payment.captured · application/json", name: "webhookJson" },
  shell: { value: curlExample, caption: "Create an invoice with curl", name: "curlExample" },
  http: { value: refundRequest, caption: "POST /pay/v1/refunds", name: "refundRequest" },
  text: { value: logTail, caption: "qeet-logs tail --since 15m", name: "logTail" },
};

const codeControls = {
  language: select(["json", "shell", "http", "text"] as const, "json"),
  showLanguage: bool(false, "showLanguage"),
  wrap: bool(false, "wrap"),
  lineNumbers: bool(true, "Line numbers"),
  copy: bool(true, "Copy button"),
  caption: text("payment.captured · application/json", "Caption"),
  maxHeight: select(["max-h-96", "max-h-48", "max-h-none"] as const, "max-h-96", "maxHeight"),
};

export const examples: FamilyExamples = {
  "code-block": {
    layout: "wide",
    minHeight: 2100,
    demos: [
      {
        name: "JSON with line numbers",
        description:
          "The built-in JSON highlighter colours keys, strings, numbers and literals with the syntax tokens. Hover or focus to reveal the copy button.",
        render: () => (
          <CodeBlock
            value={webhookJson}
            language="json"
            lineNumbers
            caption="payment.captured · application/json"
          />
        ),
      },
      {
        name: "Shell, with the language shown",
        description:
          "The shell highlighter colours comments, strings, flags and variables; `showLanguage` names the language in the header.",
        render: () => (
          <div className="flex flex-col gap-4">
            <CodeBlock
              value={curlExample}
              language="shell"
              showLanguage
              caption="Create an invoice with curl"
            />
            <CodeBlock
              value={rotateKeyScript}
              language="shell"
              showLanguage
              lineNumbers
              caption="rotate-checkout-key.sh"
            />
          </div>
        ),
      },
      {
        name: "HTTP request and response",
        description:
          "One message per block: the request or status line, then headers as keys, then the body after the blank line, highlighted as JSON.",
        render: () => (
          <div className="grid gap-4 lg:grid-cols-2">
            <CodeBlock
              value={refundRequest}
              language="http"
              showLanguage
              lineNumbers
              wrap
              caption="Request · POST /pay/v1/refunds"
            />
            <CodeBlock
              value={refundResponse}
              language="http"
              showLanguage
              lineNumbers
              wrap
              caption="Response · 201 Created"
            />
          </div>
        ),
      },
      {
        name: "Wrapped",
        description:
          "`wrap` soft-wraps long lines — a compact ID token, a log line — instead of scrolling them sideways in a narrow panel.",
        render: () => (
          <div className="grid gap-4 md:grid-cols-2">
            <CodeBlock value={encodedIdToken} wrap caption="id_token (wrap)" />
            <CodeBlock value={encodedIdToken} caption="id_token (no wrap, scrolls)" />
          </div>
        ),
      },
      {
        name: "Scrolling, no copy",
        description:
          "`maxHeight` caps the block before it scrolls; `copy={false}` drops the button for read-only output.",
        render: () => (
          <CodeBlock
            value={JSON.stringify(idTokenClaims, null, 2)}
            language="json"
            maxHeight="max-h-40"
            copy={false}
            caption="Decoded ID token · id.qeet.in"
          />
        ),
      },
      {
        name: "Plain text",
        render: () => <CodeBlock value={logTail} caption="qeet-logs tail --since 15m" />,
      },
    ],
    playground: definePlayground({
      controls: codeControls,
      render: (v) => (
        <div className="w-full">
          <CodeBlock
            value={samples[v.language].value}
            language={v.language}
            showLanguage={v.showLanguage}
            wrap={v.wrap}
            lineNumbers={v.lineNumbers}
            copy={v.copy}
            caption={v.caption || undefined}
            maxHeight={v.maxHeight}
          />
        </div>
      ),
      code: (v) =>
        jsx("CodeBlock", {
          value: expr(samples[v.language].name),
          language: v.language === "text" ? undefined : v.language,
          showLanguage: v.showLanguage,
          wrap: v.wrap,
          lineNumbers: v.lineNumbers,
          copy: v.copy ? undefined : expr("false"),
          caption: v.caption || undefined,
          maxHeight: v.maxHeight === "max-h-96" ? undefined : v.maxHeight,
        }),
    }),
  },
};
