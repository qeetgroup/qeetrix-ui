"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { usePhysicalSide } from "@/internal/use-physical-side";
import { cn } from "@/lib/utils";
import { useDirection } from "@/providers/direction-provider";

/**
 * Shared delay for a group of tooltips. Once one is open its neighbours open instantly, so a
 * pointer sweeping across a toolbar does not wait at every button — but nothing flashes up
 * merely because the pointer passed over it.
 */
function TooltipProvider({ delay = 400, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}

/**
 * A short label that appears on hover or keyboard focus to name or describe a control.
 */
function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/*
 * A tooltip is a short visual label, not a mini card: an inverse chip, caption type, no shadow
 * and no title. It never holds interactive content, and it is never the only place information
 * lives — touch devices do not show it, so name the trigger with `aria-label` as well.
 *
 * The transparent border is invisible in both themes and becomes the tooltip's edge in
 * forced-colors mode, where the background is replaced and there is no shadow to fall back on.
 * `data-instant` (focus-open, grouped re-open, dismissal) skips the entry animation.
 */
function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  const physicalSide = usePhysicalSide(side, useDirection());
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={physicalSide}
        sideOffset={sideOffset}
        className="isolate z-(--qx-z-popover)"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-(--qx-z-popover) inline-flex w-fit max-w-64 origin-(--transform-origin) items-center gap-1.5 rounded-(--qx-component-tooltip-corner) border border-transparent bg-(--qx-component-tooltip-background) px-2 py-1 font-ui text-caption text-balance text-(--qx-component-tooltip-foreground) duration-fast ease-enter has-data-[slot=kbd]:pe-1 data-[side=bottom]:slide-in-from-top-[2px] data-[side=inline-end]:slide-in-from-start-[2px] data-[side=inline-start]:slide-in-from-end-[2px] data-[side=left]:slide-in-from-right-[2px] data-[side=right]:slide-in-from-left-[2px] data-[side=top]:slide-in-from-bottom-[2px] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit data-instant:animate-none **:data-[slot=kbd]:border-transparent **:data-[slot=kbd]:bg-(--qx-component-tooltip-foreground)/15 **:data-[slot=kbd]:text-(--qx-component-tooltip-foreground)",
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="z-(--qx-z-popover) size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-(--qx-corner-xs) bg-(--qx-component-tooltip-background) fill-(--qx-component-tooltip-background) data-[side=bottom]:top-1 data-[side=inline-end]:-start-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:-end-1 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
