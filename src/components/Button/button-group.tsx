import type { ComponentProps } from "react";
import { Button } from "@/components/Button/button";
import { cn } from "@/lib/utils";

type ButtonGroupProps = ComponentProps<"fieldset"> & {
  /** Layout direction of the group. Defaults to "horizontal". */
  orientation?: "horizontal" | "vertical";
};

/**
 * A group of connected buttons with merged interior border-radius. Suitable
 * for filter toggles and primary/secondary button splits.
 *
 * Use `ButtonGroupItem` (an alias for `Button`) as the direct children so the
 * border-radius overrides apply correctly.
 */
function ButtonGroup({ orientation = "horizontal", className, ...props }: ButtonGroupProps) {
  return (
    <fieldset
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(
        "flex min-w-0 border-0 p-0",
        // A focused item lifts above its neighbours, whose overlapping edge would otherwise
        // paint over half of its focus ring.
        "*:relative *:focus-visible:z-10",
        // Filled items (primary, secondary, destructive) have no visible edge of their own, so
        // two side by side read as one slab. Each one after the first draws a hairline in its
        // own label colour at low strength: the split shows on every variant, in both themes,
        // without a colour per variant. Outline items already overlap their 1px borders.
        // `-ms-px`, not `-ml-px`: under RTL the overlap has to be on the inline-start side too.
        orientation === "horizontal"
          ? "flex-row [&>*:not(:first-child)]:-ms-px [&>*:first-child]:rounded-e-none [&>*:last-child]:rounded-s-none [&>*:not(:first-child):not(:last-child)]:rounded-none [&>:is([data-variant=default],[data-variant=secondary],[data-variant=destructive]):not(:first-child)]:border-s-current/20"
          : "flex-col [&>*:not(:first-child)]:-mt-px [&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-t-none [&>*:not(:first-child):not(:last-child)]:rounded-none [&>:is([data-variant=default],[data-variant=secondary],[data-variant=destructive]):not(:first-child)]:border-t-current/20",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Re-export of `Button` as a named alias for DX clarity inside `ButtonGroup`.
 * Use this instead of `Button` when composing a button group so intent is
 * explicit at the call site.
 */
const ButtonGroupItem = Button;

export type { ButtonGroupProps };
export { ButtonGroup, ButtonGroupItem };
