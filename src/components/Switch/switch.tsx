"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

/**
 * An on/off control. The state is carried three ways so it never rests on hue — the Ember track
 * and the control-grey track are nearly the same lightness (1.26:1), so colour alone would not
 * tell them apart:
 *
 * - **position** — the thumb travels to the inline end when on (mirrored under `rtl`);
 * - **lightness** — the thumb inverts from a light disc (off) to a graphite disc (on), 6.7:1 on
 *   the Ember track, ≥3.3:1 on the grey one, in both themes;
 * - **forced colors** — off is an outlined track with a `CanvasText` thumb; on is a `Highlight`
 *   track with a `HighlightText` thumb.
 *
 * Colours come from `--qx-component-switch-*`. The 32×18px control carries a 56×34px pointer
 * target on a pseudo-element, without moving layout.
 */
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent outline-none after:absolute after:-inset-x-3 after:-inset-y-2",
        "transition-[background-color,border-color] duration-fast ease-standard",
        "data-[size=default]:h-(--qx-component-switch-thumb-size) data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6",
        "data-unchecked:bg-(--qx-component-switch-track) data-checked:bg-(--qx-component-switch-track-checked)",
        "data-checked:not-data-disabled:not-data-readonly:hover:bg-(--qx-component-switch-track-checked-hover)",
        "focus-visible:focus-ring",
        "aria-invalid:border-(--qx-component-input-border-invalid) aria-invalid:focus-visible:outline-(--qx-component-input-border-invalid)",
        "data-readonly:cursor-default",
        "data-disabled:cursor-not-allowed data-disabled:opacity-disabled",
        "forced-colors:border-[CanvasText] forced-colors:data-unchecked:bg-[Canvas] forced-colors:data-checked:border-[Highlight] forced-colors:data-checked:bg-[Highlight] forced-colors:data-disabled:border-[GrayText]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full shadow-xs ring-0",
          "transition-[translate,background-color] duration-fast ease-standard",
          "bg-(--qx-component-switch-thumb) data-checked:bg-(--qx-component-switch-thumb-checked)",
          "group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3",
          "group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)]",
          "rtl:group-data-[size=default]/switch:data-checked:-translate-x-[calc(100%-2px)] rtl:group-data-[size=sm]/switch:data-checked:-translate-x-[calc(100%-2px)]",
          "data-unchecked:translate-x-0",
          "forced-colors:bg-[CanvasText] forced-colors:data-checked:bg-[HighlightText] forced-colors:data-disabled:bg-[GrayText]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
