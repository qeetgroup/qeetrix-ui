import { Badge, Button, cn, FloatingWindow } from "@qeetrix/ui";
import { BookOpenIcon, ScrollTextIcon, SquareTerminalIcon, StickyNoteIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { type LogLevel, logEvents } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, text } from "../registry/types";

/**
 * FloatingWindow is `position: fixed` against the viewport, so these demos are framed: each
 * root has an explicit height and stands in for the page the window floats over.
 */
function FakePage({
  title,
  subtitle,
  details,
  children,
}: {
  title: string;
  subtitle: string;
  details: readonly (readonly [string, string])[];
  children: ReactNode;
}) {
  return (
    <div className="flex h-[420px] w-full flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-heading text-base font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
      <dl className="grid max-w-md grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm">
        {details.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="truncate">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const setupSteps = [
  "In Okta, create a SAML 2.0 app named “Qeet ID – Acme India”.",
  "Paste the ACS URL https://id.qeet.in/t/acme/saml/acs.",
  "Set the Audience URI to urn:qeet:id:tnt_acme.",
  "Map user.email to the NameID; send groups as “roles”.",
  "Upload the Okta metadata XML here and run a test sign-in.",
];

function SetupGuideDemo() {
  const [open, setOpen] = useState(false);
  return (
    <FakePage
      title="Single sign-on"
      subtitle="Acme India · SAML with Okta"
      details={[
        ["Status", "Not connected"],
        ["Domain", "acme.in (verified)"],
        ["Enforcement", "Optional for members"],
        ["SCIM", "Off"],
      ]}
    >
      <Button variant="outline" onClick={() => setOpen(true)} disabled={open}>
        <BookOpenIcon data-icon="inline-start" aria-hidden />
        Open setup guide
      </Button>
      <FloatingWindow
        open={open}
        onClose={() => setOpen(false)}
        title="Okta SAML setup guide"
        defaultPosition={{ x: 320, y: 84 }}
      >
        <ol className="flex list-decimal flex-col gap-2 ps-4 text-muted-foreground marker:text-foreground">
          {setupSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </FloatingWindow>
    </FakePage>
  );
}

const levelVariant: Record<LogLevel, "muted" | "secondary" | "warning" | "destructive"> = {
  debug: "muted",
  info: "secondary",
  warn: "warning",
  error: "destructive",
};

const time = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

function LiveTailDemo() {
  const [open, setOpen] = useState(false);
  return (
    <FakePage
      title="Checkout service"
      subtitle="qeet-pay-api · production · ap-south-1"
      details={[
        ["Error rate", "0.42% (last 15 min)"],
        ["p95 latency", "312 ms"],
        ["Deploy", "v2026.10.3 · 2 h ago"],
        ["On call", "Arjun Reddy"],
      ]}
    >
      <Button variant="outline" onClick={() => setOpen((current) => !current)}>
        <ScrollTextIcon data-icon="inline-start" aria-hidden />
        {open ? "Hide live tail" : "Show live tail"}
      </Button>
      <FloatingWindow
        open={open}
        title={
          <span className="flex items-center gap-2">
            Live tail
            <Badge variant="success">streaming</Badge>
          </span>
        }
        width={440}
        defaultPosition={{ x: 160, y: 140 }}
      >
        <ul className="flex flex-col gap-1.5 font-mono text-xs">
          {logEvents.slice(0, 6).map((event) => (
            <li key={event.id} className="flex gap-2">
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {time.format(new Date(event.timestamp))}
              </span>
              <Badge variant={levelVariant[event.level]} className="h-4 shrink-0 px-1 uppercase">
                {event.level}
              </Badge>
              <span className={cn("truncate", event.level === "error" && "text-destructive-text")}>
                {event.message}
              </span>
            </li>
          ))}
        </ul>
      </FloatingWindow>
    </FakePage>
  );
}

const savedQuery = `service = "notify-worker"
  AND level >= warn
  AND attributes.channel = "sms"
| stats count() by attributes["provider.code"]
| sort count desc`;

function QueryScratchpadDemo() {
  const [open, setOpen] = useState(false);
  return (
    <FakePage
      title="Qeet Logs · Explore"
      subtitle="Acme India · last 24 hours"
      details={[
        ["Events", "48,211"],
        ["Errors", "312"],
        ["Top service", "notify-worker"],
        ["Retention", "30 days (ap-south-1)"],
      ]}
    >
      <Button variant="outline" onClick={() => setOpen(true)} disabled={open}>
        <SquareTerminalIcon data-icon="inline-start" aria-hidden />
        Open query scratchpad
      </Button>
      <FloatingWindow
        open={open}
        onClose={() => setOpen(false)}
        title="Query scratchpad"
        resizable
        width={380}
        defaultPosition={{ x: 260, y: 96 }}
      >
        <pre className="font-mono text-xs whitespace-pre-wrap text-foreground">{savedQuery}</pre>
      </FloatingWindow>
    </FakePage>
  );
}

function PlaygroundWindow({
  title,
  width,
  closeButton,
  resizable,
  x,
  y,
}: {
  title: string;
  width: number;
  closeButton: boolean;
  resizable: boolean;
  x: number;
  y: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-[360px] w-full max-w-2xl items-start rounded-lg border border-dashed p-4">
      <Button variant="outline" onClick={() => setOpen((current) => !current)}>
        <StickyNoteIcon data-icon="inline-start" aria-hidden />
        {open ? "Hide notes" : "Show notes"}
      </Button>
      <FloatingWindow
        open={open}
        onClose={closeButton ? () => setOpen(false) : undefined}
        title={title}
        width={width}
        resizable={resizable}
        defaultPosition={{ x, y }}
      >
        <p className="text-muted-foreground">
          Rotate qk_live_7Hc2… before 13 Oct. Checkout reads it from the Mumbai vault; staging CI
          uses its own test key.
        </p>
      </FloatingWindow>
    </div>
  );
}

const windowControls = {
  title: text("Incident notes · INC-2291", "title"),
  width: num(320, { min: 240, max: 560, step: 20, label: "width (px)" }),
  closeButton: bool(true, "onClose (close button)"),
  resizable: bool(false, "resizable"),
  x: num(220, { min: 0, max: 600, step: 10, label: "defaultPosition.x" }),
  y: num(80, { min: 0, max: 300, step: 10, label: "defaultPosition.y" }),
};

export const examples: FamilyExamples = {
  "floating-window": {
    framed: true,
    layout: "wide",
    minHeight: 1380,
    demos: [
      {
        name: "Help panel",
        description:
          "A non-modal, draggable panel: drag it by the header, keep working on the page behind, close it with the × button. Pressing or focusing a window brings it to the front.",
        render: () => <SetupGuideDemo />,
      },
      {
        name: "Toggled from the page",
        description:
          "Without `onClose` there is no close button; the page owns visibility through `open`.",
        render: () => <LiveTailDemo />,
      },
      {
        name: "Resizable",
        description:
          "`resizable` adds a corner grip for pointer users, so keep the default size usable on its own. Escape closes a window that has `onClose` while focus is inside it.",
        render: () => <QueryScratchpadDemo />,
      },
    ],
    playground: definePlayground({
      controls: windowControls,
      render: (v) => (
        <PlaygroundWindow
          key={`${v.x}-${v.y}`}
          title={v.title}
          width={v.width}
          closeButton={v.closeButton}
          resizable={v.resizable}
          x={v.x}
          y={v.y}
        />
      ),
      code: (v) =>
        [
          "const [open, setOpen] = useState(false);",
          "",
          jsx(
            "FloatingWindow",
            {
              open: expr("open"),
              onClose: v.closeButton ? expr("() => setOpen(false)") : undefined,
              title: v.title,
              width: v.width === 320 ? undefined : v.width,
              resizable: v.resizable,
              defaultPosition:
                v.x === 24 && v.y === 24 ? undefined : expr(`{ x: ${v.x}, y: ${v.y} }`),
            },
            "…",
          ),
        ].join("\n"),
    }),
  },
};
