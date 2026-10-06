import type * as React from "react";
import { fieldSurface, fieldText } from "@/internal/field-styles";
import { cn } from "@/lib/utils";

/**
 * Multi-line text field on the shared field recipe.
 *
 * Sizing: it grows with its content (`field-sizing: content`, where supported) from a
 * density-aware minimum of two control heights up to a 24rem cap, then scrolls — so a long note
 * never pushes the rest of a form off screen. The user can still resize it vertically; horizontal
 * resizing is off because it breaks the layout a textarea sits in. Override any of the three with
 * `className` (`min-h-*`, `max-h-[none]` — tailwind-merge does not recognise `max-h-none` — and `resize-none`).
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldSurface,
        fieldText,
        "flex field-sizing-content min-h-[calc(var(--qx-component-input-height)*2)] max-h-96 resize-y px-2.5 py-2 leading-normal",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
