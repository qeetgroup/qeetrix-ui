"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * A toggle speaks the Button family's interaction language (see button.tsx), with one addition:
 * pressed is *selected*, so it takes the Qeet selected vocabulary — the quiet brand-subtle tint,
 * the label at full foreground, and a border-brand hairline. The tint alone sits at ~1.1:1
 * against the surface; the hairline is ≥3.6:1 on every surface in both themes, so "on" never
 * depends on telling two pale colours apart. Under forced colours pressed takes the system
 * selection, Highlight / HighlightText (`forced-colors-selected`, the library recipe).
 */
const toggleVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 rounded-(--qx-component-button-corner) font-ui text-sm font-medium whitespace-nowrap text-muted-foreground select-none",
    "transition-[color,background-color,border-color,box-shadow] duration-fast ease-standard",
    "hover:bg-surface-interactive-hover hover:text-foreground active:bg-surface-interactive-active",
    "focus-visible:focus-ring",
    "data-pressed:bg-brand-subtle data-pressed:text-foreground data-pressed:inset-ring data-pressed:inset-ring-border-brand data-pressed:hover:bg-brand-subtle-hover data-pressed:active:bg-brand-subtle-active",
    // Forced colours strip the tint and the ring, so pressed paints the system selection. The
    // recipe opts the toggle out of adjustment, which keeps the UA text backplate off the label.
    "data-pressed:forced-colors-selected",
    "disabled:pointer-events-none disabled:opacity-disabled data-disabled:pointer-events-none data-disabled:opacity-disabled",
    "aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: "border border-transparent bg-transparent",
        // Same edge and fill as Button's outline, so a toggle and a button side by side in a
        // toolbar are one family. Pressed, the edge itself turns brand — a light decorative
        // edge becoming a ≥3:1 one is a lightness change, so it needs no second ring.
        outline:
          "border border-(--qx-component-button-outline-border) bg-(--qx-component-button-outline-background) data-pressed:border-border-brand data-pressed:inset-ring-0",
      },
      size: {
        default: "h-(--qx-control-height) min-w-(--qx-control-height) px-2",
        sm: "h-7 min-w-7 rounded-(--qx-component-button-corner-sm) px-1.5",
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
      data-variant={variant}
      data-size={size}
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
      className={cn(
        "group/toggle-group flex w-fit items-center gap-1 rounded-lg data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        className,
      )}
      {...props}
    />
  );
}

export { Toggle, ToggleGroup, toggleVariants };
