import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import type { MessagesFor } from "@/lib/messages";
import { presenceIndicatorMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/**
 * Each state has its own *shape*, so presence never rests on green-versus-red alone (WCAG 1.4.1;
 * red/green is also the most common colour-vision deficiency):
 *
 *   online   filled disc              away     crescent (a bite out of the disc)
 *   busy     disc with a bar (DND)    offline  hollow ring
 *
 * The bite and the ring's hole are painted in `--presence-surface` — the same colour as the
 * separating ring — which defaults to the page background. On another surface set it once:
 * `className="[--presence-surface:var(--card)]"`.
 *
 * Every mark is ≥3:1 against the surface in both themes; the old offline dot
 * (muted-foreground at 40%) measured 1.8:1. In forced-colors mode the marks are drawn in
 * CanvasText on Canvas, where the shapes alone carry the state.
 */
const presenceVariants = cva(
  [
    "relative inline-block shrink-0 rounded-full ring-2 ring-(--presence-surface) [--presence-surface:var(--background)]",
    "forced-color-adjust-none",
    "after:absolute after:rounded-full after:content-['']",
  ],
  {
    variants: {
      status: {
        online: "bg-success after:hidden forced-colors:bg-[CanvasText]",
        away: "bg-warning after:-inset-s-[18%] after:-top-[18%] after:size-[72%] after:bg-(--presence-surface) forced-colors:bg-[CanvasText] forced-colors:after:bg-[Canvas]",
        busy: "bg-destructive after:inset-x-[22%] after:top-[38%] after:h-[24%] after:bg-destructive-foreground forced-colors:bg-[CanvasText] forced-colors:after:bg-[Canvas]",
        offline:
          "border-(length:--presence-stroke) border-muted-foreground bg-(--presence-surface) after:hidden forced-colors:border-[CanvasText] forced-colors:bg-[Canvas]",
      },
      size: {
        sm: "size-2 [--presence-stroke:1.5px]",
        md: "size-2.5 [--presence-stroke:2px]",
        lg: "size-3 [--presence-stroke:2px]",
      },
    },
    defaultVariants: { status: "offline", size: "md" },
  },
);

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

/** A presence/status mark (online · away · busy · offline) for avatars and rows. */
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
  const resolvedStatus = status ?? "offline";
  return (
    <span
      // A named graphic, not a live region: a member list renders one per person, and as
      // role="status" every dot was a polite live region that re-announced on each change.
      role="img"
      aria-label={label ?? messages.status(resolvedStatus)}
      data-slot="presence-indicator"
      data-status={resolvedStatus}
      className={cn(
        presenceVariants({ status: resolvedStatus, size }),
        pulse && "animate-pulse motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export type { PresenceIndicatorProps };
export { PresenceIndicator, presenceVariants };
