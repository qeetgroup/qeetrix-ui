import { BuildingComplexIcon, PauseIcon, PlayIcon } from "@qeetrix/icons";
import { Button, Marquee, type StatusKind, StatusPill } from "@qeetrix/ui";
import { useState } from "react";
import { formatInrCompact, tenants } from "../data/qeet";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select } from "../registry/types";

const customers = [
  ...tenants.map((tenant) => tenant.name),
  "Coastal Spices Exports",
  "Indus Motors",
  "Lotus Education Trust",
];

function CustomerNames() {
  return customers.map((name) => (
    <span
      key={name}
      className="flex shrink-0 items-center gap-2 text-sm font-medium whitespace-nowrap text-muted-foreground"
    >
      <BuildingComplexIcon aria-hidden className="size-4" />
      {name}
    </span>
  ));
}

const services: readonly { id: string; name: string; kind: StatusKind; label: string }[] = [
  { id: "id", name: "Qeet ID sign-in", kind: "success", label: "Operational" },
  { id: "upi", name: "UPI collect", kind: "warning", label: "Degraded · p95 4.8 s" },
  { id: "nach", name: "NACH mandates", kind: "success", label: "Operational" },
  { id: "sms", name: "SMS OTP (Jio route)", kind: "warning", label: "Delayed" },
  { id: "whatsapp", name: "WhatsApp templates", kind: "success", label: "Operational" },
  { id: "logs", name: "Log ingest · ap-south-1", kind: "success", label: "Operational" },
];

function ServiceStatuses() {
  return services.map((service) => (
    <span key={service.id} className="flex shrink-0 items-center gap-2 text-sm whitespace-nowrap">
      {service.name}
      <StatusPill kind={service.kind}>{service.label}</StatusPill>
    </span>
  ));
}

const settlements = [
  { id: "set_1", text: "Acme India · UPI", amount: 292640 },
  { id: "set_2", text: "Bharat FinServ · NACH", amount: 1386500 },
  { id: "set_3", text: "Zenvia Health · UPI", amount: 96880 },
  { id: "set_4", text: "Indus Motors · Net banking", amount: 898560 },
  { id: "set_5", text: "Coastal Spices · Card", amount: 61845 },
];

/** WCAG 2.2.2: a ticker beside other content needs a visible way to stop it. */
function PausableTicker() {
  const [paused, setPaused] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-surface-subtle p-1.5">
      <Button
        size="icon-sm"
        variant="ghost"
        aria-pressed={paused}
        aria-label={paused ? "Resume status ticker" : "Pause status ticker"}
        onClick={() => setPaused(!paused)}
      >
        {paused ? <PlayIcon aria-hidden /> : <PauseIcon aria-hidden />}
      </Button>
      <Marquee
        paused={paused}
        speed={35}
        gap={32}
        role="marquee"
        aria-label="Platform status"
        className="min-w-0 flex-1"
      >
        <ServiceStatuses />
      </Marquee>
    </div>
  );
}

const marqueeControls = {
  direction: select(["left", "right"] as const, "left"),
  speed: num(20, { min: 5, max: 60, step: 1, label: "Seconds per loop (speed)" }),
  gap: num(24, { min: 8, max: 64, step: 4, label: "Gap (px)" }),
  pauseOnHover: bool(true, "Pause on hover"),
  paused: bool(false, "Paused"),
};

export const examples: FamilyExamples = {
  marquee: {
    layout: "wide",
    minHeight: 420,
    demos: [
      {
        name: "Customer names",
        description:
          "A logo-wall ticker that pauses on hover. Under `prefers-reduced-motion` it does not move: the duplicate copy is dropped and the names wrap, so every one is visible.",
        render: () => (
          <Marquee role="marquee" aria-label="Teams that sign in with Qeet ID" className="py-2">
            <CustomerNames />
          </Marquee>
        ),
      },
      {
        name: "Status ticker",
        description: "Service health from the Qeet status page, scrolling the other way.",
        render: () => (
          <Marquee
            direction="right"
            speed={35}
            gap={32}
            role="marquee"
            aria-label="Platform status"
            className="rounded-lg border bg-surface-subtle py-2.5"
          >
            <ServiceStatuses />
          </Marquee>
        ),
      },
      {
        name: "Pause control",
        description:
          "`paused` is controlled: wire it to a visible button, because a ticker running beside other content must be stoppable without hovering (WCAG 2.2.2). Focus inside the marquee also pauses it.",
        render: () => <PausableTicker />,
      },
      {
        name: "Settlements feed",
        description: "A slow ticker with `pauseOnHover={false}` for a wall display.",
        render: () => (
          <Marquee speed={45} pauseOnHover={false} role="marquee" aria-label="Today's settlements">
            {settlements.map((entry) => (
              <span key={entry.id} className="shrink-0 text-sm whitespace-nowrap">
                {entry.text}{" "}
                <span className="font-medium tabular-nums">{formatInrCompact(entry.amount)}</span>
              </span>
            ))}
          </Marquee>
        ),
      },
    ],
    playground: definePlayground({
      controls: marqueeControls,
      render: (v) => (
        <div className="w-[min(100%,720px)]">
          <Marquee
            direction={v.direction}
            speed={v.speed}
            gap={v.gap}
            pauseOnHover={v.pauseOnHover}
            paused={v.paused}
            role="marquee"
            aria-label="Platform status"
          >
            <ServiceStatuses />
          </Marquee>
        </div>
      ),
      code: (v) =>
        jsx(
          "Marquee",
          {
            ...changedProps(v, marqueeControls),
            role: "marquee",
            "aria-label": "Platform status",
          },
          [
            '<span className="text-sm">Qeet ID sign-in <StatusPill kind="success">Operational</StatusPill></span>',
            '<span className="text-sm">UPI collect <StatusPill kind="warning">Degraded</StatusPill></span>',
          ],
        ),
    }),
  },
};
