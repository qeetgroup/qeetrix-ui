import type * as React from "react";

import { cn } from "@/lib/utils";

const INVALID_CONTROL_SELECTOR = [
  '[aria-invalid="true"]',
  '[aria-invalid="grammar"]',
  '[aria-invalid="spelling"]',
  "input:invalid",
  "select:invalid",
  "textarea:invalid",
].join(",");

interface FormProps extends React.ComponentProps<"form"> {
  /** Move focus to the first invalid control after the submit handler updates validation state. */
  focusInvalidOnSubmit?: boolean;
}

interface FormErrorSummaryItem {
  /** The id of the invalid control this error describes. */
  controlId: string;
  /** Stable key when a control can have more than one summary error. */
  id?: string;
  message: React.ReactNode;
}

interface FormErrorSummaryProps extends Omit<React.ComponentProps<"div">, "children" | "title"> {
  errors: FormErrorSummaryItem[];
  title?: React.ReactNode;
}

function focusFirstInvalidControl(form: HTMLFormElement): HTMLElement | null {
  const controls = form.querySelectorAll<HTMLElement>(INVALID_CONTROL_SELECTOR);
  const target = Array.from(controls).find(
    (control) =>
      !control.matches(":disabled") &&
      control.getAttribute("type") !== "hidden" &&
      !control.closest('[hidden], [inert], [aria-hidden="true"]'),
  );

  target?.focus();
  return target ?? null;
}

/**
 * Form is a deliberately library-agnostic wrapper: a styled `<form>` with
 * sensible vertical rhythm, plus `FormActions` for the footer button row.
 * It composes with the existing Field family (`FieldGroup`, `Field`,
 * `FieldLabel`, `FieldError`, …) for layout and validation display, and
 * works with any form library (TanStack Form, React Hook Form) or none —
 * you own the state/validation; the design system owns the look.
 */
function Form({ className, focusInvalidOnSubmit = false, onSubmit, ...props }: FormProps) {
  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    onSubmit?.(event);

    if (focusInvalidOnSubmit) {
      queueMicrotask(() => focusFirstInvalidControl(form));
    }
  }

  return (
    <form
      data-slot="form"
      className={cn("flex flex-col gap-6", className)}
      onSubmit={focusInvalidOnSubmit || onSubmit ? handleSubmit : undefined}
      {...props}
    />
  );
}

function FormActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-actions"
      className={cn("flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function FormErrorSummary({
  errors,
  title = "There is a problem",
  className,
  tabIndex = -1,
  ...props
}: FormErrorSummaryProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-atomic="true"
      tabIndex={tabIndex}
      data-slot="form-error-summary"
      className={cn(
        "rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-destructive/30",
        className,
      )}
      {...props}
    >
      <p className="font-semibold text-destructive">{title}</p>
      <ul className="mt-2 list-disc space-y-1 ps-5">
        {errors.map((error, index) => (
          <li key={error.id ?? `${error.controlId}-${index}`}>
            <a
              href={`#${encodeURIComponent(error.controlId)}`}
              className="font-medium text-destructive underline underline-offset-4"
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type { FormErrorSummaryItem, FormErrorSummaryProps, FormProps };
export { Form, FormActions, FormErrorSummary, focusFirstInvalidControl };
