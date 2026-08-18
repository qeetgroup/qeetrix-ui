"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Stepper, type StepperStep } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";

interface WizardStep extends StepperStep {
  /** Content rendered when this step is active. */
  content: React.ReactNode;
}

interface OnboardingWizardProps {
  steps: WizardStep[];
  /** Controlled active step (zero-based). */
  step?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  /** Fired when the final step's primary button is pressed. */
  onComplete?: () => void;
  backLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
  className?: string;
}

/**
 * Multi-step flow: a {@link Stepper} header, the active step's content, and a
 * Back / Next (→ Finish on the last step) footer. Controlled via `step` or
 * self-managed from `defaultStep`. You own each step's form + validation;
 * gate progress by controlling `step` and ignoring `onStepChange` when invalid.
 */
function OnboardingWizard({
  steps,
  step,
  defaultStep = 0,
  onStepChange,
  onComplete,
  backLabel = "Back",
  nextLabel = "Continue",
  finishLabel = "Finish",
  className,
}: OnboardingWizardProps) {
  const [internal, setInternal] = React.useState(defaultStep);
  const active = step ?? internal;
  const isLast = active >= steps.length - 1;

  function go(next: number) {
    const clamped = Math.max(0, Math.min(steps.length - 1, next));
    if (step === undefined) setInternal(clamped);
    onStepChange?.(clamped);
  }

  return (
    <div data-slot="onboarding-wizard" className={cn("flex flex-col gap-6", className)}>
      <Stepper steps={steps} activeStep={active} />
      <div data-slot="onboarding-wizard-content">{steps[active]?.content}</div>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => go(active - 1)}
          disabled={active === 0}
        >
          {backLabel}
        </Button>
        <Button type="button" onClick={() => (isLast ? onComplete?.() : go(active + 1))}>
          {isLast ? finishLabel : nextLabel}
        </Button>
      </div>
    </div>
  );
}

export type { OnboardingWizardProps, WizardStep };
export { OnboardingWizard };
