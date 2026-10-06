"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/Button/button";
import type { MessagesFor } from "@/lib/messages";
import { overlayMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/**
 * The edge a sheet is attached to.
 *
 * `top` / `right` / `bottom` / `left` are physical and stay put in every writing direction —
 * MasterDetail and Sidebar rely on that and choose the side themselves. `inline-start` /
 * `inline-end` follow the reading direction: an `inline-end` details panel is on the right in
 * English and on the left in Arabic, with its border and its entry motion mirrored to match.
 */
type SheetSide = "top" | "right" | "bottom" | "left" | "inline-start" | "inline-end";

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      // Rendered when nested too, and lifted onto the drawer layer then, so a sheet opened from
      // a sheet dims its parent instead of sitting under the parent's own popup.
      forceRender
      className={cn(
        "fixed inset-0 z-(--qx-z-drawer-backdrop) bg-(--qx-component-dialog-scrim) transition-opacity duration-normal ease-standard has-[~[data-nested]]:z-(--qx-z-drawer) data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-fast",
        className,
      )}
      {...props}
    />
  );
}

/*
 * Each side owns its placement, its inner-edge border and its entry offset. Physical sides use
 * physical utilities throughout — a `right` sheet's inner edge is its left edge in every
 * direction, which is why it is `border-l` and not `border-s` (`border-s` put the line against
 * the viewport edge in RTL). Logical sides use logical placement and borders, and mirror the
 * entry offset with `:dir(rtl)`, which reads the element's real direction rather than any
 * ancestor `dir` attribute. The previous `rtl:…:--translate-x-10` was not a class at all.
 */
const SIDE_CLASSES =
  "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:pt-[env(safe-area-inset-top)] data-[side=top]:data-starting-style:-translate-y-10 data-[side=top]:data-ending-style:-translate-y-10 " +
  "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:pb-[env(safe-area-inset-bottom)] data-[side=bottom]:data-starting-style:translate-y-10 data-[side=bottom]:data-ending-style:translate-y-10 " +
  "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:sm:max-w-sm data-[side=left]:data-starting-style:-translate-x-10 data-[side=left]:data-ending-style:-translate-x-10 " +
  "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:sm:max-w-sm data-[side=right]:data-starting-style:translate-x-10 data-[side=right]:data-ending-style:translate-x-10 " +
  "data-[side=inline-start]:inset-y-0 data-[side=inline-start]:inset-s-0 data-[side=inline-start]:h-full data-[side=inline-start]:w-3/4 data-[side=inline-start]:border-e data-[side=inline-start]:sm:max-w-sm data-[side=inline-start]:data-starting-style:-translate-x-10 data-[side=inline-start]:data-ending-style:-translate-x-10 [&:dir(rtl)]:data-[side=inline-start]:data-starting-style:translate-x-10 [&:dir(rtl)]:data-[side=inline-start]:data-ending-style:translate-x-10 " +
  "data-[side=inline-end]:inset-y-0 data-[side=inline-end]:inset-e-0 data-[side=inline-end]:h-full data-[side=inline-end]:w-3/4 data-[side=inline-end]:border-s data-[side=inline-end]:sm:max-w-sm data-[side=inline-end]:data-starting-style:translate-x-10 data-[side=inline-end]:data-ending-style:translate-x-10 [&:dir(rtl)]:data-[side=inline-end]:data-starting-style:-translate-x-10 [&:dir(rtl)]:data-[side=inline-end]:data-ending-style:-translate-x-10";

type SheetContentProps = SheetPrimitive.Popup.Props & {
  side?: SheetSide;
  showCloseButton?: boolean;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"overlay">;
};

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  messages: messageOverrides,
  ...props
}: SheetContentProps) {
  const messages = useMessages("overlay", overlayMessages, messageOverrides);
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-(--qx-z-drawer) flex max-h-dvh flex-col gap-4 overflow-y-auto overscroll-contain border-(--qx-component-dialog-border) bg-(--qx-component-dialog-background) bg-clip-padding text-sm text-(--qx-component-dialog-foreground) shadow-(--qx-component-dialog-elevation) transition-[opacity,translate] duration-normal ease-enter data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-fast data-ending-style:ease-exit",
          SIDE_CLASSES,
          showCloseButton && "*:data-[slot=sheet-header]:pe-12",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button variant="ghost" size="icon-sm" className="absolute inset-e-3.5 top-3.5" />
            }
          >
            <XIcon aria-hidden />
            <span className="sr-only">{messages.close}</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sheet-header" className={cn("flex flex-col gap-1 p-4", className)} {...props} />
  );
}

/**
 * The scrolling region of a sheet. Wrap long content in it and the header and footer stay
 * pinned; without it the whole sheet scrolls, which is still bounded to the viewport.
 */
function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("-my-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-1", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-heading font-semibold tracking-(--qx-typography-heading-letter-spacing) text-pretty text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-pretty text-muted-foreground", className)}
      {...props}
    />
  );
}

export type { SheetContentProps, SheetSide };
export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
