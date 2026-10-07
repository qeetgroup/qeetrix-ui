import type * as React from "react";

import { labelMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";

interface LabelProps extends React.ComponentProps<"label"> {
  /**
   * Show the required indicator — an asterisk after the text. It is visual only (`aria-hidden`):
   * the control itself must carry `required` or `aria-required`, which is what assistive
   * technology announces, so the obligation is never stated twice.
   */
  required?: boolean;
  /**
   * Mark the field optional instead — the better convention when most fields in a form are
   * required. `true` renders "(optional)"; pass a node to translate it. Ignored when `required`.
   */
  optional?: boolean | React.ReactNode;
}

/**
 * Names a form control. Its required indicator is visual only: the control itself carries
 * `required`, which is what assistive technology announces.
 */
function Label({ className, htmlFor, children, required, optional, ...props }: LabelProps) {
  const optionalText = optional === true ? labelMessages.optional : optional;
  return (
    <label
      htmlFor={htmlFor}
      data-slot="label"
      data-required={required || undefined}
      className={cn(
        "flex items-center gap-2 text-sm leading-snug font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-disabled peer-disabled:cursor-not-allowed peer-disabled:opacity-disabled peer-data-disabled:cursor-not-allowed peer-data-disabled:opacity-disabled",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span
          aria-hidden="true"
          data-slot="label-required-indicator"
          className="-ms-1.5 text-destructive-text"
        >
          *
        </span>
      ) : optionalText ? (
        <>
          {/* A space for the accessible name ("Nickname (optional)"); a flex container does not
              render whitespace-only text, so the gap is unchanged. */}{" "}
          <span
            data-slot="label-optional-indicator"
            className="-ms-1 font-normal text-muted-foreground"
          >
            {optionalText}
          </span>
        </>
      ) : null}
    </label>
  );
}

export type { LabelProps };
export { Label };
