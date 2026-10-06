import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";
import { fieldSurface, fieldText } from "@/internal/field-styles";
import { cn } from "@/lib/utils";

/** Every native `<input>` prop. Input adds no props of its own — its appearance is the styling contract. */
type InputProps = React.ComponentProps<"input">;

/**
 * The Qeet text field. Height follows density (`--qx-component-input-height`), the corner is the
 * field corner, and every state — hover, focus, invalid (`aria-invalid`), warning/success (from
 * an enclosing `Field`), read-only (dashed, no writing surface) and disabled — comes from the
 * shared field recipe, so every text-entry control in the library reads the same.
 */
function Input({ className, type, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldSurface,
        fieldText,
        "h-(--qx-component-input-height) px-2.5 py-1",
        "file:me-2 file:inline-flex file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export type { InputProps };
export { Input };
