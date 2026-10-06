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
  /** Submitted with the form when checked, and identifies the card inside a `CheckboxGroup`. */
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Keeps the card focusable and announced while ignoring changes. */
  readOnly?: boolean;
  /** Submits the checkbox under this name. */
  name?: string;
  /** Marks the checkbox required for form validation. */
  required?: boolean;
  /** Applied to the checkbox's form input. */
  id?: string;
  /** Marks the card invalid: the edge takes the field's invalid colour and the checkbox reports `aria-invalid`. */
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  /** Points the checkbox at a description or error elsewhere on the page. */
  "aria-describedby"?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A checkbox with room for a title and a description — a choice that needs explaining, not a
 * promotional tile. It stays a form control: a hairline edge at rest, a quiet Qeet tint and a
 * 2px brand edge when selected, and the checkbox itself carrying the state as a glyph, so the
 * card never relies on its tint.
 *
 * Selection is read from the checkbox's own `data-checked`, so the card looks right whether it
 * is controlled, uncontrolled or driven by an enclosing `CheckboxGroup`. Focus is drawn on the
 * card rather than the 16px box, so the ring frames the whole target the pointer can hit.
 */
function CheckboxCard({
  value,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  readOnly,
  name,
  required,
  id,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  children,
  className,
}: CheckboxCardProps) {
  const autoId = React.useId();
  const controlId = id ?? autoId;
  return (
    <label
      htmlFor={controlId}
      data-slot="checkbox-card"
      data-disabled={disabled || undefined}
      className={cn(
        "relative flex cursor-pointer gap-3 rounded-(--qx-corner-control) border border-border bg-transparent p-4 text-start",
        "transition-[background-color,border-color,box-shadow] duration-fast ease-standard",
        "not-data-disabled:hover:border-border-strong not-data-disabled:hover:bg-surface-subtle",
        "has-[[data-slot=checkbox][data-checked]]:border-border-brand has-[[data-slot=checkbox][data-checked]]:bg-brand-subtle has-[[data-slot=checkbox][data-checked]]:ring-1 has-[[data-slot=checkbox][data-checked]]:ring-border-brand has-[[data-slot=checkbox][data-checked]]:ring-inset",
        "not-data-disabled:has-[[data-slot=checkbox][data-checked]]:hover:border-border-brand not-data-disabled:has-[[data-slot=checkbox][data-checked]]:hover:bg-brand-subtle-hover",
        // Invalid outranks hover and selection, whatever their selector weight.
        "has-[[data-slot=checkbox][aria-invalid=true]]:border-(--qx-component-input-border-invalid)!",
        "has-[[data-slot=checkbox]:focus-visible]:focus-ring",
        "has-[[data-slot=checkbox][aria-invalid=true]:focus-visible]:outline-(--qx-component-input-border-invalid)",
        // The card draws the focus ring around the whole target, so the box's own ring would
        // double it; and the card dims as a whole, so the box is not dimmed a second time.
        "[&_[data-slot=checkbox]:focus-visible]:outline-none [&_[data-slot=checkbox][data-disabled]]:opacity-100",
        "data-disabled:cursor-not-allowed data-disabled:opacity-disabled",
        "forced-colors:has-[[data-slot=checkbox][data-checked]]:border-[Highlight]",
        readOnly && "cursor-default",
        className,
      )}
    >
      <Checkbox
        id={controlId}
        value={value}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className="mt-0.5 shrink-0"
      />
      <div data-slot="checkbox-card-content" className="min-w-0 flex-1">
        {children}
      </div>
    </label>
  );
}

export type { CheckboxCardProps };
export { CheckboxCard, CheckboxCardGroup };
