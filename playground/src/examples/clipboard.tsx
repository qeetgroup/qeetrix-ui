import { Button, CopyableSecret, CopyButton, toast, useCopyToClipboard } from "@qeetrix/ui";
import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import { apiKeys, logEvents } from "../data/qeet";
import { changedProps, expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

const [liveKey, testKey] = apiKeys;
const LIVE_SECRET = liveKey?.secret ?? "";
const TEST_SECRET = testKey?.secret ?? "";
const WEBHOOK_SECRET = "whsec_9fK2mQ7xL4pR8tV1nB6cZ3yH0wJ5sD2aE7gU";
const CLIENT_SECRET = "qcs_acme_c1a8f0e2b7d94c3f9a61e5b0d2c47f18a93e6b2d0c5f4a17e8b39d62c0f1a5e7";

/* ── CopyButton / useCopyToClipboard ──────────────────────────────────────────────────────── */

/** A trace-id cell built on the hook: the icon swaps only after the write is confirmed. */
function TraceIdCopy({ traceId }: { traceId: string }) {
  const { copied, error, copy } = useCopyToClipboard(2000);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">trace</span>
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{traceId}</code>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label={copied ? "Trace id copied" : `Copy trace id ${traceId}`}
        onClick={() => void copy(traceId)}
      >
        {copied ? <CheckIcon aria-hidden className="text-success" /> : <CopyIcon aria-hidden />}
      </Button>
      {error !== null && (
        <span role="alert" className="text-caption text-destructive">
          Clipboard blocked
        </span>
      )}
    </div>
  );
}

const copyButtonControls = {
  value: text("https://id.qeet.in/t/acme/.well-known/openid-configuration", "Value"),
  label: text("Copy", "Label"),
  copiedLabel: text("Copied!", "Copied label"),
  variant: select(["outline", "secondary", "ghost", "default"] as const, "outline"),
  size: select(["xs", "sm", "default", "lg"] as const, "sm"),
  timeout: num(1500, { min: 500, max: 5000, step: 500, label: "Timeout (ms)" }),
  disabled: bool(false),
};

/* ── CopyableSecret ───────────────────────────────────────────────────────────────────────── */

const secretControls = {
  value: text(LIVE_SECRET, "Value"),
  label: text("", "Inline label prefix"),
  size: select(["md", "sm"] as const, "md"),
  oneLine: bool(false, "One line"),
  disabled: bool(false),
};

export const examples: FamilyExamples = {
  clipboard: {
    minHeight: 320,
    demos: [
      {
        name: "Copy button",
        description: "`onCopy` fires only after the browser confirms the write.",
        render: () => (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Tenant ID</span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">tnt_acme</code>
            <CopyButton
              value="tnt_acme"
              onCopy={() => toast.success("Tenant ID copied")}
              onCopyError={() => toast.error("Couldn’t copy — clipboard access is blocked")}
            />
          </div>
        ),
      },
      {
        name: "Variants and sizes",
        render: () => (
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton
              value="https://pay.qeet.in/i/QP-INV-2026-00412"
              size="xs"
              label="Copy link"
            />
            <CopyButton value="https://pay.qeet.in/i/QP-INV-2026-00412" label="Copy link" />
            <CopyButton
              value="https://pay.qeet.in/i/QP-INV-2026-00412"
              size="default"
              variant="secondary"
              label="Copy payment link"
              copiedLabel="Link copied"
            />
            <CopyButton
              value="https://pay.qeet.in/i/QP-INV-2026-00412"
              variant="ghost"
              label="Copy"
            />
          </div>
        ),
      },
      {
        name: "useCopyToClipboard",
        description: "The hook for custom affordances: `copied` and `error` drive your own UI.",
        render: () => (
          <div className="flex flex-col gap-2">
            {logEvents.slice(0, 3).map((event) => (
              <TraceIdCopy key={event.id} traceId={event.traceId} />
            ))}
          </div>
        ),
      },
      {
        name: "Disabled",
        render: () => <CopyButton value="QP-INV-2026-00405" label="Copy invoice no." disabled />,
      },
    ],
    playground: definePlayground({
      controls: copyButtonControls,
      render: (v) => (
        <CopyButton
          value={v.value}
          label={v.label}
          copiedLabel={v.copiedLabel}
          variant={v.variant}
          size={v.size}
          timeout={v.timeout}
          disabled={v.disabled}
          onCopy={() => toast.success("Copied to clipboard")}
        />
      ),
      code: (v) =>
        jsx("CopyButton", {
          value: v.value,
          ...changedProps(v, copyButtonControls, [
            "label",
            "copiedLabel",
            "variant",
            "size",
            "timeout",
            "disabled",
          ]),
          onCopy: expr('() => toast.success("Copied to clipboard")'),
        }),
    }),
  },

  "copyable-secret": {
    layout: "wide",
    minHeight: 520,
    demos: [
      {
        name: "API key reveal",
        description: "One-time reveal panel: the full value stays visible so it can be stored.",
        render: () => (
          <div className="flex w-full max-w-xl flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              <KeyRoundIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="text-sm">
                <div className="font-medium">{liveKey?.name ?? "API key"} created</div>
                <div className="text-muted-foreground">
                  Copy this key now and store it in your secrets manager. It won’t be shown again.
                </div>
              </div>
            </div>
            <CopyableSecret
              value={LIVE_SECRET}
              onCopy={() => toast.success("API key copied")}
              onCopyError={() => toast.error("Couldn’t copy — select the key and copy manually")}
            />
          </div>
        ),
      },
      {
        name: "Label prefix",
        description: "`label` is shown before the value but not copied.",
        render: () => (
          <div className="w-full max-w-xl">
            <CopyableSecret label="QEET_API_KEY=" value={TEST_SECRET} oneLine />
          </div>
        ),
      },
      {
        name: "Small",
        render: () => (
          <div className="flex w-full max-w-lg flex-col gap-1.5">
            <span className="text-label">Webhook signing secret</span>
            <CopyableSecret size="sm" value={WEBHOOK_SECRET} copyLabel="Copy secret" />
          </div>
        ),
      },
      {
        name: "One line vs wrapping",
        description: "`oneLine` scrolls long values horizontally instead of breaking them.",
        render: () => (
          <div className="flex w-full max-w-md flex-col gap-3">
            <CopyableSecret label="client_secret=" value={CLIENT_SECRET} oneLine />
            <CopyableSecret label="client_secret=" value={CLIENT_SECRET} />
          </div>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <div className="w-full max-w-xl">
            <CopyableSecret value={TEST_SECRET} disabled />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: secretControls,
      render: (v) => (
        <div className="w-[32rem] max-w-full">
          <CopyableSecret
            value={v.value}
            label={v.label || undefined}
            size={v.size}
            oneLine={v.oneLine}
            disabled={v.disabled}
          />
        </div>
      ),
      code: (v) =>
        jsx("CopyableSecret", {
          value: v.value === LIVE_SECRET ? expr("apiKey.secret") : v.value,
          label: v.label || undefined,
          ...changedProps(v, secretControls, ["size", "oneLine", "disabled"]),
        }),
    }),
  },
};
