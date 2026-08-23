"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

/** The tab set's props, including the `value` / `defaultValue` / `onValueChange` triple. */
type TabsProps = TabsPrimitive.Root.Props;

function Tabs({ className, ...props }: TabsProps) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-3 data-[orientation=vertical]:flex-row", className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-(--qx-control-height) w-fit items-center justify-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground data-[orientation=vertical]:h-fit data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[min(var(--radius-md),10px)] border border-transparent px-2.5 py-1 text-sm font-medium whitespace-nowrap text-foreground outline-none transition-[color,box-shadow] hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/disabled disabled:pointer-events-none disabled:opacity-disabled data-active:bg-background data-active:shadow-sm dark:text-muted-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        "flex-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/disabled",
        className,
      )}
      {...props}
    />
  );
}

export type { TabsProps };
export { Tabs, TabsContent, TabsList, TabsTrigger };
