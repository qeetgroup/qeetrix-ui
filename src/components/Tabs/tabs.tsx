"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/** The tab set's props, including the `value` / `defaultValue` / `onValueChange` triple. */
type TabsProps = TabsPrimitive.Root.Props;

/**
 * Switches between panels of related content in one place, in the contained default style or
 * the `line` style for page navigation.
 */
function Tabs({ className, ...props }: TabsProps) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-3 data-[orientation=vertical]:flex-row", className)}
      {...props}
    />
  );
}

/*
 * Two treatments, one selection language.
 *
 * - `default` — contained. A sunken well holds the tabs and the selected one is the raised
 *   surface inside it: a segmented view switch for a card, a toolbar or a panel.
 * - `line` — underline. Tabs sit on a 1px track and the selected one carries a 2px Qeet
 *   indicator (≥3:1); hovering previews a neutral one. Page- and section-level navigation.
 *   Vertical lines put the indicator on the inline-start track, like the sidebar.
 *
 * Horizontal lists scroll rather than overflow their container: arrow keys move focus (and
 * the browser scrolls the focused tab into view), touch and trackpads swipe. Focus rings are
 * inset because the list clips its own overflow.
 */
const tabsListVariants = cva(
  "inline-flex max-w-full items-center text-muted-foreground data-[orientation=horizontal]:no-scrollbar data-[orientation=horizontal]:overflow-x-auto data-[orientation=vertical]:h-fit data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
  {
    variants: {
      variant: {
        default:
          "w-fit gap-1 rounded-lg bg-surface-sunken p-0.75 data-[orientation=horizontal]:h-(--qx-control-height)",
        line: "gap-1 data-[orientation=horizontal]:w-full data-[orientation=horizontal]:border-b data-[orientation=horizontal]:border-border data-[orientation=vertical]:border-s data-[orientation=vertical]:border-border",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const tabsTriggerVariants = cva(
  [
    // No transparent border: forced-colors mode paints one in CanvasText, boxing every tab.
    "relative inline-flex shrink-0 items-center justify-center gap-1.5 px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none",
    "transition-[color,background-color,box-shadow] duration-fast ease-standard",
    "hover:text-foreground focus-visible:focus-ring-inset",
    // Base UI marks a disabled tab with `aria-disabled` + `data-disabled`, never the native
    // attribute, so `disabled:` utilities would never match.
    "data-disabled:pointer-events-none data-disabled:opacity-disabled",
    "data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start data-[orientation=vertical]:text-start",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: [
          "rounded-md data-[orientation=horizontal]:h-full data-[orientation=horizontal]:flex-1 data-[orientation=vertical]:h-(--qx-control-height)",
          // The selected tab is the raised surface in the sunken well — semantic surfaces in
          // both themes, no `dark:` patch. Forced colours drop fills and shadows, so there it
          // takes the system selection (the library recipe, forced-colors-selected).
          "data-[active]:bg-surface-elevated data-[active]:text-foreground data-[active]:shadow-rest",
          "data-[active]:forced-colors-selected",
        ],
        line: [
          "rounded-md data-[orientation=horizontal]:h-[calc(var(--qx-control-height)+var(--spacing)*2)] data-[orientation=horizontal]:px-3 data-[orientation=vertical]:h-(--qx-control-height) data-[orientation=vertical]:ps-3",
          "after:pointer-events-none after:absolute after:rounded-full after:bg-border-strong after:opacity-0 after:transition-opacity after:duration-fast after:ease-standard hover:after:opacity-100",
          "data-[orientation=horizontal]:after:inset-x-0 data-[orientation=horizontal]:after:bottom-0 data-[orientation=horizontal]:after:h-0.5",
          "data-[orientation=vertical]:after:inset-y-1 data-[orientation=vertical]:after:-inset-s-px data-[orientation=vertical]:after:w-0.5",
          "data-[active]:text-foreground data-[active]:after:bg-border-brand data-[active]:after:opacity-100",
          "forced-colors:data-[active]:after:bg-[Highlight]",
        ],
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type TabsVariant = NonNullable<VariantProps<typeof tabsListVariants>["variant"]>;

/** The list's treatment, read by its triggers. */
const TabsVariantContext = React.createContext<TabsVariant>("default");

/** The tab strip's props: Base UI's list props plus the visual `variant`. */
type TabsListProps = TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>;

function TabsList({ className, variant, ...props }: TabsListProps) {
  const resolved: TabsVariant = variant ?? "default";
  return (
    <TabsVariantContext.Provider value={resolved}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={resolved}
        className={cn(tabsListVariants({ variant: resolved }), className)}
        {...props}
      />
    </TabsVariantContext.Provider>
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("min-w-0 flex-1 rounded-md outline-none focus-visible:focus-ring", className)}
      {...props}
    />
  );
}

export type { TabsListProps, TabsProps };
export { Tabs, TabsContent, TabsList, TabsTrigger };
