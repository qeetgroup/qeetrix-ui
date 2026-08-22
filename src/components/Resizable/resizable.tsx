"use client";

import { GripVerticalIcon } from "lucide-react";
import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizableOrientationContext = React.createContext<"horizontal" | "vertical">("horizontal");

/**
 * Container for resizable panels. Set `orientation` to "horizontal" (default) or "vertical".
 *
 * **Sizes are percentages only when spelled as strings.** `react-resizable-panels` reads a bare
 * number as *pixels*: `defaultSize={32}` is 32px, `defaultSize="32"` and `defaultSize="32%"` are
 * 32 percent of the group.
 *
 * **Known RTL limitation, upstream.** Layout mirrors correctly — a flex row follows `dir`, so
 * the first panel sits on the right under `dir="rtl"` — but the *interaction* does not.
 * `react-resizable-panels` maps ArrowLeft to "shrink the first panel" and derives pointer drags
 * from a raw `clientX` delta, neither of which consults direction, so in a horizontal RTL group
 * both the arrow keys and the drag move the divider the wrong way. Fixing it here would mean
 * re-implementing the library's constraint cascade (collapsible panels, min/max propagation)
 * against its imperative `setLayout`, and the result would be unverifiable in this repository:
 * the library throws `Previous layout not found` in jsdom, because it needs a real
 * `ResizeObserver` measurement before it will resize at all. Vertical groups are unaffected —
 * the block axis does not mirror. Tracked as a browser-test gap (`TEST-001`).
 */
function ResizablePanelGroup({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <ResizableOrientationContext.Provider value={orientation}>
      <Group
        data-slot="resizable-panel-group"
        orientation={orientation}
        className={cn("h-full w-full", className)}
        {...props}
      />
    </ResizableOrientationContext.Provider>
  );
}

function ResizablePanel({ className, ...props }: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" className={className} {...props} />;
}

/**
 * The draggable divider between two panels. Set `withHandle` for a visible grip.
 *
 * Renders as `role="separator"` with the *perpendicular* `aria-orientation` — a horizontal
 * group's divider is a vertical separator — plus `aria-controls`, `aria-valuenow` and the
 * value bounds, all supplied by the library. The grip glyph is direction-agnostic: two dotted
 * columns look the same mirrored, so it is rotated only for orientation, never for direction.
 */
function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & { withHandle?: boolean }) {
  const vertical = React.useContext(ResizableOrientationContext) === "vertical";
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "relative flex shrink-0 items-center justify-center bg-border outline-none transition-colors data-[resize-handle-active]:bg-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        vertical ? "h-px w-full" : "w-px",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            "z-10 flex items-center justify-center rounded-sm border bg-background",
            vertical ? "h-3 w-4" : "h-4 w-3",
          )}
        >
          <GripVerticalIcon
            aria-hidden
            className={cn("size-2.5 text-muted-foreground", vertical && "rotate-90")}
          />
        </div>
      )}
    </Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
