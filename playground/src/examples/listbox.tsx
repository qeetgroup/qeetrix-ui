import { Listbox, type ListboxOption } from "@qeetrix/ui";
import { type ReactNode, useId, useState } from "react";
import { users } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, text } from "../registry/types";

const regions: ListboxOption[] = [
  { value: "ap-south-1", label: "ap-south-1 · Mumbai" },
  { value: "ap-south-2", label: "ap-south-2 · Hyderabad" },
  { value: "eu-central-1", label: "eu-central-1 · Frankfurt" },
  { value: "us-east-1", label: "us-east-1 · N. Virginia", disabled: true },
];

const channels: ListboxOption[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS (DLT template required)" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "push", label: "Push notification" },
];

/** Reviewers for an access review: suspended and inactive accounts can't be assigned. */
const reviewers: ListboxOption[] = users.map((user) => ({
  value: user.id,
  label: `${user.name} · ${user.role}`,
  disabled: user.status === "suspended" || user.status === "inactive",
}));

/** A visible heading that names the listbox through `aria-labelledby`. */
function Labelled({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: (labelId: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex w-72 flex-col gap-2">
      <span id={id} className="text-sm font-medium">
        {title}
      </span>
      {children(id)}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ChannelsDemo() {
  const [value, setValue] = useState<string[]>(["email", "whatsapp"]);
  const picked = channels.filter((channel) => value.includes(channel.value));
  return (
    <Labelled title="Invoice reminder channels">
      {(labelId) => (
        <>
          <Listbox
            options={channels}
            multiple
            value={value}
            onValueChange={(next) => setValue(Array.isArray(next) ? next : [next])}
            aria-labelledby={labelId}
          />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {picked.length
              ? `Qeet Notify sends via ${picked.map((channel) => channel.label.split(" (")[0]).join(", ")}.`
              : "Reminders are off for this tenant."}
          </p>
        </>
      )}
    </Labelled>
  );
}

const controls = {
  multiple: bool(false),
  disabledOption: bool(true, "Disabled option"),
  disabled: bool(false),
  "aria-label": text("Default region", "aria-label"),
};

export const examples: FamilyExamples = {
  listbox: {
    minHeight: 280,
    demos: [
      {
        name: "Single select",
        description:
          "One tab stop; arrow keys move the active option, Enter or Space selects. Disabled options are skipped.",
        render: () => (
          <Labelled
            title="Default region for new tenants"
            hint="Tenant data stays in this region. us-east-1 isn't offered to DPDP-regulated tenants."
          >
            {(labelId) => (
              <Listbox options={regions} defaultValue="ap-south-1" aria-labelledby={labelId} />
            )}
          </Labelled>
        ),
      },
      {
        name: "Multiple",
        render: () => <ChannelsDemo />,
      },
      {
        name: "Scrolling, disabled options",
        description:
          "Long lists scroll inside the listbox; suspended and inactive users can't review.",
        render: () => (
          <Labelled title="Assign access reviewers">
            {(labelId) => (
              <Listbox
                options={reviewers}
                multiple
                defaultValue={["usr_08", "usr_05"]}
                aria-labelledby={labelId}
                className="max-h-52"
              />
            )}
          </Labelled>
        ),
      },
      {
        name: "Disabled",
        render: () => (
          <Labelled
            title="Data residency region"
            hint="Fixed for Acme India: tenant data can't move regions after onboarding."
          >
            {(labelId) => (
              <Listbox
                options={regions}
                defaultValue="ap-south-1"
                disabled
                aria-labelledby={labelId}
              />
            )}
          </Labelled>
        ),
      },
    ],
    playground: definePlayground({
      controls,
      render: (v) => (
        <Listbox
          key={String(v.multiple)}
          options={v.disabledOption ? regions : regions.filter((region) => !region.disabled)}
          multiple={v.multiple}
          disabled={v.disabled}
          defaultValue={v.multiple ? ["ap-south-1"] : "ap-south-1"}
          aria-label={v["aria-label"]}
          className="w-72"
        />
      ),
      code: (v) =>
        jsx("Listbox", {
          options: expr("regions"),
          multiple: v.multiple,
          disabled: v.disabled,
          defaultValue: v.multiple ? expr('["ap-south-1"]') : "ap-south-1",
          "aria-label": v["aria-label"],
        }),
    }),
  },
};
