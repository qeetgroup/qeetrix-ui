"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-[color,box-shadow] hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-disabled aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-pressed:bg-accent data-pressed:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border border-transparent bg-transparent",
        outline:
          "border border-input bg-transparent hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50",
      },
      size: {
        default:
          "h-[var(--qx-density-control-height,2rem)] min-w-[var(--qx-density-control-height,2rem)] px-2",
        sm: "h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-1.5",
        lg: "h-9 min-w-9 px-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

function ToggleGroup({ className, ...props }: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      // Base UI sets aria-orientation, which role="group" (its default) doesn't
      // allow. "toolbar" both permits it and matches the roving-tabindex keyboard
      // model Base UI already implements for the group.
      role="toolbar"
      className={cn("group/toggle-group flex w-fit items-center gap-1 rounded-lg", className)}
      {...props}
    />
  );
}

export { Toggle, ToggleGroup, toggleVariants };
