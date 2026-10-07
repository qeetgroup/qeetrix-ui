import { BanknoteIcon, CreditCardIcon, SmartphoneIcon } from "@qeetrix/icons";
import {
  Badge,
  Field,
  FieldContent,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Label,
  Radio,
  RadioCard,
  RadioCardGroup,
  RadioGroup,
} from "@qeetrix/ui";
import { useId, useState } from "react";
import { formatInr } from "../data/qeet";
import { changedProps, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, select } from "../registry/types";

const regions = [
  { value: "ap-south-1", label: "Mumbai", code: "ap-south-1" },
  { value: "ap-south-2", label: "Hyderabad", code: "ap-south-2" },
  { value: "eu-central-1", label: "Frankfurt", code: "eu-central-1" },
] as const;

const paymentTerms = [
  { value: "receipt", label: "Due on receipt", description: "For one-off services and top-ups." },
  { value: "net15", label: "Net 15", description: "Reminder on day 10 by email and WhatsApp." },
  { value: "net30", label: "Net 30", description: "Standard for Enterprise contracts." },
] as const;

const plans = [
  { value: "starter", name: "Starter", price: 0, detail: "Up to 100 users · community support" },
  {
    value: "growth",
    name: "Growth",
    price: 149,
    detail: "SSO, SCIM provisioning · email support",
  },
  {
    value: "enterprise",
    name: "Enterprise",
    price: 349,
    detail: "Data residency, audit export · 24×7 support",
  },
] as const;

