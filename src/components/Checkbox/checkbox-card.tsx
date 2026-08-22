"use client";

import * as React from "react";

import { Checkbox } from "@/components/Checkbox/checkbox";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// CheckboxCardGroup
// ---------------------------------------------------------------------------

function CheckboxCardGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="checkbox-card-group"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// CheckboxCard
// ---------------------------------------------------------------------------

interface CheckboxCardProps {
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

function CheckboxCard({
  value: _value,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  children,
  className,
}: CheckboxCardProps) {
  const controlId = React.useId();
  return (
    <label
      htmlFor={controlId}
      data-slot="checkbox-card"
      className={cn(
        "flex cursor-pointer gap-3 rounded-lg border-2 p-4 transition-all",
        "hover:border-muted-foreground/40",
        checked ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border",
        disabled && "cursor-not-allowed opacity-disabled",
        className,
      )}
    >
      <Checkbox
        id={controlId}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1">{children}</div>
    </label>
  );
}

export type { CheckboxCardProps };
export { CheckboxCard, CheckboxCardGroup };
