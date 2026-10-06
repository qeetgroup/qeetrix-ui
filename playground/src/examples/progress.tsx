import { Button, Meter, Progress, ProgressCircle } from "@qeetrix/ui";
import { DownloadIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

/* ── Progress ─────────────────────────────────────────────────────────────────────────────── */

/** A user-started export that advances on a timer until it completes. */
function ExportProgressDemo() {
  const [value, setValue] = useState<number | null>(null);
  const running = value !== null && value < 100;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setValue((v) => Math.min(100, (v ?? 0) + 8)), 250);
    return () => clearInterval(id);
  }, [running]);
  const id = useId();
  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span id={id} className="text-sm font-medium">
          Audit log export (CSV)
        </span>
        <Button size="sm" variant="outline" disabled={running} onClick={() => setValue(0)}>
          <DownloadIcon data-icon="inline-start" aria-hidden />
          {value === 100 ? "Export again" : "Start export"}
        </Button>
      </div>
      <Progress value={value ?? 0} aria-labelledby={id} />
      <span className="text-caption text-muted-foreground" aria-live="polite">
        {value === null
          ? "48,211 events from the last 30 days."
          : value < 100
            ? `Exporting… ${value}%`
            : "Ready — audit-log-2026-10-06.csv (18 MB)."}
      </span>
    </div>
  );
}

const progressControls = {
  label: text("Importing users from Okta", "Label (also the accessible name)"),
  value: num(64, { min: 0, max: 100, step: 1, label: "Value" }),
  indeterminate: bool(false, "Indeterminate (value = null)"),
  size: select(["sm", "md", "lg"] as const, "md"),
  hideValue: bool(false, "Hide value"),
};

/* ── Meter ────────────────────────────────────────────────────────────────────────────────── */

const meterFormats = {
  percent: undefined,
  gigabytes: { style: "unit", unit: "gigabyte", maximumFractionDigits: 0 },
  number: { maximumFractionDigits: 0 },
} as const satisfies Record<string, Intl.NumberFormatOptions | undefined>;

const meterFormatCode = {
  percent: undefined,
  gigabytes: '{ style: "unit", unit: "gigabyte", maximumFractionDigits: 0 }',
  number: "{ maximumFractionDigits: 0 }",
} as const;

const meterControls = {
  label: text("Log ingest this month", "Label"),
  value: num(460, { min: 0, max: 1000, step: 10, label: "Value" }),
  max: num(500, { min: 1, max: 1000, step: 10, label: "Max" }),
  intent: select(["default", "success", "warning", "danger"] as const, "warning"),
  format: select(["percent", "gigabytes", "number"] as const, "percent", "Value format"),
  size: select(["sm", "md", "lg"] as const, "md"),
  hideValue: bool(false, "Hide value"),
};

/* ── ProgressCircle ───────────────────────────────────────────────────────────────────────── */

const circleControls = {
  value: num(72, { min: 0, max: 100, label: "Value" }),
  size: select(["sm", "md", "lg"] as const, "md"),
  showLabel: select(["auto", "show", "hide"] as const, "auto", "Show % label"),
  label: text("", "Custom centre label"),
  "aria-label": text("Profile setup 72% complete", "aria-label"),
};

