"use client";

import { InfoIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
  /** Accessible label for the trigger button. */
  label?: string;
  /** Custom icon to render inside the trigger. Defaults to InfoIcon. */
  icon?: ReactNode;
}

function ToggleTipTrigger({ label = "More information", icon }: ToggleTipTriggerProps) {
  return (
    <PopoverTrigger
      data-slot="toggle-tip-trigger"
      className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      aria-label={label}
    >
      {icon ?? <InfoIcon className="size-4" aria-hidden />}
    </PopoverTrigger>
  );
}

function ToggleTipContent({ className, ...props }: ComponentProps<typeof PopoverContent>) {
  return (
    <PopoverContent
      data-slot="toggle-tip-content"
      // The underlying Popover renders role="dialog"; give it a default
      // accessible name so screen readers announce it. Consumers can override
      // via aria-label / aria-labelledby (props spread wins over this default).
      aria-label="More information"
      className={cn("max-w-xs text-sm", className)}
      {...props}
    />
  );
}

export type { ToggleTipProps };
export { ToggleTip, ToggleTipContent, ToggleTipTrigger };