const radioGroupControls = {
  defaultValue: select(["ap-south-1", "ap-south-2", "eu-central-1"] as const, "ap-south-1"),
  orientation: select(["vertical", "horizontal"] as const, "vertical"),
  disabled: bool(false),
  readOnly: bool(false, "Read-only"),
  required: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

const radioCardControls = {
  defaultValue: select(["", "starter", "growth", "enterprise"] as const, "growth", "Default value"),
  disableStarter: bool(false, "Disable Starter"),
  disabled: bool(false, "Disable group"),
  required: bool(false),
  invalid: bool(false, "Invalid (aria-invalid)"),
};

function RequiredPlanDemo() {
  const errorId = useId();
  const [plan, setPlan] = useState<string | undefined>(undefined);
  return (
    <div className="flex w-96 max-w-full flex-col gap-2">
      <RadioCardGroup
        aria-label="Billing cycle for Kanpur Logistics"
        name="cycle"
        required
        value={plan}
        onValueChange={setPlan}
        aria-invalid={plan ? undefined : true}
        aria-describedby={plan ? undefined : errorId}
      >
        <RadioCard value="monthly">
          <span className="text-sm font-medium">Monthly</span>
          <p className="mt-1 text-sm text-muted-foreground">Invoiced on the 1st · GST at 18%</p>
        </RadioCard>
        <RadioCard value="annual">
          <span className="text-sm font-medium">Annual</span>
          <p className="mt-1 text-sm text-muted-foreground">Two months free · one GST invoice</p>
        </RadioCard>
      </RadioCardGroup>
      {!plan && (
        <FieldError id={errorId}>Choose a billing cycle to activate the tenant.</FieldError>
      )}
    </div>
  );
}

export const examples: FamilyExamples = {
  "radio-group": {
    minHeight: 320,
    demos: [
      {
        name: "Default",
        description: "A FieldSet legend names the group; each radio is wrapped in its label.",
        render: () => (
          <FieldSet>
            <FieldLegend variant="label">Data region</FieldLegend>
            <RadioGroup name="region" defaultValue="ap-south-1">
              {regions.map((region) => (
                <Label key={region.value} className="font-normal">
                  <Radio value={region.value} />
                  {region.label}
                  <span className="font-mono text-caption text-muted-foreground">
                    {region.code}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </FieldSet>
        ),
      },
      {
        name: "With descriptions",
        render: () => (
          <FieldSet className="w-80">
            <FieldLegend variant="label">Payment terms</FieldLegend>
            <RadioGroup name="terms" defaultValue="net30">
              {paymentTerms.map((term) => (
                <Field key={term.value} orientation="horizontal">
                  <FieldControl render={<Radio value={term.value} />} />
                  <FieldContent>
                    <FieldLabel className="font-normal">{term.label}</FieldLabel>
                    <FieldDescription>{term.description}</FieldDescription>
                  </FieldContent>
                </Field>
              ))}
            </RadioGroup>
          </FieldSet>
        ),
      },
      {
        name: "Horizontal",
        render: () => (
          <FieldSet>
            <FieldLegend variant="label">Billing cycle</FieldLegend>
            <RadioGroup name="cycle" defaultValue="annual" className="flex flex-wrap gap-4">
              <Label className="font-normal">
                <Radio value="monthly" />
                Monthly
              </Label>
              <Label className="font-normal">
                <Radio value="quarterly" />
                Quarterly
              </Label>
              <Label className="font-normal">
                <Radio value="annual" />
                Annual
                <Badge variant="success">2 months free</Badge>
              </Label>
            </RadioGroup>
          </FieldSet>
        ),
      },
      {
        name: "Invalid",
        render: () => (
          <FieldSet>
            <FieldLegend variant="label">Settlement account type</FieldLegend>
            <RadioGroup name="account" required aria-invalid>
              <Label className="font-normal">
                <Radio value="current" aria-invalid />
                Current account
              </Label>
              <Label className="font-normal">
                <Radio value="escrow" aria-invalid />
                Nodal / escrow account
              </Label>
            </RadioGroup>
            <FieldError>Choose where Qeet Pay should settle UPI collections.</FieldError>
          </FieldSet>
        ),
      },
      {
        name: "Disabled",
        description: "Disable one option, or the whole group with `disabled` on RadioGroup.",
        render: () => (
          <FieldSet>
            <FieldLegend variant="label">Data region (Starter plan)</FieldLegend>
            <RadioGroup name="region-starter" defaultValue="ap-south-1">
              <Label className="font-normal">
                <Radio value="ap-south-1" />
                Mumbai
              </Label>
              <Label className="font-normal">
                <Radio value="eu-central-1" disabled />
                Frankfurt
                <span className="text-caption text-muted-foreground">Enterprise only</span>
              </Label>
            </RadioGroup>
          </FieldSet>
        ),
      },
      {
        name: "Read-only",
        description: "`readOnly` keeps the choice focusable and announced but unchangeable.",
        render: () => (
          <FieldSet>
            <FieldLegend variant="label">Data region</FieldLegend>
            <RadioGroup name="region-locked" defaultValue="ap-south-1" readOnly>
              {regions.map((region) => (
                <Label key={region.value} className="font-normal">
                  <Radio value={region.value} />
                  {region.label}
                </Label>
              ))}
            </RadioGroup>
            <FieldDescription>
              Locked after the first user signed in to Bharat FinServ.
            </FieldDescription>
          </FieldSet>
        ),
      },
    ],
    playground: definePlayground({
      controls: radioGroupControls,
      render: (v) => (
        <FieldSet>
          <FieldLegend variant="label">Data region</FieldLegend>
          <RadioGroup
            key={v.defaultValue}
            name="region"
            defaultValue={v.defaultValue}
            disabled={v.disabled}
            readOnly={v.readOnly}
            required={v.required}
            aria-invalid={v.invalid || undefined}
            className={v.orientation === "horizontal" ? "flex flex-wrap gap-4" : undefined}
          >
            {regions.map((region) => (
              <Label key={region.value} className="font-normal">
                <Radio value={region.value} aria-invalid={v.invalid || undefined} />
                {region.label}
              </Label>
            ))}
          </RadioGroup>
        </FieldSet>
      ),
      code: (v) =>
        jsx(
          "RadioGroup",
          {
            name: "region",
            defaultValue: v.defaultValue,
            ...changedProps(v, radioGroupControls, ["disabled", "readOnly", "required"]),
            "aria-invalid": v.invalid,
            className: v.orientation === "horizontal" ? "flex flex-wrap gap-4" : undefined,
          },
          regions.map((region) =>
            jsx("Label", {}, [
              jsx("Radio", { value: region.value, "aria-invalid": v.invalid }),
              region.label,
            ]),
          ),
        ),
    }),
  },

  "radio-card": {
    minHeight: 560,
    demos: [
      {
        name: "Plan",
        render: () => (
          <RadioCardGroup
            aria-label="Qeet ID plan"
            defaultValue="growth"
            className="w-96 max-w-full"
          >
            {plans.map((plan) => (
              <RadioCard key={plan.value} value={plan.value}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium">{plan.name}</span>
                  <span className="text-sm tabular-nums">
                    {plan.price === 0 ? "Free" : `${formatInr(plan.price)} / user / mo`}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.detail}</p>
              </RadioCard>
            ))}
          </RadioCardGroup>
        ),
      },
      {
        name: "Invalid and required",
        description:
          "`required` is browser-enforced (native radios); `aria-invalid` on the group turns every card's edge.",
        render: () => <RequiredPlanDemo />,
      },
      {
        name: "Disabled group",
        render: () => (
          <RadioCardGroup
            aria-label="Data region"
            defaultValue="ap-south-1"
            disabled
            className="w-80 max-w-full"
          >
            <RadioCard value="ap-south-1">
              <span className="text-sm font-medium">Mumbai (ap-south-1)</span>
              <p className="mt-1 text-sm text-muted-foreground">Primary region</p>
            </RadioCard>
            <RadioCard value="ap-south-2">
              <span className="text-sm font-medium">Hyderabad (ap-south-2)</span>
              <p className="mt-1 text-sm text-muted-foreground">Disaster-recovery replica</p>
            </RadioCard>
          </RadioCardGroup>
        ),
      },
      {
        name: "Payment method, with disabled",
        render: () => (
          <RadioCardGroup
            aria-label="Payment method"
            defaultValue="upi"
            className="w-80 max-w-full"
          >
            <RadioCard value="upi">
              <span className="flex items-center gap-2 text-sm font-medium">
                <SmartphoneIcon aria-hidden className="size-4 text-muted-foreground" />
                UPI AutoPay
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                accounts@acmeindia · up to ₹1 lakh
              </p>
            </RadioCard>
            <RadioCard value="nach">
              <span className="flex items-center gap-2 text-sm font-medium">
                <BanknoteIcon aria-hidden className="size-4 text-muted-foreground" />
                NACH mandate
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                HDFC Bank ••4821 · 3–5 days to activate
              </p>
            </RadioCard>
            <RadioCard value="card" disabled>
              <span className="flex items-center gap-2 text-sm font-medium">
                <CreditCardIcon aria-hidden className="size-4 text-muted-foreground" />
                Corporate card
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                Unavailable for invoices above ₹5 lakh
              </p>
            </RadioCard>
          </RadioCardGroup>
        ),
      },
    ],
    playground: definePlayground({
      controls: radioCardControls,
      render: (v) => (
        <RadioCardGroup
          key={v.defaultValue}
          aria-label="Qeet ID plan"
          defaultValue={v.defaultValue || undefined}
          disabled={v.disabled}
          required={v.required}
          aria-invalid={v.invalid || undefined}
          className="w-96 max-w-full"
        >
          {plans.map((plan) => (
            <RadioCard
              key={plan.value}
              value={plan.value}
              disabled={v.disableStarter && plan.value === "starter"}
            >
              <span className="text-sm font-medium">{plan.name}</span>
              <p className="mt-1 text-sm text-muted-foreground">{plan.detail}</p>
            </RadioCard>
          ))}
        </RadioCardGroup>
      ),
      code: (v) =>
        jsx(
          "RadioCardGroup",
          {
            "aria-label": "Qeet ID plan",
            defaultValue: v.defaultValue || undefined,
            disabled: v.disabled,
            required: v.required,
            "aria-invalid": v.invalid,
          },
          plans.map((plan) =>
            jsx(
              "RadioCard",
              { value: plan.value, disabled: v.disableStarter && plan.value === "starter" },
              [
                jsx("span", { className: "text-sm font-medium" }, plan.name),
                jsx("p", { className: "mt-1 text-sm text-muted-foreground" }, plan.detail),
              ],
            ),
          ),
        ),
    }),
  },
};
