"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@/lib/utils";

/**
 * A scroll container with Qeet scrollbars.
 *
 * - **Keyboard.** The viewport is a tab stop whenever it can scroll (Base UI drops it from the
 *   tab order when it cannot), so arrow keys, Page Up/Down and Space scroll it; it shows the
 *   inset Qeet focus ring, because the root clips anything drawn outside it.
 * - **Content.** Children are wrapped in Base UI's `Content` part, which re-measures when the
 *   content itself grows — a list that loads more rows keeps a correct thumb — and lets wide
 *   content (a log line, a table) overflow horizontally.
 * - **Scrollbars.** Always present rather than auto-hidden, so a dense panel never hides the
 *   fact that it scrolls. The thumb is quiet at rest, reaches 3:1 while the area is hovered or
 *   scrolling, and strengthens again under the pointer or while dragged. On touch screens it
 *   appears only while scrolling, as the platform's own scrollbars do. In forced-colours mode
 *   it is `CanvasText`.
 * - **RTL.** The vertical bar sits on the inline end, and horizontal scrolling follows `dir`
 *   (both from Base UI).
 * - **Nesting.** Every state is read from the scrollbar's own attributes, never from an
 *   ancestor group, so a scroll area inside another one responds only to itself.
 */
function ScrollArea({ className, children, ...props }: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] outline-none focus-visible:focus-ring-inset"
      >
        <ScrollAreaPrimitive.Content data-slot="scroll-area-content">
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="vertical" />
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-0.5 select-none",
        "data-[orientation=horizontal]:h-(--qx-component-scroll-area-size) data-[orientation=horizontal]:flex-col",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-(--qx-component-scroll-area-size)",
        // The thumb colour is chosen here, on the scrollbar, where Base UI publishes the
        // state. `data-hovering` (pointer over the area) and `data-scrolling` engage it; the
        // pointer on the bar itself is stacked on `data-hovering` so it out-ranks both.
        "[--qx-scroll-area-thumb:var(--qx-component-scroll-area-thumb)]",
        "data-hovering:[--qx-scroll-area-thumb:var(--qx-component-scroll-area-thumb-hover)] data-scrolling:[--qx-scroll-area-thumb:var(--qx-component-scroll-area-thumb-hover)]",
        "data-hovering:hover:[--qx-scroll-area-thumb:var(--qx-component-scroll-area-thumb-active)]",
        "transition-opacity duration-normal ease-standard pointer-coarse:opacity-0 pointer-coarse:data-scrolling:opacity-100 pointer-coarse:data-scrolling:duration-instant",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className={cn(
          "relative flex-1 rounded-full bg-(--qx-scroll-area-thumb) transition-colors duration-fast ease-standard",
          "active:bg-(--qx-component-scroll-area-thumb-active)",
          "forced-colors:bg-[CanvasText] forced-colors:active:bg-[CanvasText]",
        )}
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
