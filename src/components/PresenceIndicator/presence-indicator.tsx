import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import type { MessagesFor } from "@/lib/messages";
import { presenceIndicatorMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

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
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"presenceIndicator">;
}

/** A presence/status dot (online · away · busy · offline) for avatars and rows. */
function PresenceIndicator({
  status = "offline",
  size,
  label,
  pulse,
  messages: messageOverrides,
  className,
  ...props
}: PresenceIndicatorProps) {
  const messages = useMessages("presenceIndicator", presenceIndicatorMessages, messageOverrides);
  return (
    <span
      role="status"
      aria-label={label ?? messages.status(status ?? "offline")}
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
