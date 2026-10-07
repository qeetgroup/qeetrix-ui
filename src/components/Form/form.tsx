import { CircleAlertIcon } from "@qeetrix/icons/icons/circle-alert";
import type * as React from "react";

import type { MessagesFor } from "@/lib/messages";
import { formMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

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
  /**
   * Heading of the summary. Equivalent to `messages={{ errorSummaryTitle }}` and wins over it,
   * and unlike the catalogue it accepts a node rather than a string.
   */
  title?: React.ReactNode;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"form">;
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
 *
 * Rhythm follows density: sections sit one and a half field gaps apart (24px by default, 12px
 * compact), fields inside a `FieldGroup` one field gap apart, and within a field the label,
 * control and message sit 6px apart — see `Field`.
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
      className={cn("flex flex-col gap-[calc(var(--qx-control-field-gap)*1.5)]", className)}
      onSubmit={focusInvalidOnSubmit || onSubmit ? handleSubmit : undefined}
      {...props}
    />
  );
}

function FormActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-actions"
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:flex-wrap sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function FormErrorSummary({
  errors,
  title,
  messages: messageOverrides,
  className,
  tabIndex = -1,
  ...props
}: FormErrorSummaryProps) {
  const messages = useMessages("form", formMessages, messageOverrides);
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
        // The status surface vocabulary: the opaque designed error surface with its ≥3:1
        // boundary, and the foundation focus ring — the summary is focused programmatically after
        // a failed submit, so its focus indicator has to be as strong as any control's.
        "flex gap-2.5 rounded-lg border border-(--qx-color-border-danger) bg-destructive-subtle p-4 text-sm text-foreground outline-none focus-visible:focus-ring",
        className,
      )}
      {...props}
    >
      <CircleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive-text" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-destructive-text">{title ?? messages.errorSummaryTitle}</p>
        <ul className="mt-2 list-disc space-y-1 ps-5 marker:text-destructive-text">
          {errors.map((error, index) => (
            <li key={error.id ?? `${error.controlId}-${index}`}>
              <a
                href={`#${encodeURIComponent(error.controlId)}`}
                onClick={(event) => {
                  // A fragment link scrolls to the control but leaves focus behind, so the user
                  // still has to find and click it. Focus it instead — the href stays as the
                  // no-script fallback.
                  const control = event.currentTarget.ownerDocument.getElementById(error.controlId);
                  if (!control || typeof control.focus !== "function") return;
                  event.preventDefault();
                  control.focus({ preventScroll: true });
                  control.scrollIntoView?.({ block: "center" });
                }}
                className="rounded-sm font-medium text-destructive-text underline underline-offset-4 outline-none hover:decoration-2 focus-visible:focus-ring"
              >
                {error.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export type { FormErrorSummaryItem, FormErrorSummaryProps, FormProps };
export { Form, FormActions, FormErrorSummary, focusFirstInvalidControl };
