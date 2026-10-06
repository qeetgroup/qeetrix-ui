import {
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  TimePicker,
  TimeRangePicker,
  type TimeRangePreset,
  type TimeRangeValue,
} from "@qeetrix/ui";
import { useState } from "react";
import { NOW } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select, text } from "../registry/types";

/** A local calendar day (1-based month), the unit these pickers submit. */
function day(year: number, month: number, date: number, hours = 0, minutes = 0, seconds = 0) {
  return new Date(year, month - 1, date, hours, minutes, seconds);
}

const locales = ["en-IN", "en-US", "en-GB", "hi-IN", "browser"] as const;
const localeProp = (locale: (typeof locales)[number]) =>
  locale === "browser" ? undefined : locale;

/**
 * The scenario's "today", 6 Oct 2026 10:30 IST. The demos below are tied to fixed Qeet dates
 * (an invoice due on 2 Nov, a maintenance window on 10 Oct), so their limits are anchored here
 * rather than to the real clock (`NOW`), which only drives the relative "last N hours" windows.
 */
const TODAY = new Date("2026-10-06T10:30:00+05:30");

/** Company holidays in the access-review window (local days). */
const holidays = [day(2026, 11, 9), day(2026, 11, 10), day(2026, 12, 25)];

const windowFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/* ── TimeRangePicker ──────────────────────────────────────────────────────────────────────── */

const presetMs: Record<Exclude<TimeRangePreset, "custom">, number> = {
  "1h": 36e5,
  "24h": 864e5,
  "7d": 7 * 864e5,
  "30d": 30 * 864e5,
  "90d": 90 * 864e5,
};

function presetValue(preset: TimeRangePreset): TimeRangeValue {
  if (preset === "custom") return { preset, from: day(2026, 10, 2), to: day(2026, 10, 4) };
  return { preset, from: new Date(NOW.getTime() - presetMs[preset]), to: NOW };
}

function ControlledTimeRangeDemo() {
  const [range, setRange] = useState<TimeRangeValue>(() => presetValue("24h"));
  return (
    <div className="flex flex-col items-start gap-2">
      <TimeRangePicker
        value={range}
        onValueChange={setRange}
        locale="en-IN"
        aria-label="Log window"
      />
      <p className="text-caption text-muted-foreground" aria-live="polite">
        Querying <span className="font-mono">qeet-id-server</span> from{" "}
        {windowFormat.format(range.from)} to {windowFormat.format(range.to)}
      </p>
    </div>
  );
}

/* ── Controls ─────────────────────────────────────────────────────────────────────────────── */

