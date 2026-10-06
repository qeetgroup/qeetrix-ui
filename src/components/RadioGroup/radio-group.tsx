"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";

import { cn } from "@/lib/utils";

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

/**
 * The Qeet selection control, round — the same vocabulary as `Checkbox`.
 *
 * A checked radio is a filled Ember disc with a graphite centre dot, rather than an Ember dot in
 * an empty ring. The dot-in-ring form puts a ~3:1 orange glyph on whatever is behind the control
 * (2.6:1 on the brand-subtle tint of a selected `RadioCard`, on a sunken panel or a hovered row);
 * the filled form puts a 6.7:1 graphite dot on Ember and gives the edge the darker `border-brand`,
 * which clears 3:1 on every surface in both themes.
 *
 * Base UI renders a `<span role="radio">`, so disabled is `data-disabled`, not `:disabled`.
 */
function Radio({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio"
      className={cn(
        "peer relative flex aspect-square size-4 shrink-0 items-center justify-center rounded-full border outline-none after:absolute after:-inset-1 after:rounded-full",
        "border-(--qx-component-input-border) bg-(--qx-component-input-background)",
        "transition-[background-color,border-color] duration-fast ease-standard",
        "data-unchecked:not-data-disabled:not-aria-invalid:hover:border-(--qx-component-input-border-hover)",
        "data-checked:border-border-brand data-checked:bg-primary",
        "focus-visible:focus-ring",
        "aria-invalid:border-(--qx-component-input-border-invalid) aria-invalid:focus-visible:outline-(--qx-component-input-border-invalid)",
        "data-readonly:cursor-default",
        "data-disabled:cursor-not-allowed data-disabled:opacity-disabled",
        "forced-colors:data-checked:bg-[Highlight]",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-indicator"
        className="flex items-center justify-center data-unchecked:hidden"
      >
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-primary-foreground forced-colors:bg-[HighlightText]"
        />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

export { Radio, RadioGroup };
