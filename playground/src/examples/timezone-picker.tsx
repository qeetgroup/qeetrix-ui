import { Field, FieldDescription, FieldError, FieldLabel, TimezonePicker } from "@qeetrix/ui";
import { useState } from "react";
import { NOW } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select, text } from "../registry/types";

/** Zones Qeet's on-call rota covers, India first. `timezones` keeps this order. */
const supportZones = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "UTC",
];

/** The playground's "now" as a wall clock in `timeZone`, or `null` for no selection. */
function localTime(timeZone: string): string | null {
  if (!timeZone) return null;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(NOW);
}

function TenantTimezoneDemo() {
  const [zone, setZone] = useState("Asia/Kolkata");
  return (
    <Field className="w-80">
      <FieldLabel>Tenant timezone</FieldLabel>
      <TimezonePicker value={zone} onChange={setZone} locale="en-IN" name="tenant_timezone" />
      <FieldDescription aria-live="polite">
        {zone
          ? `Daily digests send at 09:00 here · now ${localTime(zone)}`
          : "Digests follow each user's own timezone."}
      </FieldDescription>
    </Field>
  );
}

const zoneOptions = [
  "Asia/Kolkata",
  "UTC",
  "Asia/Singapore",
  "Asia/Dubai",
  "Europe/London",
  "America/New_York",
  "(none)",
] as const;

const controls = {
  defaultValue: select(zoneOptions, "Asia/Kolkata", "Default value"),
  searchable: bool(false),
  restricted: bool(false, "Only support zones (timezones)"),
  locale: select(["en-IN", "hi-IN", "en-GB", "de-DE", "browser"] as const, "en-IN"),
  placeholder: text("Select timezone", "Placeholder"),
  required: bool(false),
  disabled: bool(false),
};

export const examples: FamilyExamples = {
  "timezone-picker": {
    demos: [
      {
        name: "Default",
        description:
          "A native select of every IANA zone the browser supports, each with its UTC offset.",
        render: () => <TenantTimezoneDemo />,
      },
      {
        name: "Searchable",
        description:
          "Type a city, a zone name (“India Standard Time”) or an offset (“+5:30”) to filter.",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Your timezone</FieldLabel>
            <TimezonePicker
              searchable
              defaultValue="Asia/Kolkata"
              locale="en-IN"
              placeholder="Search timezones"
              emptyMessage="No timezone matches"
            />
            <FieldDescription>Session and audit times show in this zone.</FieldDescription>
          </Field>
        ),
      },
      {
        name: "Restricted list",
        description:
          "`timezones` limits (and orders) the list: the zones the on-call rota covers, India first.",
        render: () => (
          <Field className="w-80">
            <FieldLabel>On-call handover zone</FieldLabel>
            <TimezonePicker timezones={supportZones} defaultValue="Asia/Kolkata" locale="en-IN" />
          </Field>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Billing cycle timezone</FieldLabel>
            <TimezonePicker locale="en-IN" placeholder="Select timezone" required />
            <FieldError>Pick the zone Qeet Pay closes the monthly invoice run in.</FieldError>
          </Field>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Field className="w-80">
            <FieldLabel>Audit log timezone</FieldLabel>
            <TimezonePicker defaultValue="UTC" locale="en-IN" disabled />
            <FieldDescription>Audit events are always stored and shown in UTC.</FieldDescription>
          </Field>
        ),
      },
    ],
    playground: definePlayground({
      controls,
      render: (v) => {
        const initial = v.defaultValue === "(none)" ? "" : v.defaultValue;
        return (
          <div className="w-80">
            <TimezonePicker
              key={`${initial}-${v.searchable}`}
              defaultValue={initial}
              searchable={v.searchable}
              timezones={v.restricted ? supportZones : undefined}
              locale={v.locale === "browser" ? undefined : v.locale}
              placeholder={v.placeholder}
              required={v.required}
              disabled={v.disabled}
              ariaLabel="Tenant timezone"
            />
          </div>
        );
      },
      code: (v) =>
        jsx("TimezonePicker", {
          defaultValue: v.defaultValue === "(none)" ? undefined : v.defaultValue,
          searchable: v.searchable,
          timezones: v.restricted
            ? expr(JSON.stringify(supportZones).replaceAll(",", ", "))
            : undefined,
          locale: v.locale === "browser" ? undefined : v.locale,
          placeholder: v.placeholder === "Select timezone" ? undefined : v.placeholder,
          required: v.required,
          disabled: v.disabled,
          ariaLabel: "Tenant timezone",
        }),
    }),
  },
};
