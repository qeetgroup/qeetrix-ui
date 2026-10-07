import { CheckIcon } from "@qeetrix/icons/icons/check";
import type * as React from "react";

import type { MessagesFor, StepperMessages } from "@/lib/messages";
import { resolveMessages, stepperMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";

interface StepperStep {
  label: React.ReactNode;
  description?: React.ReactNode;
  /**
   * The step has errors — failed validation, or a check that did not pass. Drawn in the
   * destructive treatment with a "!" in place of its number, and announced, whatever its
   * position relative to `activeStep`. Put the reason in `description`.
   */
  invalid?: boolean;
}

interface StepperProps extends React.ComponentProps<"ol"> {
  steps: StepperStep[];
  /** Zero-based index of the current step. Earlier steps render as complete. */
  activeStep: number;
  /**
   * `horizontal` (default) lays the steps out in a row with each label beneath its marker, so
   * labels wrap within an even share of the width instead of colliding. `vertical` stacks them
   * with the connector running down the inline-start edge — for side panels and narrow flows.
   */
  orientation?: "horizontal" | "vertical";
  /**
   * Overrides for the visually hidden status strings (the `stepper` catalogue group). Stepper is
   * server-safe, so it resolves against its defaults and this prop only — a `MessagesProvider`
   * does not reach it; pass the translated group here.
   */
  messages?: MessagesFor<"stepper">;
}

type StepState = "complete" | "active" | "upcoming";

/*
 * One strong mark per flow. The current step is the solid Qeet marker (white numeral on the
 * Ember fill, 4.6:1) with a quiet brand halo; completed steps step back to the brand tint with a brand
 * check, and the connector behind them is the 3:1 brand border; upcoming steps are neutral. A
 * finished flow is therefore not a row of orange discs. Errors take the destructive roles.
 */
const markerClassName: Record<StepState, string> = {
  complete: "border-border-brand bg-brand-subtle text-brand",
  // The Qeet fill is 2.9:1 on the light canvas, so the disc is outlined in the 3:1 brand border.
  active:
    "border-border-brand bg-primary text-primary-foreground ring-4 ring-brand-subtle forced-colors-selected",
  upcoming: "border-border-strong bg-surface text-muted-foreground",
};

/**
 * Step indicator for multi-step flows (onboarding, checkout, provisioning). Steps before
 * `activeStep` are complete, the active step is current (`aria-current="step"`), later steps are
 * upcoming, and any step can be marked `invalid`. Completed and invalid steps carry a visually
 * hidden status, so the state is not conveyed by colour and glyph alone. Drive `activeStep`
 * from your own wizard state.
 */
function Stepper({
  steps,
  activeStep,
  orientation = "horizontal",
  messages: messageOverrides,
  className,
  ...props
}: StepperProps) {
  // Resolved, not spread: an `undefined` override falls back instead of blanking the status.
  const messages = resolveMessages(stepperMessages, messageOverrides);
  const horizontal = orientation === "horizontal";

  return (
    <ol
      data-slot="stepper"
      data-orientation={orientation}
      className={cn("flex w-full", horizontal ? "items-start" : "flex-col", className)}
      {...props}
    >
      {steps.map((step, index) => {
        const state: StepState =
          index < activeStep ? "complete" : index === activeStep ? "active" : "upcoming";
        const invalid = step.invalid === true;
        const isLast = index === steps.length - 1;
        const status = invalid ? messages.invalid : state === "complete" ? messages.complete : null;
        // Steps are a fixed, ordered sequence — a per-position key is stable.
        const stepKey = `step-${index}`;
        return (
          <li
            key={stepKey}
            data-slot="stepper-step"
            data-state={state}
            data-invalid={invalid ? "" : undefined}
            className={cn("flex min-w-0", horizontal ? "flex-1 flex-col gap-2" : "gap-3")}
            // The active step is what a screen-reader user needs to locate; a data attribute
            // is invisible to them.
            aria-current={state === "active" ? "step" : undefined}
          >
            <div className={cn("flex items-center", horizontal ? "pe-2" : "flex-col self-stretch")}>
              <span
                aria-hidden
                data-slot="stepper-marker"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-[background-color,border-color,color,box-shadow] duration-normal ease-standard",
                  invalid
                    ? "border-destructive bg-destructive-subtle text-destructive-text"
                    : markerClassName[state],
                )}
              >
                {invalid ? (
                  "!"
                ) : state === "complete" ? (
                  <CheckIcon strokeWidth={2.5} className="size-3.5" />
                ) : (
                  index + 1
                )}
              </span>
              {!isLast && (
                <span
                  aria-hidden
                  data-slot="stepper-connector"
                  className={cn(
                    "flex-1 transition-colors duration-normal ease-standard",
                    horizontal ? "ms-2 h-px min-w-4" : "my-1 min-h-4 w-px",
                    index < activeStep ? "bg-border-brand" : "bg-border",
                    // The brand border is not a bridge colour, so forced colours would erase
                    // the completed segments; every connector is drawn in the text colour there.
                    "forced-colors:bg-[CanvasText]",
                  )}
                />
              )}
            </div>
            <div
              className={cn(
                "flex min-w-0 flex-col gap-0.5",
                horizontal ? "pe-4" : cn("pt-1", !isLast && "pb-6"),
              )}
            >
              <span
                data-slot="stepper-label"
                className={cn(
                  "text-sm font-medium text-pretty wrap-break-word",
                  invalid
                    ? "text-destructive-text"
                    : state === "upcoming"
                      ? "text-muted-foreground"
                      : "text-foreground",
                )}
              >
                {step.label}
              </span>
              {status && <span className="sr-only">{status}</span>}
              {step.description && (
                <span
                  data-slot="stepper-description"
                  className={cn(
                    "text-xs text-pretty wrap-break-word",
                    invalid ? "text-destructive-text" : "text-muted-foreground",
                  )}
                >
                  {step.description}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export type { StepperMessages, StepperProps, StepperStep };
export { Stepper };
