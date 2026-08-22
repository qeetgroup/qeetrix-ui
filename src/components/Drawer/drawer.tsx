"use client";

import type * as React from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/Drawer/sheet";
import { cn } from "@/lib/utils";

/**
 * Drawer is a thin, mobile-friendly preset over Sheet: a bottom-anchored
 * sheet with a rounded top and a grab handle. Use Sheet directly for
 * side panels; use Drawer for bottom sheets / mobile action surfaces.
 */
function Drawer({ ...props }: React.ComponentProps<typeof Sheet>) {
  return <Sheet data-slot="drawer" {...props} />;
}

const DrawerTrigger = SheetTrigger;
const DrawerClose = SheetClose;
const DrawerHeader = SheetHeader;
const DrawerFooter = SheetFooter;
const DrawerTitle = SheetTitle;
const DrawerDescription = SheetDescription;

function DrawerContent({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof SheetContent>, "side">) {
  return (
    <SheetContent
      data-slot="drawer-content"
      side="bottom"
      className={cn("max-h-[85dvh] gap-0 rounded-t-xl pt-2", className)}
      {...props}
    >
      <div aria-hidden className="mx-auto mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
      {children}
    </SheetContent>
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
};
