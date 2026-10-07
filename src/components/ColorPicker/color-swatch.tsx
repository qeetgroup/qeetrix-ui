"use client";

import { CheckIcon } from "@qeetrix/icons/icons/check";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";

import { swatchTone } from "@/internal/swatch-tone";
import { colorPickerMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";

/**
 * A colour sample. Selection is never carried by colour alone: a selected swatch shows a check
 * glyph — dark on light colours, white on dark ones, picked by luminance — and a 2px graphite
 * outline offset from the edge. Graphite rather than Ember, because the ring sits next to an
 * arbitrary colour (an orange swatch would swallow an orange ring) and so that it never reads as
 * the Ember focus ring, which replaces it while the swatch is focused.
 *
 * The swatch keeps its own colour under forced colors (`forced-color-adjust: none`) — the colour
 * is the information — and the check and outline still mark the selection.
 */
const colorSwatchVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center rounded-sm border border-foreground/15 outline-none forced-color-adjust-none",
  {
    variants: {
      size: {
        xs: "size-4",
        sm: "size-5",
        md: "size-6",
        lg: "size-8",
      },
      selected: {
        true: "outline-2 outline-offset-2 outline-solid outline-foreground",
        false: "",
      },
      disabled: {
        true: "cursor-not-allowed opacity-disabled",
        false: "",
      },
      interactive: {
        true: "cursor-pointer transition-[scale] duration-fast ease-standard not-disabled:hover:scale-110 focus-visible:focus-ring",
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
  /** Native tooltip text — the hex value, for example, on a swatch whose label is a name. */
  title?: string;
  className?: string;
};

function SwatchCheck({ color }: { color: string }) {
  const tone = swatchTone(color);
  return (
    <CheckIcon
      aria-hidden
      strokeWidth={3}
      data-slot="color-swatch-check"
      className={cn(
        "pointer-events-none size-3/5",
        tone === "dark"
          ? "text-(--qx-component-color-picker-glyph-on-dark)"
          : "text-(--qx-component-color-picker-glyph-on-light)",
        // A colour that cannot be measured gets a halo, so the check reads on anything.
        tone === "unknown" &&
          "drop-shadow-[0_0_1px_var(--qx-component-color-picker-glyph-on-dark)]",
      )}
    />
  );
}

/**
 * A colour sample that can be selected. A selected swatch shows a check glyph and an outline,
 * so the state never relies on colour alone.
 */
function ColorSwatch({
  color,
  size = "md",
  label,
  selected,
  disabled,
  onClick,
  title,
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
        data-selected={selected || undefined}
        aria-label={label ?? color}
        aria-pressed={selected}
        disabled={disabled}
        title={title}
        style={{ backgroundColor: color }}
        className={classes}
        onClick={onClick}
      >
        {selected ? <SwatchCheck color={color} /> : null}
      </button>
    );
  }

  return (
    <span
      role="img"
      data-slot="color-swatch"
      data-selected={selected || undefined}
      aria-label={label ?? color}
      title={title}
      style={{ backgroundColor: color }}
      className={classes}
    >
      {selected ? <SwatchCheck color={color} /> : null}
    </span>
  );
}

function ColorSwatchGroup({ className, ...props }: ComponentProps<"fieldset">) {
  const messages = useMessages("colorPicker", colorPickerMessages);
  return (
    <fieldset
      data-slot="color-swatch-group"
      aria-label={messages.swatches}
      className={cn("m-0 flex flex-wrap gap-1.5 border-0 p-0", className)}
      {...props}
    />
  );
}

export type { ColorSwatchProps };
export { ColorSwatch, ColorSwatchGroup, colorSwatchVariants };
