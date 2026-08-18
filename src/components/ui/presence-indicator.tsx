import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const presenceVariants = cva("inline-block shrink-0 rounded-full ring-2 ring-background", {
  variants: {
    status: {
      online: "bg-success",
      away: "bg-warning",
      busy: "bg-destructive",
      offline: "bg-muted-foreground/40",
    },
    size: { sm: "size-2", md: "size-2.5", lg: "size-3" },
  },
  defaultVariants: { status: "offline", size: "md" },
});

interface PresenceIndicatorProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof presenceVariants> {
  /** Accessible label; defaults to the status name. */
  label?: string;
  /** Soft pulse to signal active presence (honors reduced-motion). */
  pulse?: boolean;
}

/** A presence/status dot (online · away · busy · offline) for avatars and rows. */
function PresenceIndicator({
  status = "offline",
  size,
  label,
  pulse,
  className,
  ...props
}: PresenceIndicatorProps) {
  return (
    <span
      role="status"
      aria-label={label ?? status ?? "offline"}
      data-slot="presence-indicator"
      className={cn(
        presenceVariants({ status, size }),
        pulse && "animate-pulse motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export type { PresenceIndicatorProps };
export { PresenceIndicator, presenceVariants };
