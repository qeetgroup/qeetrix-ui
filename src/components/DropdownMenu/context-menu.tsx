"use client";

import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { CheckIcon } from "@qeetrix/icons/icons/check";
import { ChevronRightIcon } from "@qeetrix/icons/icons/chevron-right";
import type * as React from "react";

import { cn } from "@/lib/utils";

// Same item anatomy as DropdownMenu — see the note at the top of dropdown-menu.tsx.

function ContextMenu({ ...props }: ContextMenuPrimitive.Root.Props) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuTrigger({ ...props }: ContextMenuPrimitive.Trigger.Props) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

function ContextMenuGroup({ ...props }: ContextMenuPrimitive.Group.Props) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

function ContextMenuContent({ className, ...props }: ContextMenuPrimitive.Popup.Props) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner className="isolate z-(--qx-z-popover) outline-none">
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          className={cn(
            "z-(--qx-z-popover) max-h-(--available-height) min-w-36 max-w-[min(20rem,var(--available-width))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto overscroll-contain rounded-(--qx-component-menu-corner) border border-(--qx-component-menu-border) bg-(--qx-component-menu-background) bg-clip-padding p-1 text-(--qx-component-menu-foreground) shadow-(--qx-component-menu-elevation) outline-none duration-fast ease-enter data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit data-instant:animate-none",
            className,
          )}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: ContextMenuPrimitive.Item.Props & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/context-menu-item relative flex min-h-(--qx-component-menu-item-height) cursor-default items-center gap-2 rounded-(--qx-component-menu-item-corner) px-2 py-0.5 font-ui text-sm outline-none select-none focus-visible:focus-ring-inset data-highlighted:bg-accent data-highlighted:text-accent-foreground data-inset:ps-8 data-disabled:pointer-events-none data-disabled:opacity-disabled data-[variant=destructive]:text-destructive-text data-[variant=destructive]:data-highlighted:bg-(--qx-component-menu-item-danger-highlight) data-[variant=destructive]:data-highlighted:text-destructive-text data-[variant=destructive]:*:[svg]:text-destructive-text forced-colors:data-disabled:text-[GrayText] data-highlighted:forced-colors-selected [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: ContextMenuPrimitive.CheckboxItem.Props & { inset?: boolean }) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
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
        data-slot="context-menu-checkbox-item-indicator"
      >
        <ContextMenuPrimitive.CheckboxItemIndicator>
          <CheckIcon aria-hidden />
        </ContextMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuRadioGroup({ ...props }: ContextMenuPrimitive.RadioGroup.Props) {
  return <ContextMenuPrimitive.RadioGroup data-slot="context-menu-radio-group" {...props} />;
}

function ContextMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: ContextMenuPrimitive.RadioItem.Props & { inset?: boolean }) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex min-h-(--qx-component-menu-item-height) cursor-default items-center gap-2 rounded-(--qx-component-menu-item-corner) py-0.5 ps-2 pe-8 font-ui text-sm outline-none select-none focus-visible:focus-ring-inset data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[checked]:bg-brand-subtle data-[checked]:data-highlighted:bg-brand-subtle-hover data-inset:ps-8 data-disabled:pointer-events-none data-disabled:opacity-disabled forced-colors:data-disabled:text-[GrayText] data-highlighted:forced-colors-selected [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute inset-e-2 flex size-4 items-center justify-center text-brand forced-colors:text-inherit"
        data-slot="context-menu-radio-item-indicator"
      >
        <ContextMenuPrimitive.RadioItemIndicator>
          <CheckIcon aria-hidden />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: ContextMenuPrimitive.GroupLabel.Props & { inset?: boolean }) {
  return (
    <ContextMenuPrimitive.GroupLabel
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 font-ui text-xs font-medium text-muted-foreground data-inset:ps-8",
        className,
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({ className, ...props }: ContextMenuPrimitive.Separator.Props) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function ContextMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
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

function ContextMenuSub({ ...props }: ContextMenuPrimitive.SubmenuRoot.Props) {
  return <ContextMenuPrimitive.SubmenuRoot data-slot="context-menu-sub" {...props} />;
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: ContextMenuPrimitive.SubmenuTrigger.Props & { inset?: boolean }) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "relative flex min-h-(--qx-component-menu-item-height) cursor-default items-center gap-2 rounded-(--qx-component-menu-item-corner) px-2 py-0.5 font-ui text-sm outline-none select-none focus-visible:focus-ring-inset data-highlighted:bg-accent data-highlighted:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground data-popup-open:forced-colors-selected data-inset:ps-8 data-disabled:pointer-events-none data-disabled:opacity-disabled forced-colors:data-disabled:text-[GrayText] data-highlighted:forced-colors-selected [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon aria-hidden className="ms-auto text-muted-foreground rtl:rotate-180" />
    </ContextMenuPrimitive.SubmenuTrigger>
  );
}

function ContextMenuSubContent({
  className,
  side = "inline-end",
  align = "start",
  sideOffset = 0,
  alignOffset = -5,
  ...props
}: ContextMenuPrimitive.Popup.Props &
  Pick<ContextMenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        className="isolate z-(--qx-z-popover) outline-none"
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
      >
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-sub-content"
          className={cn(
            "z-(--qx-z-popover) max-h-(--available-height) min-w-32 max-w-[min(20rem,var(--available-width))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto overscroll-contain rounded-(--qx-component-menu-corner) border border-(--qx-component-menu-border) bg-(--qx-component-menu-background) bg-clip-padding p-1 text-(--qx-component-menu-foreground) shadow-(--qx-component-menu-elevation) outline-none duration-fast ease-enter data-[side=bottom]:slide-in-from-top-1 data-[side=inline-end]:slide-in-from-start-1 data-[side=inline-start]:slide-in-from-end-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit data-instant:animate-none",
            className,
          )}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
