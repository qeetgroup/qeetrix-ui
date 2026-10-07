"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckboxGroup as CheckboxGroupPrimitive } from "@base-ui/react/checkbox-group";
import { CheckIcon } from "@qeetrix/icons/icons/check";
import { MinusIcon } from "@qeetrix/icons/icons/minus";

import { cn } from "@/lib/utils";

function CheckboxGroup({ className, ...props }: CheckboxGroupPrimitive.Props) {
  return (
    <CheckboxGroupPrimitive
      data-slot="checkbox-group"
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  );
}

/** The checkbox's props, including the `checked` / `defaultChecked` / `onCheckedChange` triple. */
type CheckboxProps = CheckboxPrimitive.Root.Props;

/**
 * The Qeet selection control, square. The vocabulary is shared with `Radio` and `Switch`:
 *
 * - **rest** — the field fill and the ≥3:1 control boundary, so an empty box reads as a control on
 *   every surface (`--qx-component-input-*`, the same tokens a text field uses).
 * - **checked / indeterminate** — a Qeet Ember fill with a white glyph (4.6:1). The fill alone is
 *   under 3:1 on some light surfaces, so the edge takes the darker `border-brand`, which clears 3:1 on
 *   every surface in both themes, and the glyph — not the colour — carries the state.
 * - **focus** — the foundation's outline ring, offset from the box.
 * - **disabled** — Base UI renders a `<span role="checkbox">`, so `:disabled` never matches; the
 *   state is `data-disabled`.
 * - **forced colors** — checked takes `Highlight`, so the state survives a system palette.
 *
 * The 16px box carries a 24px pointer target (WCAG 2.5.8) on a pseudo-element, without moving
 * layout.
 */
function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-(--qx-corner-sm) border text-current outline-none after:absolute after:-inset-1",
        "border-(--qx-component-input-border) bg-(--qx-component-input-background)",
        "transition-[background-color,border-color,color] duration-fast ease-standard",
        "data-unchecked:not-data-indeterminate:not-data-disabled:not-aria-invalid:hover:border-(--qx-component-input-border-hover)",
        "data-checked:border-border-brand data-checked:bg-primary data-checked:text-primary-foreground",
        "data-indeterminate:border-border-brand data-indeterminate:bg-primary data-indeterminate:text-primary-foreground",
        "focus-visible:focus-ring",
        "aria-invalid:border-(--qx-component-input-border-invalid) aria-invalid:focus-visible:outline-(--qx-component-input-border-invalid)",
        "data-readonly:cursor-default",
        "data-disabled:cursor-not-allowed data-disabled:opacity-disabled",
        "forced-colors:data-checked:bg-[Highlight] forced-colors:data-checked:text-[HighlightText] forced-colors:data-indeterminate:bg-[Highlight] forced-colors:data-indeterminate:text-[HighlightText]",
        className,
      )}
      {...props}
    >
      {/* The glyph follows the indicator's *state*, not `props.indeterminate`: a CheckboxGroup
          `parent` is mixed by Base UI's state, with no prop saying so, and used to show a check
          while only some of its children were checked. */}
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current data-unchecked:not-data-indeterminate:hidden"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            {state.indeterminate ? (
              <MinusIcon aria-hidden strokeWidth={3} className="size-3" />
            ) : (
              <CheckIcon aria-hidden strokeWidth={3} className="size-3" />
            )}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

export type { CheckboxProps };
export { Checkbox, CheckboxGroup };
