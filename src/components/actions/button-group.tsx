import type { ComponentProps } from "react";
import { Button } from "@/components/actions/button";
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
        orientation === "horizontal"
          ? "flex-row [&>*:not(:first-child)]:-ml-px [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child):not(:last-child)]:rounded-none"
          : "flex-col [&>*:not(:first-child)]:-mt-px [&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-t-none [&>*:not(:first-child):not(:last-child)]:rounded-none",
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
