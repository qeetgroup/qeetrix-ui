"use client";

import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { ChevronDownIcon } from "@qeetrix/icons/icons/chevron-down";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Forced colours: hover and the open trigger paint nothing (the bridge maps the accent fill to
 * Canvas); the current page takes the system selection, `data-[active]:forced-colors-selected` —
 * the library recipe (docs/standards/theming.md § Forced colours).
 *
 * Top-level items. Hover and the open trigger are neutral; the current page — a
 * `NavigationMenuLink` with `active`, which Base UI also announces as `aria-current="page"` — is
 * the quiet Qeet tint the sidebar uses, so "you are here" reads the same in both navigations.
 * `data-[active]` (not the shorter `data-active:`) keeps the tint above `hover:` in specificity.
 */
const navigationMenuTriggerStyle = cva(
  "inline-flex h-(--qx-control-height) w-max items-center justify-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors duration-fast ease-standard hover:bg-accent hover:text-accent-foreground focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-disabled data-disabled:pointer-events-none data-disabled:opacity-disabled data-popup-open:bg-accent data-popup-open:text-accent-foreground data-[active]:bg-brand-subtle data-[active]:text-foreground data-[active]:hover:bg-brand-subtle-hover data-[active]:forced-colors-selected",
);

/**
 * Top navigation / mega-menu. Place `NavigationMenuList` with `NavigationMenuItem`s
 * inside; triggered content renders in a shared floating viewport that morphs
 * between items. Use `navigationMenuTriggerStyle()` for plain links that should
 * match the triggers.
 */
function NavigationMenu({ className, children, ...props }: NavigationMenuPrimitive.Root.Props) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      className={cn("relative flex max-w-max flex-1 items-center justify-center", className)}
      {...props}
    >
      {children}
      <NavigationMenuPrimitive.Portal>
        <NavigationMenuPrimitive.Positioner
          sideOffset={6}
          className="isolate z-(--qx-z-popover) box-border transition-[top,left,right,bottom] duration-normal ease-standard"
        >
          <NavigationMenuPrimitive.Popup
            data-slot="navigation-menu-popup"
            // Never wider than the space the positioner found, so a mega-menu on a phone stays
            // on screen; a real border only where forced colours strip the shadow ring.
            className="relative max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-(--qx-corner-overlay) border border-border bg-popover bg-clip-padding text-popover-foreground shadow-popover transition-[opacity,transform,width,height] duration-normal ease-standard data-open:animate-in data-open:fade-in-0 data-open:zoom-in-97 data-open:ease-enter data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-97 data-closed:ease-exit"
          >
            <NavigationMenuPrimitive.Viewport className="relative h-full w-full" />
          </NavigationMenuPrimitive.Popup>
        </NavigationMenuPrimitive.Positioner>
      </NavigationMenuPrimitive.Portal>
    </NavigationMenuPrimitive.Root>
  );
}

function NavigationMenuList({ className, ...props }: NavigationMenuPrimitive.List.Props) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      className={cn("flex flex-1 list-none items-center justify-center gap-1", className)}
      {...props}
    />
  );
}

function NavigationMenuItem({ className, ...props }: NavigationMenuPrimitive.Item.Props) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      className={cn("relative", className)}
      {...props}
    />
  );
}

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: NavigationMenuPrimitive.Trigger.Props) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon
        className="relative top-px size-3.5 transition-transform duration-normal ease-standard group-data-popup-open:rotate-180"
        aria-hidden
      />
    </NavigationMenuPrimitive.Trigger>
  );
}

function NavigationMenuContent({ className, ...props }: NavigationMenuPrimitive.Content.Props) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        "w-full p-2 transition-opacity duration-normal ease-standard data-ending-style:opacity-0 data-starting-style:opacity-0 sm:w-max",
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuLink({ className, ...props }: NavigationMenuPrimitive.Link.Props) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      className={cn(
        // The offset ring fits inside the content's padding, so one recipe serves a link in
        // the popup and a top-level link styled with `navigationMenuTriggerStyle()`. The
        // current page takes the Qeet tint — the old `bg-accent/disabled` borrowed the
        // *disabled* opacity for a selection. A title-and-description link stacks; a link that
        // leads with an icon lays out in a row, icon beside its label.
        "flex select-none flex-col gap-1 rounded-md p-2 text-sm leading-snug no-underline outline-none has-[>svg]:flex-row has-[>svg]:items-center has-[>svg]:gap-2 [&>svg]:size-4 [&>svg]:shrink-0 transition-colors duration-fast ease-standard hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:focus-ring data-[active]:bg-brand-subtle data-[active]:hover:bg-brand-subtle-hover data-[active]:forced-colors-selected",
        className,
      )}
      {...props}
    />
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
};
