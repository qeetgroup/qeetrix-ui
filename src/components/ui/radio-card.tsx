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
}

const RadioCardContext = React.createContext<RadioCardContextValue>({
  value: undefined,
  onValueChange: undefined,
  name: "radio-card-group",
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
}

function RadioCardGroup({
  value: controlledValue,
  defaultValue,
  onValueChange,
  name: nameProp,
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
      value={{ value: selectedValue, onValueChange: handleValueChange, name }}
    >
      <div
        role="radiogroup"
        data-slot="radio-card-group"
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

function RadioCard({ value, children, disabled, className }: RadioCardProps) {
  const ctx = React.useContext(RadioCardContext);
  const isChecked = ctx.value === value;

  return (
    <label
      data-slot="radio-card"
      className={cn(
        "flex cursor-pointer gap-3 rounded-lg border-2 p-4 transition-all",
        "hover:border-muted-foreground/40",
        isChecked ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border",
        disabled && "cursor-not-allowed opacity-disabled",
        className,
      )}
    >
      <input
        type="radio"
        name={ctx.name}
        value={value}
        checked={isChecked}
        disabled={disabled}
        onChange={() => ctx.onValueChange?.(value)}
        className="mt-1 shrink-0 accent-primary"
      />
      <div className="flex-1">{children}</div>
    </label>
  );
}

export type { RadioCardGroupProps, RadioCardProps };
export { RadioCard, RadioCardGroup };
