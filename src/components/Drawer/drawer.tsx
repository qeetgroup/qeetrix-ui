"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { XIcon } from "@qeetrix/icons/icons/x";
import { Button } from "@/components/Button/button";
import {
  SheetBody,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/Drawer/sheet";
import type { MessagesFor } from "@/lib/messages";
import { overlayMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/**
 * Drawer is the mobile bottom sheet: anchored to the bottom edge, rounded on top, and
 * dismissed by swiping it down as well as by Escape, the close button or the backdrop.
 *
 * It is built on Base UI's Drawer, which is Dialog plus gestures — so focus containment,
 * inerting and focus return are the Dialog's, and the trigger, title, description and close
 * parts are shared with Sheet. The grab handle is decoration for pointer users; the gesture
 * always has a keyboard and screen-reader equivalent in Escape and the close button.
 *
 * Use Sheet for side panels and for anything that should not move under a finger.
 */
function Drawer({ swipeDirection = "down", ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="drawer" swipeDirection={swipeDirection} {...props} />;
}

const DrawerTrigger = SheetTrigger;
const DrawerClose = SheetClose;
const DrawerHeader = SheetHeader;
const DrawerBody = SheetBody;
const DrawerFooter = SheetFooter;
const DrawerTitle = SheetTitle;
const DrawerDescription = SheetDescription;

type DrawerContentProps = DrawerPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"overlay">;
};

/*
 * Motion follows the finger. While a swipe is in progress Base UI writes the offset to
 * --drawer-swipe-movement-y and the drag progress to --drawer-swipe-progress, and marks the
 * popup `data-swiping`, which turns the transition off so the sheet tracks the pointer exactly.
 * On release the exit duration scales with --drawer-swipe-strength, so a flick leaves quickly
 * and a slow drag settles. Under reduced motion the base stylesheet collapses every transition,
 * which leaves the drag itself intact and makes open, close and release instant.
 */
function DrawerContent({
  className,
  children,
  showCloseButton = true,
  messages: messageOverrides,
  ...props
}: DrawerContentProps) {
  const messages = useMessages("overlay", overlayMessages, messageOverrides);
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop
        // The sheet-overlay slot keeps the forced-colors backdrop rule in styles.css applying.
        data-slot="sheet-overlay"
        className="fixed inset-0 z-(--qx-z-drawer-backdrop) bg-(--qx-component-dialog-scrim) opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-slow ease-enter data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--qx-motion-duration-normal))] data-ending-style:ease-exit data-swiping:duration-0"
      />
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        className="fixed inset-0 z-(--qx-z-drawer) flex items-end justify-center"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            "relative flex max-h-[85dvh] w-full flex-col overflow-y-auto overscroll-contain rounded-t-(--qx-component-dialog-corner) border-t border-(--qx-component-dialog-border) bg-(--qx-component-dialog-background) bg-clip-padding pt-2 pb-[env(safe-area-inset-bottom)] text-sm text-(--qx-component-dialog-foreground) shadow-(--qx-component-dialog-elevation) outline-none translate-y-[calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px))] transition-transform duration-slow ease-enter data-starting-style:translate-y-full data-ending-style:translate-y-full data-ending-style:duration-[calc(var(--drawer-swipe-strength,1)*var(--qx-motion-duration-normal))] data-ending-style:ease-exit data-swiping:duration-0 data-swiping:select-none",
            showCloseButton && "*:data-[slot=sheet-header]:pe-12",
            className,
          )}
          {...props}
        >
          <div
            aria-hidden
            data-slot="drawer-handle"
            className="mx-auto mb-1 h-1 w-10 shrink-0 rounded-full bg-border-strong"
          />
          {children}
          {showCloseButton && (
            <DrawerPrimitive.Close
              data-slot="drawer-close"
              render={
                // Centred on the first line of a DrawerHeader title, below the grab handle.
                <Button variant="ghost" size="icon-sm" className="absolute inset-e-3.5 top-7.5" />
              }
            >
              <XIcon aria-hidden />
              <span className="sr-only">{messages.close}</span>
            </DrawerPrimitive.Close>
          )}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

export type { DrawerContentProps };
export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
};
