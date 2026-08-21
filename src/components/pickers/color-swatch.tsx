"use client";

import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const colorSwatchVariants = cva(
  "inline-block rounded-sm border border-border/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      size: {
        xs: "size-4",
        sm: "size-5",
        md: "size-6",
        lg: "size-8",
      },
      selected: {
        true: "ring-2 ring-primary ring-offset-2",
        false: "",
      },
      disabled: {
        true: "opacity-disabled cursor-not-allowed pointer-events-none",
        false: "",
      },
      interactive: {
        true: "cursor-pointer",
        false: "cursor-default",
      },
    },
    defaultVariants: {
      size: "md",
      selected: false,
      disabled: false,
      interactive: false,
    },
  },
);

type ColorSwatchProps = {
  color: string;
  size?: "xs" | "sm" | "md" | "lg";
  label?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
};

function ColorSwatch({
  color,
  size = "md",
  label,
  selected,
  disabled,
  onClick,
  className,
}: ColorSwatchProps) {
  const classes = cn(
    colorSwatchVariants({
      size,
      selected: !!selected,
      disabled: !!disabled,
      interactive: !!onClick,
    }),
    className,
  );

  if (onClick) {
    return (
      <button
        type="button"
        data-slot="color-swatch"
        aria-label={label ?? color}
        aria-pressed={selected}
        disabled={disabled}
        style={{ backgroundColor: color }}
        className={classes}
        onClick={onClick}
      />
    );
  }

  return (
    <span
      role="img"
      data-slot="color-swatch"
      aria-label={label ?? color}
      style={{ backgroundColor: color }}
      className={classes}
    />
  );
}

function ColorSwatchGroup({ className, ...props }: ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="color-swatch-group"
      aria-label="Color swatches"
      className={cn("flex flex-wrap gap-1.5 border-0 p-0 m-0", className)}
      {...props}
    />
  );
}

export type { ColorSwatchProps };
export { ColorSwatch, ColorSwatchGroup, colorSwatchVariants };
