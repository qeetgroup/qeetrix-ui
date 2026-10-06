import { Button, Stepper, type StepperStep } from "@qeetrix/ui";
import { useState } from "react";
import { formatInr, invoices, invoiceTotals } from "../data/qeet";
import { expr, jsx } from "../lib/code";
import { bool, definePlayground, type FamilyExamples, num, select } from "../registry/types";

const invoice = invoices[0];
const total = formatInr(invoiceTotals(invoice).total);

const checkoutSteps: StepperStep[] = [
  { label: "Review order", description: "Qeet ID Enterprise · annual" },
  { label: "Billing & GSTIN", description: "For the tax invoice" },
  { label: "Payment", description: "UPI, card or net banking" },
  { label: "Confirmation", description: "Receipt by email" },
];

const onboardingSteps: StepperStep[] = [
  { label: "Verify domain" },
  { label: "Connect SSO" },
  { label: "Invite admins" },
  { label: "Go live" },
];

const provisioningSteps: StepperStep[] = [
  { label: "Create tenant", description: "tnt_kanpur · ap-south-2 (Hyderabad)" },
  { label: "Verify domain", description: "TXT record found for kanpurlogistics.in" },
  {
    label: "Connect SSO",
    description: "Okta metadata rejected: certificate expired on 30 Sep 2026",
    invalid: true,
  },
  { label: "Sync users (SCIM)", description: "58 users waiting" },
  { label: "Go live", description: "Enforce passkeys for admins" },
];

const stepBodies = [
  `Qeet ID Enterprise for Acme India, 2,000 seats, billed annually: ${total} incl. 18% GST.`,
  "GSTIN 29AAACA1234F1Z5 · Acme India Pvt Ltd · Karnataka. Place of supply decides CGST + SGST or IGST.",
  "Pay with UPI (accounts@acmeindia), a corporate card or net banking. NACH is available for renewals.",
  `Paid. Invoice ${invoice.number} and the receipt are on their way to accounts@acme.in.`,
];

function CheckoutStepperDemo() {
  const [active, setActive] = useState(1);
  const done = active >= checkoutSteps.length;
  return (
    <div className="flex w-full flex-col gap-4">
      <Stepper steps={checkoutSteps} activeStep={active} aria-label="Checkout progress" />
      <p className="min-h-10 rounded-lg bg-surface-sunken px-3 py-2 text-sm text-muted-foreground">
        {stepBodies[Math.min(active, stepBodies.length - 1)]}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={active === 0}
          onClick={() => setActive((current) => Math.max(0, current - 1))}
        >
          Back
        </Button>
        <Button
          disabled={done}
          onClick={() => setActive((current) => Math.min(checkoutSteps.length, current + 1))}
        >
          {active === 2 ? `Pay ${total}` : active === 3 ? "Finish" : "Continue"}
        </Button>
        {done && (
          <Button variant="ghost" onClick={() => setActive(0)}>
            Start over
          </Button>
        )}
      </div>
    </div>
  );
}

const stepperControls = {
  orientation: select(["horizontal", "vertical"] as const, "horizontal"),
  activeStep: num(2, { min: 0, max: 4, label: "activeStep" }),
  steps: num(4, { min: 2, max: 4, label: "Number of steps" }),
  descriptions: bool(true, "Descriptions"),
  invalid: bool(false, "Mark “Billing & GSTIN” invalid"),
};

function playgroundSteps(v: { steps: number; descriptions: boolean; invalid: boolean }) {
  return checkoutSteps.slice(0, v.steps).map((step, index) => {
    const invalid = v.invalid && index === 1;
    return {
      label: step.label,
      description: invalid
        ? "GSTIN 29AAACA1234F1Z0 failed the checksum"
        : v.descriptions
          ? step.description
          : undefined,
      invalid: invalid || undefined,
    };
  });
}

export const examples: FamilyExamples = {
  stepper: {
    layout: "wide",
    minHeight: 900,
    demos: [
      {
        name: "Hosted checkout",
        description:
          'Qeet Pay checkout: earlier steps show a check, the active step is marked with aria-current="step". Drive `activeStep` from your own state.',
        render: () => <CheckoutStepperDemo />,
      },
      {
        name: "Without descriptions",
        description: "Tenant onboarding in Qeet ID, on step 2 of 4.",
        render: () => (
          <Stepper steps={onboardingSteps} activeStep={1} aria-label="Tenant onboarding" />
        ),
      },
      {
        name: "Vertical, with an invalid step",
        description:
          '`orientation="vertical"` for side panels and narrow flows. `invalid` on a step draws it in the destructive treatment with “!” and announces “Has errors”, whatever its position; put the reason in its description.',
        render: () => (
          <div className="max-w-sm">
            <Stepper
              orientation="vertical"
              steps={provisioningSteps}
              activeStep={2}
              aria-label="Tenant provisioning"
            />
          </div>
        ),
      },
      {
        name: "Complete",
        description: "`activeStep` equal to the step count marks every step complete.",
        render: () => (
          <Stepper
            steps={onboardingSteps}
            activeStep={onboardingSteps.length}
            aria-label="Tenant onboarding"
          />
        ),
      },
    ],
    playground: definePlayground({
      controls: stepperControls,
      render: (v) => (
        <div className={v.orientation === "vertical" ? "w-72" : "w-[min(48rem,100%)]"}>
          <Stepper
            orientation={v.orientation}
            steps={playgroundSteps(v)}
            activeStep={v.activeStep}
            aria-label="Checkout progress"
          />
        </div>
      ),
      code: (v) => {
        const steps = playgroundSteps(v).map((step) =>
          [
            `label: ${JSON.stringify(step.label)}`,
            step.description ? `description: ${JSON.stringify(step.description)}` : "",
            step.invalid ? "invalid: true" : "",
          ]
            .filter(Boolean)
            .join(", "),
        );
        return jsx("Stepper", {
          orientation: v.orientation === "horizontal" ? undefined : v.orientation,
          steps: expr(`[\n    ${steps.map((step) => `{ ${step} }`).join(",\n    ")},\n  ]`),
          activeStep: v.activeStep,
          "aria-label": "Checkout progress",
        });
      },
    }),
  },
};
