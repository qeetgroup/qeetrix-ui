import { MinusIcon, PlusIcon } from "@qeetrix/icons";
import { Button, RollingNumber } from "@qeetrix/ui";
import { useEffect, useState } from "react";
import { invoices, invoiceTotals, paymentMethods } from "../data/qeet";
import { jsx } from "../lib/code";
import { definePlayground, type FamilyExamples, num, select } from "../registry/types";

const upiShare = paymentMethods.find((method) => method.key === "upi");
const OPENING_VOLUME = upiShare?.volume ?? 2894000;

/** Captured payments that "arrive" one after another — deterministic, cycling through invoices. */
const incoming = invoices
  .filter((invoice) => invoice.status !== "void")
  .map((invoice) => Math.round(invoiceTotals(invoice).total / 40));

function LiveVolumeDemo() {
  const [volume, setVolume] = useState(OPENING_VOLUME);
  const [count, setCount] = useState(1284);
  useEffect(() => {
    let tick = 0;
    const id = setInterval(() => {
      const amount = incoming[tick % incoming.length] ?? 0;
      tick += 1;
      setVolume((v) => v + amount);
      setCount((c) => c + 1);
    }, 2000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex w-72 flex-col gap-1 rounded-lg border bg-card p-4">
      <span className="text-caption text-muted-foreground">UPI volume today · live</span>
      <span className="font-heading text-2xl font-semibold">
        ₹<RollingNumber value={volume} locale="en-IN" duration={900} />
      </span>
      <span className="text-caption text-muted-foreground">
        <RollingNumber value={count} locale="en-IN" /> payments captured
      </span>
    </div>
  );
}

function SettlementDemo() {
  const [balance, setBalance] = useState(482310.5);
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm">
        <span className="text-muted-foreground">Pending settlement </span>
        <span className="font-semibold">
          ₹<RollingNumber value={balance} decimals={2} locale="en-IN" />
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setBalance((b) => b + 292640)}>
          <PlusIcon data-icon="inline-start" aria-hidden />
          Capture ₹2,92,640
        </Button>
        <Button size="sm" variant="outline" onClick={() => setBalance((b) => b - 2926.4)}>
          <MinusIcon data-icon="inline-start" aria-hidden />
          Refund ₹2,926.40
        </Button>
      </div>
    </div>
  );
}

function SessionsDemo() {
  const [sessions, setSessions] = useState(1842);
  return (
    <div className="flex items-center gap-3 text-sm">
      <Button
        size="icon-sm"
        variant="outline"
        aria-label="Revoke 100 sessions"
        onClick={() => setSessions((s) => Math.max(0, s - 100))}
      >
        <MinusIcon aria-hidden />
      </Button>
      <div className="flex min-w-36 flex-col items-center">
        <span className="text-xs text-muted-foreground">Slow (1500 ms)</span>
        <RollingNumber value={sessions} duration={1500} locale="en-IN" className="text-lg" />
      </div>
      <div className="flex min-w-36 flex-col items-center">
        <span className="text-xs text-muted-foreground">Instant (0 ms)</span>
        <RollingNumber value={sessions} duration={0} locale="en-IN" className="text-lg" />
      </div>
      <Button
        size="icon-sm"
        variant="outline"
        aria-label="Add 100 sessions"
        onClick={() => setSessions((s) => s + 100)}
      >
        <PlusIcon aria-hidden />
      </Button>
    </div>
  );
}

const rollingControls = {
  value: num(2894000, { min: 0, max: 100000000, step: 25000, label: "Value" }),
  decimals: num(0, { min: 0, max: 4, label: "Decimals" }),
  duration: num(600, { min: 0, max: 3000, step: 100, label: "Duration (ms)" }),
  locale: select(["en-IN", "en-US", "de-DE", "browser"] as const, "en-IN", "Locale"),
};

export const examples: FamilyExamples = {
  "rolling-number": {
    minHeight: 380,
    demos: [
      {
        name: "Live ₹ volume",
        description: "A new payment lands every two seconds; the total eases to its new value.",
        render: () => <LiveVolumeDemo />,
      },
      {
        name: "Decimals",
        render: () => <SettlementDemo />,
      },
      {
        name: "Duration",
        render: () => <SessionsDemo />,
      },
      {
        name: "Locale grouping",
        description: "en-IN groups by lakh and crore; en-US by thousands.",
        render: () => (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">en-IN</dt>
            <dd>
              ₹<RollingNumber value={123456789} locale="en-IN" />
            </dd>
            <dt className="text-muted-foreground">en-US</dt>
            <dd>
              ₹<RollingNumber value={123456789} locale="en-US" />
            </dd>
          </dl>
        ),
      },
    ],
    playground: definePlayground({
      controls: rollingControls,
      render: (v) => (
        <span className="text-2xl font-semibold">
          <RollingNumber
            value={v.value}
            decimals={v.decimals}
            duration={v.duration}
            locale={v.locale === "browser" ? undefined : v.locale}
          />
        </span>
      ),
      code: (v) =>
        jsx("RollingNumber", {
          value: v.value,
          decimals: v.decimals || undefined,
          duration: v.duration === 600 ? undefined : v.duration,
          locale: v.locale === "browser" ? undefined : v.locale,
        }),
    }),
  },
};
