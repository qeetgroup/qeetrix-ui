import { JSONTree } from "@qeetrix/ui";
import { auditRecords, idTokenClaims, paymentWebhook } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

const payloads = {
  "ID token claims": { value: idTokenClaims, name: "claims" },
  "payment.captured webhook": { value: paymentWebhook, name: "webhook" },
  "Audit record": { value: auditRecords[0], name: "auditRecord" },
} as const;

type PayloadName = keyof typeof payloads;
const payloadNames = Object.keys(payloads) as PayloadName[];

const jsonControls = {
  payload: select(payloadNames, "payment.captured webhook", "Value"),
  initialOpenDepth: num(2, { min: 0, max: 4, step: 1, label: "initialOpenDepth" }),
  rootLabel: text("", "rootLabel (empty = none)"),
};

export const examples: FamilyExamples = {
  "json-tree": {
    layout: "wide",
    minHeight: 900,
    demos: [
      {
        name: "ID token claims",
        description:
          "The default depth (1) opens the top level; nested `org` and the `amr`/`roles` arrays start collapsed with a summary. `label` names the tree for screen readers.",
        render: () => (
          <JSONTree value={idTokenClaims} label="ID token claims" className="max-w-xl" />
        ),
      },
      {
        name: "Webhook payload, fully open",
        description: "`initialOpenDepth={4}` expands the whole Qeet Pay `payment.captured` body.",
        render: () => (
          <JSONTree
            value={paymentWebhook}
            initialOpenDepth={4}
            rootLabel="body"
            label="payment.captured webhook body"
            className="max-w-xl"
          />
        ),
      },
      {
        name: "Collapsed",
        description: "`initialOpenDepth={0}` shows a one-line summary until the reader drills in.",
        render: () => (
          <JSONTree
            value={auditRecords[0]}
            initialOpenDepth={0}
            rootLabel="aud_9001"
            className="max-w-xl"
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: jsonControls,
      render: (v) => (
        <JSONTree
          // Open state is seeded from `initialOpenDepth`, so remount when it changes.
          key={`${v.payload}-${v.initialOpenDepth}`}
          value={payloads[v.payload].value}
          label={v.payload}
          initialOpenDepth={v.initialOpenDepth}
          rootLabel={v.rootLabel || null}
          className="w-full max-w-xl"
        />
      ),
      code: (v) =>
        jsx("JSONTree", {
          value: expr(payloads[v.payload].name),
          label: v.payload,
          initialOpenDepth: v.initialOpenDepth === 1 ? undefined : v.initialOpenDepth,
          rootLabel: v.rootLabel || undefined,
        }),
    }),
  },
};
