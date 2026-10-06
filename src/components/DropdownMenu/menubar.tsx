"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { Menubar as MenubarPrimitive } from "@base-ui/react/menubar";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

// Same item anatomy as DropdownMenu — see the note at the top of dropdown-menu.tsx.

/** App menu bar: a horizontal row of menus (File, Edit, View, …). */
function Menubar({ className, ...props }: MenubarPrimitive.Props) {
  return (
    <MenubarPrimitive
      data-slot="menubar"
      className={cn(
        "flex h-(--qx-control-height) items-center gap-0.5 rounded-(--qx-corner-control) border border-border bg-surface p-0.5",
        className,
      )}
      {...props}
    />
  );
}

function MenubarMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="menubar-menu" {...props} />;
}

function MenubarGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="menubar-group" {...props} />;
}

function MenubarTrigger({ className, ...props }: MenuPrimitive.Trigger.Props) {
  return (
    <MenuPrimitive.Trigger
      data-slot="menubar-trigger"
      className={cn(
        // The open menu's trigger keeps the highlight, so the bar shows which menu is showing.
        "flex h-full items-center rounded-(--qx-component-menu-item-corner) px-2 font-ui text-sm font-medium outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:focus-ring-inset data-popup-open:bg-accent data-popup-open:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-disabled data-popup-open:forced-colors-selected",
        className,
      )}
      {...props}
    />
  );
}

function MenubarContent({
  className,
  align = "start",
  alignOffset = -3,
  side = "bottom",
  sideOffset = 6,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-(--qx-z-popover) outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="menubar-content"
          className={cn(
            // `data-instant="group"` is set while moving between open menus along the bar, so
            // switching File → Edit swaps the popup without replaying the entry animation.
            "z-(--qx-z-popover) max-h-(--available-height) min-w-44 max-w-[min(20rem,var(--available-width))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto overscroll-contain rounded-(--qx-component-menu-corner) border border-(--qx-component-menu-border) bg-(--qx-component-menu-background) bg-clip-padding p-1 text-(--qx-component-menu-foreground) shadow-(--qx-component-menu-elevation) outline-none duration-fast ease-enter data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit data-instant:animate-none",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function MenubarItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <MenuPrimitive.Item
      data-slot="menubar-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/menubar-item relative flex min-h-(--qx-component-menu-item-height) cursor-default items-center gap-2 rounded-(--qx-component-menu-item-corner) px-2 py-0.5 font-ui text-sm outline-none select-none focus-visible:focus-ring-inset data-highlighted:bg-accent data-highlighted:text-accent-foreground data-inset:ps-8 data-disabled:pointer-events-none data-disabled:opacity-disabled data-[variant=destructive]:text-destructive-text data-[variant=destructive]:data-highlighted:bg-(--qx-component-menu-item-danger-highlight) data-[variant=destructive]:data-highlighted:text-destructive-text data-[variant=destructive]:*:[svg]:text-destructive-text forced-colors:data-disabled:text-[GrayText] data-highlighted:forced-colors-selected [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function MenubarCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & { inset?: boolean }) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex min-h-(--qx-component-menu-item-height) cursor-default items-center gap-2 rounded-(--qx-component-menu-item-corner) py-0.5 ps-2 pe-8 font-ui text-sm outline-none select-none focus-visible:focus-ring-inset data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[checked]:bg-brand-subtle data-[checked]:data-highlighted:bg-brand-subtle-hover data-inset:ps-8 data-disabled:pointer-events-none data-disabled:opacity-disabled forced-colors:data-disabled:text-[GrayText] data-highlighted:forced-colors-selected [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute inset-e-2 flex size-4 items-center justify-center text-brand forced-colors:text-inherit"
        data-slot="menubar-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon aria-hidden />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function MenubarRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />;
}

function MenubarRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & { inset?: boolean }) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menubar-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex min-h-(--qx-component-menu-item-height) cursor-default items-center gap-2 rounded-(--qx-component-menu-item-corner) py-0.5 ps-2 pe-8 font-ui text-sm outline-none select-none focus-visible:focus-ring-inset data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[checked]:bg-brand-subtle data-[checked]:data-highlighted:bg-brand-subtle-hover data-inset:ps-8 data-disabled:pointer-events-none data-disabled:opacity-disabled forced-colors:data-disabled:text-[GrayText] data-highlighted:forced-colors-selected [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute inset-e-2 flex size-4 items-center justify-center text-brand forced-colors:text-inherit"
        data-slot="menubar-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon aria-hidden />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function MenubarLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & { inset?: boolean }) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menubar-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 font-ui text-xs font-medium text-muted-foreground data-inset:ps-8",
        className,
      )}
      {...props}
    />
  );
}

function MenubarSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="menubar-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function MenubarShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="menubar-shortcut"
      // A shortcut is LTR notation in every language: `plaintext` orders "⌘R" from its own
      // content instead of letting the RTL row turn it into "R⌘", while the span keeps the row's
      // direction so `ms-auto` still pushes it to the inline end.
      className={cn(
        "ms-auto ps-4 font-ui text-xs text-muted-foreground tabular-nums [unicode-bidi:plaintext]",
        className,
      )}
      {...props}
    />
  );
}

function MenubarSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="menubar-sub" {...props} />;
}

function MenubarSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & { inset?: boolean }) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="menubar-sub-trigger"
      data-inset={inset}
      className={cn(
        "relative flex min-h-(--qx-component-menu-item-height) cursor-default items-center gap-2 rounded-(--qx-component-menu-item-corner) px-2 py-0.5 font-ui text-sm outline-none select-none focus-visible:focus-ring-inset data-highlighted:bg-accent data-highlighted:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground data-popup-open:forced-colors-selected data-inset:ps-8 data-disabled:pointer-events-none data-disabled:opacity-disabled forced-colors:data-disabled:text-[GrayText] data-highlighted:forced-colors-selected [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon aria-hidden className="ms-auto text-muted-foreground rtl:rotate-180" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function MenubarSubContent({
  className,
  align = "start",
  alignOffset = -5,
  side = "inline-end",
  sideOffset = 0,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-(--qx-z-popover) outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="menubar-sub-content"
          className={cn(
            "z-(--qx-z-popover) max-h-(--available-height) min-w-32 max-w-[min(20rem,var(--available-width))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto overscroll-contain rounded-(--qx-component-menu-corner) border border-(--qx-component-menu-border) bg-(--qx-component-menu-background) bg-clip-padding p-1 text-(--qx-component-menu-foreground) shadow-(--qx-component-menu-elevation) outline-none duration-fast ease-enter data-[side=bottom]:slide-in-from-top-1 data-[side=inline-end]:slide-in-from-start-1 data-[side=inline-start]:slide-in-from-end-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit data-instant:animate-none",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