export const examples: FamilyExamples = {
  progress: {
    layout: "wide",
    minHeight: 420,
    demos: [
      {
        name: "Determinate",
        description: "`label` captions the bar and names it; the formatted value sits opposite.",
        render: () => (
          <div className="flex w-full max-w-md flex-col gap-4">
            <Progress label="Importing users from Okta" value={64} />
            <Progress
              label="Uploading GSTR-1 JSON · step 1 of 3"
              value={1}
              max={3}
              hideValue
              getAriaValueText={(_, value) => `Step ${value} of 3`}
            />
            <Progress label="Settlement file reconciled" value={100} />
          </div>
        ),
      },
      {
        name: "Indeterminate",
        description:
          "`value={null}` while the total is unknown: a sweeping segment, not a full bar.",
        render: () => (
          <div className="w-full max-w-md">
            <Progress label="Generating settlement report…" value={null} />
          </div>
        ),
      },
      {
        name: "Sizes, bare bar",
        description: "Without a label, name the bar with `aria-label`.",
        render: () => (
          <div className="flex w-full max-w-md flex-col gap-3">
            <Progress size="sm" value={30} aria-label="Onboarding checklist" />
            <Progress value={55} aria-label="KYC review" />
            <Progress size="lg" value={80} aria-label="Data migration to ap-south-2" />
          </div>
        ),
      },
      {
        name: "Live",
        render: () => <ExportProgressDemo />,
      },
    ],
    playground: definePlayground({
      controls: progressControls,
      render: (v) => (
        <div className="w-80">
          <Progress
            label={v.label || undefined}
            aria-label={v.label ? undefined : "Progress"}
            value={v.indeterminate ? null : v.value}
            size={v.size}
            hideValue={v.hideValue}
          />
        </div>
      ),
      code: (v) =>
        jsx("Progress", {
          label: v.label || undefined,
          "aria-label": v.label ? undefined : "Progress",
          value: v.indeterminate ? expr("null") : v.value,
          size: v.size === "md" ? undefined : v.size,
          hideValue: v.hideValue,
        }),
    }),
  },

  meter: {
    layout: "wide",
    minHeight: 380,
    demos: [
      {
        name: "Quota",
        description: "A measurement within a known range; `intent` colours the fill.",
        render: () => (
          <div className="w-full max-w-md">
            <Meter label="Qeet Logs ingest — October" value={92} intent="warning" />
            <p className="mt-1.5 text-caption text-muted-foreground">
              460 GB of 500 GB. Debug logs will be sampled once ingest reaches 100%.
            </p>
          </div>
        ),
      },
      {
        name: "Intents",
        render: () => (
          <div className="flex w-full max-w-md flex-col gap-4">
            <Meter label="API calls today" value={38} />
            <Meter label="SLO error budget remaining" value={81} intent="success" />
            <Meter label="Seats used (Enterprise)" value={92} intent="warning" />
            <Meter label="SMS credits used" value={97} intent="danger" />
          </div>
        ),
      },
      {
        name: "Custom format",
        description: "`format` takes Intl.NumberFormat options; `locale` picks the grouping.",
        render: () => (
          <div className="flex w-full max-w-md flex-col gap-4">
            <Meter
              label="Cold storage (logs-ap-south-1)"
              value={460}
              max={500}
              format={{ style: "unit", unit: "gigabyte", maximumFractionDigits: 0 }}
              locale="en-IN"
            />
            <Meter
              label="Monthly active users"
              value={184200}
              max={250000}
              format={{ maximumFractionDigits: 0 }}
              locale="en-IN"
            />
          </div>
        ),
      },
      {
        name: "Without value",
        render: () => (
          <div className="w-full max-w-md">
            <Meter label="Password strength" value={75} intent="success" hideValue />
          </div>
        ),
      },
    ],
    playground: definePlayground({
      controls: meterControls,
      render: (v) => (
        <div className="w-80">
          <Meter
            label={v.label || undefined}
            aria-label={v.label ? undefined : "Usage"}
            value={v.value}
            max={v.max}
            intent={v.intent}
            format={meterFormats[v.format]}
            locale="en-IN"
            size={v.size}
            hideValue={v.hideValue}
          />
        </div>
      ),
      code: (v) => {
        const formatCode = meterFormatCode[v.format];
        return jsx("Meter", {
          label: v.label || undefined,
          "aria-label": v.label ? undefined : "Usage",
          value: v.value,
          max: v.max === 100 ? undefined : v.max,
          intent: v.intent === "default" ? undefined : v.intent,
          format: formatCode ? expr(formatCode) : undefined,
          locale: "en-IN",
          size: v.size === "md" ? undefined : v.size,
          hideValue: v.hideValue,
        });
      },
    }),
  },

  "progress-circle": {
    minHeight: 300,
    demos: [
      {
        name: "Sizes",
        description: "`sm` hides the percentage by default; `md` and `lg` show it.",
        render: () => (
          <div className="flex items-center gap-4">
            <ProgressCircle value={40} size="sm" aria-label="Onboarding 40% complete" />
            <ProgressCircle value={64} size="md" aria-label="Okta import 64% complete" />
            <ProgressCircle value={92} size="lg" aria-label="Ingest quota 92% used" />
          </div>
        ),
      },
      {
        name: "Custom label",
        render: () => (
          <div className="flex items-center gap-3">
            <ProgressCircle value={67} size="lg" label="4/6" aria-label="4 of 6 setup steps done" />
            <div className="text-sm">
              <div className="font-medium">Set up Acme India</div>
              <div className="text-caption text-muted-foreground">Next: verify acme.in for SSO</div>
            </div>
          </div>
        ),
      },
      {
        name: "Pixel size",
        description: "A number sets the diameter; `strokeWidth` the ring.",
        render: () => (
          <ProgressCircle
            value={100}
            size={96}
            strokeWidth={10}
            label="Filed"
            aria-label="GSTR-3B filed"
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: circleControls,
      render: (v) => (
        <ProgressCircle
          value={v.value}
          size={v.size}
          showLabel={v.showLabel === "auto" ? undefined : v.showLabel === "show"}
          label={v.label || undefined}
          aria-label={v["aria-label"] || undefined}
        />
      ),
      code: (v) =>
        jsx("ProgressCircle", {
          value: v.value,
          size: v.size === "md" ? undefined : v.size,
          showLabel:
            v.showLabel === "auto" ? undefined : v.showLabel === "show" ? true : expr("false"),
          label: v.label || undefined,
          "aria-label": v["aria-label"] || undefined,
        }),
    }),
  },
};
