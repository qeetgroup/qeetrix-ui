"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface RadioCardContextValue {
  value: string | undefined;
  onValueChange: ((value: string) => void) | undefined;
  name: string;
  disabled: boolean;
  required: boolean;
}

const RadioCardContext = React.createContext<RadioCardContextValue>({
  value: undefined,
  onValueChange: undefined,
  name: "radio-card-group",
  disabled: false,
  required: false,
});

// ---------------------------------------------------------------------------
// RadioCardGroup
// ---------------------------------------------------------------------------

interface RadioCardGroupProps extends React.ComponentProps<"div"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Shared name for all radio inputs — enables native arrow-key roving focus. Auto-generated if omitted. */
  name?: string;
  /** Disables every card in the group. */
  disabled?: boolean;
  /** Requires a choice before the enclosing form submits (browser-enforced: the radios are native). */
  required?: boolean;
}

function RadioCardGroup({
  value: controlledValue,
  defaultValue,
  onValueChange,
  name: nameProp,
  disabled = false,
  required = false,
  className,
  children,
  ...props
}: RadioCardGroupProps) {
  const autoId = React.useId();
  const name = nameProp ?? autoId;

  const [uncontrolledValue, setUncontrolledValue] = React.useState<string | undefined>(
    defaultValue,
  );

  const isControlled = controlledValue !== undefined;
  const selectedValue = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (val: string) => {
      if (!isControlled) setUncontrolledValue(val);
      onValueChange?.(val);
    },
    [isControlled, onValueChange],
  );

  return (
    <RadioCardContext.Provider
      value={{ value: selectedValue, onValueChange: handleValueChange, name, disabled, required }}
    >
      <div
        role="radiogroup"
        data-slot="radio-card-group"
        aria-disabled={disabled || undefined}
        aria-required={required || undefined}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      >
        {children}
      </div>
    </RadioCardContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// RadioCard
// ---------------------------------------------------------------------------

interface RadioCardProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * A radio with room for a title and a description. Same language as `CheckboxCard`: a hairline
 * edge at rest, a quiet Qeet tint and a 2px brand edge when chosen, and the radio — a filled
 * Ember disc with a graphite dot, identical to `Radio` — carrying the state, so the card never
 * relies on its tint.
 *
 * The control is a real `<input type="radio">` restyled with `appearance: none`, so arrow-key
 * roving, form submission and `required` stay the browser's own.
 */
function RadioCard({ value, children, disabled: disabledProp, className }: RadioCardProps) {
  const ctx = React.useContext(RadioCardContext);
  const isChecked = ctx.value === value;
  const disabled = ctx.disabled || Boolean(disabledProp);

  return (
    <label
      data-slot="radio-card"
      data-checked={isChecked || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        "relative flex cursor-pointer gap-3 rounded-(--qx-corner-control) border border-border bg-transparent p-4 text-start",
        "transition-[background-color,border-color,box-shadow] duration-fast ease-standard",
        "not-data-disabled:hover:border-border-strong not-data-disabled:hover:bg-surface-subtle",
        "data-checked:border-border-brand data-checked:bg-brand-subtle data-checked:ring-1 data-checked:ring-border-brand data-checked:ring-inset",
        "not-data-disabled:data-checked:hover:border-border-brand not-data-disabled:data-checked:hover:bg-brand-subtle-hover",
        // Invalid outranks hover and selection, whatever their selector weight.
        "in-[[data-slot=radio-card-group][aria-invalid=true]]:border-(--qx-component-input-border-invalid)!",
        "has-[input:focus-visible]:focus-ring",
        "in-[[data-slot=radio-card-group][aria-invalid=true]]:has-[input:focus-visible]:outline-(--qx-component-input-border-invalid)",
        "data-disabled:cursor-not-allowed data-disabled:opacity-disabled",
        "forced-colors:data-checked:border-[Highlight]",
        className,
      )}
    >
      <span className="relative mt-0.5 flex size-4 shrink-0 items-center justify-center">
        <input
          type="radio"
          name={ctx.name}
          value={value}
          checked={isChecked}
          disabled={disabled}
          required={ctx.required}
          onChange={() => ctx.onValueChange?.(value)}
          className={cn(
            "peer absolute inset-0 m-0 size-full cursor-[inherit] appearance-none rounded-full border outline-none",
            "border-(--qx-component-input-border) bg-(--qx-component-input-background)",
            "transition-[background-color,border-color] duration-fast ease-standard",
            "checked:border-border-brand checked:bg-primary",
            "forced-colors:checked:bg-[Highlight]",
          )}
        />
        <span
          aria-hidden
          className="pointer-events-none relative hidden size-1.5 rounded-full bg-primary-foreground peer-checked:block forced-colors:bg-[HighlightText]"
        />
      </span>
      <div data-slot="radio-card-content" className="min-w-0 flex-1">
        {children}
      </div>
    </label>
  );
}

export type { RadioCardGroupProps, RadioCardProps };
export { RadioCard, RadioCardGroup };
