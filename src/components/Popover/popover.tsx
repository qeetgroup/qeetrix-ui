"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { usePhysicalSide } from "@/internal/use-physical-side";
import { cn } from "@/lib/utils";
import { useDirection } from "@/providers/direction-provider";

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverClose({ ...props }: PopoverPrimitive.Close.Props) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/*
 * The Qeet anchored-overlay surface: the overlay surface colour, a real border (forced-colors
 * mode strips shadows, so a ring drawn with box-shadow left the popover edgeless there), the
 * overlay elevation role and the overlay corner. The popup is bounded by the space Base UI
 * measures on the chosen side, so long content scrolls inside it instead of off the screen.
 */
function PopoverContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  const physicalSide = usePhysicalSide(side, useDirection());
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={physicalSide}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-(--qx-z-popover)"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-(--qx-z-popover) max-h-(--available-height) w-72 max-w-(--available-width) origin-(--transform-origin) overflow-y-auto overscroll-contain rounded-(--qx-component-popover-corner) border border-(--qx-component-popover-border) bg-(--qx-component-popover-background) bg-clip-padding p-4 text-sm text-(--qx-component-popover-foreground) shadow-(--qx-component-popover-elevation) outline-none duration-fast ease-enter data-[side=bottom]:slide-in-from-top-1 data-[side=inline-end]:slide-in-from-start-1 data-[side=inline-start]:slide-in-from-end-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit data-instant:animate-none",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger };
