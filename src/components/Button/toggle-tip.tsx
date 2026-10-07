"use client";

import { InfoIcon } from "@qeetrix/icons/icons/info";
import type { ComponentProps, ReactNode } from "react";

import { buttonVariants } from "@/components/Button/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover/popover";
import type { MessagesFor } from "@/lib/messages";
import { toggleTipMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

// ToggleTip — click-activated informational popover.
//
// WAI-ARIA distinction: a Tooltip uses role="tooltip" and is hover/focus-only.
// A ToggleTip is activated by clicking a button, receives focus management,
// and the underlying Popover uses role="dialog". This is the correct ARIA
// pattern for click-toggled informational popovers per WCAG 2.2 / APG.

type ToggleTipProps = ComponentProps<typeof Popover>;

function ToggleTip(props: ToggleTipProps) {
  return <Popover {...props} />;
}

interface ToggleTipTriggerProps {
  /**
   * Accessible label for the trigger button. Equivalent to `messages={{ label }}` and wins
   * over it.
   */
  label?: string;
  /** Custom icon to render inside the trigger. Defaults to InfoIcon. */
  icon?: ReactNode;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"toggleTip">;
  /** Merged onto the trigger's own classes. */
  className?: string;
}

/**
 * The info affordance beside a label. It sits inline with label text, so it is the 24px
 * icon size (the WCAG 2.2 AA target minimum) rather than a 28px control that would push the
 * line taller, and it rests at the muted text colour: it is help, not an action. While its
 * popup is open it holds the hover tone, so the open tip is visibly anchored to it.
 */
function ToggleTipTrigger({
  label,
  icon,
  messages: messageOverrides,
  className,
}: ToggleTipTriggerProps) {
  const messages = useMessages("toggleTip", toggleTipMessages, messageOverrides);
  return (
    <PopoverTrigger
      data-slot="toggle-tip-trigger"
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-xs" }),
        "text-muted-foreground hover:text-foreground data-popup-open:bg-surface-interactive-hover data-popup-open:text-foreground",
        className,
      )}
      aria-label={label ?? messages.label}
    >
      {icon ?? <InfoIcon className="size-4" aria-hidden />}
    </PopoverTrigger>
  );
}

function ToggleTipContent({ className, ...props }: ComponentProps<typeof PopoverContent>) {
  const messages = useMessages("toggleTip", toggleTipMessages);
  return (
    <PopoverContent
      data-slot="toggle-tip-content"
      // The underlying Popover renders role="dialog"; give it a default
      // accessible name so screen readers announce it. Consumers can override
      // via aria-label / aria-labelledby (props spread wins over this default).
      aria-label={messages.label}
      className={cn("max-w-xs text-sm", className)}
      {...props}
    />
  );
}

export type { ToggleTipProps, ToggleTipTriggerProps };
export { ToggleTip, ToggleTipContent, ToggleTipTrigger };
