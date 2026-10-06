"use client";

import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import { usePhysicalSide } from "@/internal/use-physical-side";
import { cn } from "@/lib/utils";
import { useDirection } from "@/providers/direction-provider";

/**
 * Rich preview shown on hover/focus of a trigger (user cards, entity previews).
 *
 * Supplementary by design: hover cards do not open on touch, so anything a user needs in order
 * to act belongs on the page or in a Popover, not only here.
 */
function HoverCard({ ...props }: PreviewCardPrimitive.Root.Props) {
  return <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({ ...props }: PreviewCardPrimitive.Trigger.Props) {
  return <PreviewCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />;
}

function HoverCardContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "center",
  ...props
}: PreviewCardPrimitive.Popup.Props &
  Pick<PreviewCardPrimitive.Positioner.Props, "side" | "sideOffset" | "align">) {
  const physicalSide = usePhysicalSide(side, useDirection());
  return (
    <PreviewCardPrimitive.Portal>
      <PreviewCardPrimitive.Positioner
        side={physicalSide}
        sideOffset={sideOffset}
        align={align}
        className="isolate z-(--qx-z-popover)"
      >
        <PreviewCardPrimitive.Popup
          data-slot="hover-card-content"
          className={cn(
            "z-(--qx-z-popover) max-h-(--available-height) w-64 max-w-(--available-width) origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-(--qx-component-popover-corner) border border-(--qx-component-popover-border) bg-(--qx-component-popover-background) bg-clip-padding p-4 text-sm text-(--qx-component-popover-foreground) shadow-(--qx-component-popover-elevation) outline-none duration-fast ease-enter data-[side=bottom]:slide-in-from-top-1 data-[side=inline-end]:slide-in-from-start-1 data-[side=inline-start]:slide-in-from-end-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit",
            className,
          )}
          {...props}
        />
      </PreviewCardPrimitive.Positioner>
    </PreviewCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