const datePickerControls = {
  range: bool(false, "Range (DateRangePicker)"),
  preset: bool(true, "Preselected value"),
  placeholder: text("Select a date", "Placeholder"),
  locale: select(locales, "en-IN"),
  limits: bool(false, "min / max (this quarter)"),
  weekStartsOn: select(["0", "1"] as const, "0", "Week starts on (0 = Sun)"),
  clearable: bool(false),
  disabled: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

const dateTimeControls = {
  hourCycle: select(["24", "12"] as const, "24", "Hour cycle"),
  withSeconds: bool(false, "With seconds"),
  minuteStep: num(15, { min: 1, max: 30, label: "Minute step" }),
  preset: bool(true, "Preselected value"),
  future: bool(false, "min = now"),
  locale: select(locales, "en-IN"),
  clearable: bool(false),
  disabled: bool(false),
};

const timePickerControls = {
  hourCycle: select(["24", "12"] as const, "24", "Hour cycle"),
  withSeconds: bool(false, "With seconds"),
  minuteStep: num(15, { min: 1, max: 30, label: "Minute step" }),
  size: select(["default", "sm"] as const, "default"),
  preset: bool(true, "Preselected value (18:30)"),
  disabled: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

const timeRangeControls = {
  preset: select(["1h", "24h", "7d", "30d", "90d", "custom"] as const, "24h", "Initial range"),
  align: select(["start", "center", "end"] as const, "start"),
  locale: select(locales, "en-IN"),
  retention: bool(false, "Limit to 90-day retention"),
  disabled: bool(false),
};

function timeRangeDefaultCode(preset: TimeRangePreset) {
  if (preset === "24h") return undefined;
  if (preset === "custom") {
    return expr('{ preset: "custom", from: new Date(2026, 9, 2), to: new Date(2026, 9, 4) }');
  }
  return expr(
    `{ preset: "${preset}", from: new Date(Date.now() - ${presetMs[preset]}), to: new Date() }`,
  );
}

export const examples: FamilyExamples = {
  "date-picker": {
    demos: [
      {
        name: "Default",
        description:
          "Inside a Field the trigger is named by the label and still reads out the selected day.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Invoice due date</FieldLabel>
            <DatePicker defaultValue={day(2026, 11, 2)} locale="en-IN" name="due_date" />
            <FieldDescription>
              QP-INV-2026-00412 · Net 30. Reminders go out 7 days and 1 day before.
            </FieldDescription>
          </Field>
        ),
      },
      {
        name: "Limits and unavailable days",
        description:
          "`min`/`max` bound the quarter, `unavailable` strikes out holidays, and `clearable` adds Clear.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Access review deadline</FieldLabel>
            <DatePicker
              placeholder="Select a deadline"
              locale="en-IN"
              min={TODAY}
              max={day(2026, 12, 31)}
              unavailable={holidays}
              weekStartsOn={1}
              clearable
            />
            <FieldDescription>Any working day this quarter. Optional.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Date range",
        description: "DateRangePicker opens two months side by side and submits both ends.",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Settlement window</FieldLabel>
            <DateRangePicker
              defaultValue={{ from: day(2026, 10, 1), to: day(2026, 10, 6) }}
              locale="en-IN"
              max={TODAY}
              name="settlement_window"
            />
            <FieldDescription>
              UPI and card captures in this window settle in one payout.
            </FieldDescription>
          </Field>
        ),
      },
      {
        name: "Invalid",
        description: "A FieldError marks the trigger aria-invalid and describes it.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Credit note date</FieldLabel>
            <DatePicker defaultValue={day(2026, 9, 28)} locale="en-IN" />
            <FieldError>A credit note can't be dated before its invoice (3 Oct 2026).</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Financial year starts</FieldLabel>
            <DatePicker defaultValue={day(2026, 4, 1)} locale="en-IN" disabled />
            <FieldDescription>Set by your Qeet Pay administrator.</FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls: datePickerControls,
      render: (v) => {
        const shared = {
          placeholder: v.placeholder,
          locale: localeProp(v.locale),
          min: v.limits ? day(2026, 10, 1) : undefined,
          max: v.limits ? day(2026, 12, 31) : undefined,
          weekStartsOn: v.weekStartsOn === "1" ? (1 as const) : undefined,
          clearable: v.clearable,
          disabled: v.disabled,
          "aria-invalid": v.invalid || undefined,
        };
        return (
          <div className="w-80">
            {v.range ? (
              <DateRangePicker
                key={`range-${v.preset}`}
                {...shared}
                aria-label="Settlement window"
                defaultValue={
                  v.preset ? { from: day(2026, 10, 1), to: day(2026, 10, 6) } : undefined
                }
              />
            ) : (
              <DatePicker
                key={`single-${v.preset}`}
                {...shared}
                aria-label="Invoice due date"
                defaultValue={v.preset ? day(2026, 11, 2) : undefined}
              />
            )}
          </div>
        );
      },
      code: (v) =>
        jsx(v.range ? "DateRangePicker" : "DatePicker", {
          defaultValue: v.preset
            ? expr(
                v.range
                  ? "{ from: new Date(2026, 9, 1), to: new Date(2026, 9, 6) }"
                  : "new Date(2026, 10, 2)",
              )
            : undefined,
          placeholder: v.placeholder,
          locale: localeProp(v.locale),
          min: v.limits ? expr("new Date(2026, 9, 1)") : undefined,
          max: v.limits ? expr("new Date(2026, 11, 31)") : undefined,
          weekStartsOn: v.weekStartsOn === "1" ? 1 : undefined,
          clearable: v.clearable,
          disabled: v.disabled,
          "aria-invalid": v.invalid,
          "aria-label": v.range ? "Settlement window" : "Invoice due date",
        }),
    }),
  },

  "date-time-picker": {
    demos: [
      {
        name: "Default",
        description:
          "A Calendar with a TimePicker footer; picking a day keeps the chosen time. `min` stops it scheduling in the past.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Maintenance window starts</FieldLabel>
            <DateTimePicker
              defaultValue={day(2026, 10, 10, 23, 30)}
              minuteStep={15}
              min={TODAY}
              locale="en-IN"
              name="maintenance_start"
            />
            <FieldDescription>
              Postgres 17 upgrade, ap-south-1. Tenants are notified 48 hours ahead.
            </FieldDescription>
          </Field>
        ),
      },
      {
        name: "12-hour clock",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Send SOC 2 evidence reminder</FieldLabel>
            <DateTimePicker
              hourCycle={12}
              minuteStep={30}
              locale="en-IN"
              placeholder="Pick date & time"
              clearable
            />
          </Field>
        ),
      },
      {
        name: "With seconds",
        description: "Second precision for replaying webhooks from an exact delivery.",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Replay webhooks from</FieldLabel>
            <DateTimePicker
              defaultValue={day(2026, 10, 6, 10, 24, 51)}
              withSeconds
              minuteStep={1}
              max={TODAY}
              locale="en-IN"
            />
          </Field>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Key expires at</FieldLabel>
            <DateTimePicker defaultValue={day(2026, 10, 5, 18, 0)} locale="en-IN" />
            <FieldError>An API key can't expire in the past.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Payroll locks at</FieldLabel>
            <DateTimePicker defaultValue={day(2026, 10, 28, 18, 0)} locale="en-IN" disabled />
            <FieldDescription>Locked for the October payroll run.</FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls: dateTimeControls,
      render: (v) => (
        <div className="w-80">
          <DateTimePicker
            key={String(v.preset)}
            aria-label="Maintenance window starts"
            defaultValue={v.preset ? day(2026, 10, 10, 23, 30) : undefined}
            hourCycle={v.hourCycle === "12" ? 12 : 24}
            withSeconds={v.withSeconds}
            minuteStep={v.minuteStep}
            min={v.future ? TODAY : undefined}
            locale={localeProp(v.locale)}
            clearable={v.clearable}
            disabled={v.disabled}
          />
        </div>
      ),
      code: (v) =>
        jsx("DateTimePicker", {
          defaultValue: v.preset ? expr("new Date(2026, 9, 10, 23, 30)") : undefined,
          hourCycle: v.hourCycle === "12" ? 12 : undefined,
          withSeconds: v.withSeconds,
          minuteStep: v.minuteStep === 5 ? undefined : v.minuteStep,
          min: v.future ? expr("new Date()") : undefined,
          locale: localeProp(v.locale),
          clearable: v.clearable,
          disabled: v.disabled,
          "aria-label": "Maintenance window starts",
        }),
    }),
  },

  "time-picker": {
    demos: [
      {
        name: "24-hour",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Daily settlement cut-off (IST)</FieldLabel>
            <TimePicker defaultValue="18:30" minuteStep={15} name="cutoff" />
            <FieldDescription>
              Captures after this time settle the next business day.
            </FieldDescription>
          </Field>
        ),
      },
      {
        name: "12-hour",
        description: 'Displays AM/PM; the emitted value stays 24-hour ("22:00").',
        render: () => (
          <Field className="w-72">
            <FieldLabel>Quiet hours start</FieldLabel>
            <TimePicker defaultValue="22:00" hourCycle={12} minuteStep={30} />
            <FieldDescription>
              Qeet Notify holds SMS and WhatsApp until quiet hours end.
            </FieldDescription>
          </Field>
        ),
      },
      {
        name: "With seconds, small",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Log retention sweep runs at</FieldLabel>
            <TimePicker defaultValue="02:15:00" withSeconds size="sm" />
          </Field>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Payroll run time</FieldLabel>
            <TimePicker minuteStep={30} />
            <FieldError>Choose when the October payroll run starts.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-72">
            <FieldLabel>Nightly backup</FieldLabel>
            <TimePicker defaultValue="01:00" disabled />
            <FieldDescription>Managed by Qeet platform operations.</FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls: timePickerControls,
      render: (v) => (
        <TimePicker
          key={String(v.preset)}
          aria-label="Daily settlement cut-off"
          defaultValue={v.preset ? "18:30" : undefined}
          hourCycle={v.hourCycle === "12" ? 12 : 24}
          withSeconds={v.withSeconds}
          minuteStep={v.minuteStep}
          size={v.size}
          disabled={v.disabled}
          aria-invalid={v.invalid || undefined}
        />
      ),
      code: (v) =>
        jsx("TimePicker", {
          defaultValue: v.preset ? "18:30" : undefined,
          hourCycle: v.hourCycle === "12" ? 12 : undefined,
          withSeconds: v.withSeconds,
          minuteStep: v.minuteStep === 1 ? undefined : v.minuteStep,
          size: v.size === "default" ? undefined : v.size,
          disabled: v.disabled,
          "aria-invalid": v.invalid,
          "aria-label": "Daily settlement cut-off",
        }),
    }),
  },

  "time-range-picker": {
    demos: [
      {
        name: "Default",
        description:
          "Starts on “Last 24 hours”; presets close the popover, the calendar sets a custom range.",
        render: () => <TimeRangePicker locale="en-IN" aria-label="Log window" />,
      },
      {
        name: "Preset",
        render: () => (
          <TimeRangePicker
            defaultValue={presetValue("7d")}
            locale="en-IN"
            aria-label="Log window"
          />
        ),
      },
      {
        name: "Custom range, retention limits",
        description:
          "INC-2041's incident window; a custom range can't reach past 90-day retention or into the future.",
        render: () => (
          <TimeRangePicker
            defaultValue={presetValue("custom")}
            min={new Date(TODAY.getTime() - presetMs["90d"])}
            max={TODAY}
            locale="en-IN"
            aria-label="Incident window"
          />
        ),
      },
      {
        name: "Controlled",
        description: "The parent owns `{ preset, from, to }` and uses the instants to query logs.",
        render: () => <ControlledTimeRangeDemo />,
      },
      {
        name: "Aligned to end",
        render: () => (
          <div className="flex w-80 items-center justify-between gap-3 rounded-lg border p-2 ps-3">
            <span className="text-sm font-medium">Collections</span>
            <TimeRangePicker
              defaultValue={presetValue("30d")}
              align="end"
              locale="en-IN"
              aria-label="Collections period"
            />
          </div>
        ),
      },
      {
        name: "Disabled",
        render: () => <TimeRangePicker locale="en-IN" disabled aria-label="Export window" />,
      },
    ],
    playground: definePlayground({
      controls: timeRangeControls,
      render: (v) => (
        <TimeRangePicker
          key={v.preset}
          defaultValue={v.preset === "24h" ? undefined : presetValue(v.preset)}
          align={v.align}
          locale={localeProp(v.locale)}
          min={v.retention ? new Date(TODAY.getTime() - presetMs["90d"]) : undefined}
          max={v.retention ? TODAY : undefined}
          disabled={v.disabled}
          aria-label="Log window"
        />
      ),
      code: (v) =>
        jsx("TimeRangePicker", {
          defaultValue: timeRangeDefaultCode(v.preset),
          align: v.align === "start" ? undefined : v.align,
          locale: localeProp(v.locale),
          min: v.retention ? expr(`new Date(Date.now() - ${presetMs["90d"]})`) : undefined,
          max: v.retention ? expr("new Date()") : undefined,
          disabled: v.disabled,
          "aria-label": "Log window",
        }),
    }),
  },
};
