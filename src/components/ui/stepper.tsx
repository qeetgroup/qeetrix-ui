import { CheckIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

interface StepperStep {
  label: React.ReactNode;
  description?: React.ReactNode;
}

interface StepperProps extends React.ComponentProps<"ol"> {
  steps: StepperStep[];
  /** Zero-based index of the current step. Earlier steps render as complete. */
  activeStep: number;
}

/**
 * Horizontal step indicator for multi-step flows (onboarding, checkout). Steps
 * before `activeStep` show a check; the active step is highlighted; later steps
 * are muted. Drive `activeStep` from your own wizard state.
 */
function Stepper({ steps, activeStep, className, ...props }: StepperProps) {
  return (
    <ol data-slot="stepper" className={cn("flex w-full items-center", className)} {...props}>
      {steps.map((step, index) => {
        const state =
          index < activeStep ? "complete" : index === activeStep ? "active" : "upcoming";
        const isLast = index === steps.length - 1;
        // Steps are a fixed, ordered sequence — a per-position key is stable.
        const stepKey = `step-${index}`;
        return (
          <li
            key={stepKey}
            data-state={state}
            className={cn("flex items-center gap-3", !isLast && "flex-1")}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  state === "complete" && "border-primary bg-primary text-primary-foreground",
                  state === "active" && "border-primary text-primary",
                  state === "upcoming" && "border-border text-muted-foreground",
                )}
              >
                {state === "complete" ? <CheckIcon className="size-4" /> : index + 1}
              </span>
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-sm font-medium",
                    state === "upcoming" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-xs text-muted-foreground">{step.description}</span>
                )}
              </div>
            </div>
            {!isLast && (
              <span
                aria-hidden
                className={cn("mx-2 h-px flex-1", index < activeStep ? "bg-primary" : "bg-border")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export type { StepperProps, StepperStep };
export { Stepper };
