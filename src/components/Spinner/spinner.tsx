import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircleIcon } from "lucide-react";
import type * as React from "react";

import type { MessagesFor } from "@/lib/messages";
import { spinnerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

const spinnerVariants = cva("animate-spin shrink-0 text-muted-foreground", {
  variants: {
    size: {
      sm: "size-4",
      default: "size-5",
      lg: "size-6",
      xl: "size-8",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

/**
 * Indeterminate busy indicator. `label` is its accessible name; leaving it unset takes the
 * name from the message catalogue, so a `MessagesProvider` translates every spinner at once.
 */
function Spinner({
  className,
  size,
  label,
  messages: messageOverrides,
  ...props
}: Omit<React.ComponentProps<typeof LoaderCircleIcon>, "size"> &
  VariantProps<typeof spinnerVariants> & {
    label?: string;
    /**
     * Overrides for this component's built-in English strings. Each key falls back to the
     * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
     */
    messages?: MessagesFor<"spinner">;
  }) {
  const messages = useMessages("spinner", spinnerMessages, messageOverrides);
  return (
    <LoaderCircleIcon
      data-slot="spinner"
      role="status"
      aria-label={label ?? messages.label}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  );
}

export { Spinner, spinnerVariants };
