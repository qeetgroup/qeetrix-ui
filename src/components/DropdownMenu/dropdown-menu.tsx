"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

/*
 * One menu anatomy, shared verbatim by DropdownMenu, ContextMenu and Menubar.
 *
 * Highlight is Base UI's `data-highlighted` (pointer or keyboard), painted with the neutral
 * accent fill; in forced colours it takes the system selection (`forced-colors-selected`, the
 * library recipe — the accent fill itself maps to Canvas there). Keyboard focus adds the
 * Qeet inset focus ring, because a 1.14:1 fill on its own is not a visible focus indicator.
 * Checked items show a Qeet check at the inline end — the only brand colour in a menu.
 * Destructive items read text.danger and highlight with a danger tint built for the overlay
 * surface. Item height follows density through --qx-component-menu-item-height.
 */

/** The menu root's props, including the `open` / `defaultOpen` / `onOpenChange` triple. */
type DropdownMenuProps = MenuPrimitive.Root.Props;

function DropdownMenu({ ...props }: DropdownMenuProps) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
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
          data-slot="dropdown-menu-content"
          className={cn(
            // At least as wide as the trigger and never under 8rem, but sized by its items up to
            // 20rem rather than pinned to the trigger — a narrow "⋯" button no longer squeezes
            // its labels onto two lines.
            "z-(--qx-z-popover) max-h-(--available-height) min-w-[max(var(--anchor-width),8rem)] max-w-[min(20rem,var(--available-width))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto overscroll-contain rounded-(--qx-component-menu-corner) border border-(--qx-component-menu-border) bg-(--qx-component-menu-background) bg-clip-padding p-1 text-(--qx-component-menu-foreground) shadow-(--qx-component-menu-elevation) outline-none duration-fast ease-enter data-[side=bottom]:slide-in-from-top-1 data-[side=inline-end]:slide-in-from-start-1 data-[side=inline-start]:slide-in-from-end-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit data-instant:animate-none",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1.5 font-ui text-xs font-medium text-muted-foreground data-inset:ps-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuItem({
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
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex min-h-(--qx-component-menu-item-height) cursor-default items-center gap-2 rounded-(--qx-component-menu-item-corner) px-2 py-0.5 font-ui text-sm outline-none select-none focus-visible:focus-ring-inset data-highlighted:bg-accent data-highlighted:text-accent-foreground data-inset:ps-8 data-disabled:pointer-events-none data-disabled:opacity-disabled data-[variant=destructive]:text-destructive-text data-[variant=destructive]:data-highlighted:bg-(--qx-component-menu-item-danger-highlight) data-[variant=destructive]:data-highlighted:text-destructive-text data-[variant=destructive]:*:[svg]:text-destructive-text forced-colors:data-disabled:text-[GrayText] data-highlighted:forced-colors-selected [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
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

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -5,
  side = "inline-end",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  // `side` defaults to the logical `"inline-end"`, so Base UI reports
  // `data-side="inline-end"` and the physical `data-[side=right]` variant below never
  // matched — the submenu had no entry animation in either direction. The logical
  // variants are the ones that fire; the physical pair stays for callers who pass one.
  // `alignOffset` lines the submenu's first item up with its trigger: the popup's 1px border
  // plus its 4px inset.
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "min-w-32 data-[side=bottom]:slide-in-from-top-1 data-[side=inline-end]:slide-in-from-start-1 data-[side=inline-start]:slide-in-from-end-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
        className,
      )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
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
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon aria-hidden />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex min-h-(--qx-component-menu-item-height) cursor-default items-center gap-2 rounded-(--qx-component-menu-item-corner) py-0.5 ps-2 pe-8 font-ui text-sm outline-none select-none focus-visible:focus-ring-inset data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[checked]:bg-brand-subtle data-[checked]:data-highlighted:bg-brand-subtle-hover data-inset:ps-8 data-disabled:pointer-events-none data-disabled:opacity-disabled forced-colors:data-disabled:text-[GrayText] data-highlighted:forced-colors-selected [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute inset-e-2 flex size-4 items-center justify-center text-brand forced-colors:text-inherit"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon aria-hidden />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
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

export type { DropdownMenuProps };
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
