import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";

import { cn } from "@/lib/utils";

/** Every native `<input>` prop. Input adds no props of its own — its appearance is the styling contract. */
type InputProps = React.ComponentProps<"input">;

function Input({ className, type, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-(--qx-component-input-height) w-full min-w-0 rounded-(--qx-component-input-corner) border border-(--qx-component-input-border) bg-(--qx-component-input-background) px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-(--qx-component-input-border-focus) focus-visible:ring-3 focus-visible:ring-ring/disabled disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-(--qx-component-input-background-disabled) disabled:opacity-disabled aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/disabled dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export type { InputProps };
export { Input };
