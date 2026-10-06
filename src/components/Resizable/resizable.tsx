"use client";

import { GripVerticalIcon } from "lucide-react";
import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizableOrientationContext = React.createContext<"horizontal" | "vertical">("horizontal");

/**
 * Pointer hit area around each divider, in px. The library's default coarse target is 20px;
 * Qeet raises it to 24px so a finger meets WCAG 2.5.8 (target size). The fine-pointer target
 * stays at the library's 10px, which is generous next to a 1px rule. Either can be overridden
 * through `resizeTargetMinimumSize`.
 */
const RESIZE_TARGET_MINIMUM_SIZE = { coarse: 24, fine: 10 } as const;

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
  resizeTargetMinimumSize = RESIZE_TARGET_MINIMUM_SIZE,
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <ResizableOrientationContext.Provider value={orientation}>
      <Group
        data-slot="resizable-panel-group"
        orientation={orientation}
        resizeTargetMinimumSize={resizeTargetMinimumSize}
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
 *
 * States, read from the library's `data-separator` attribute (`inactive` · `hover` · `focus` ·
 * `active` · `disabled`):
 *
 *   - rest     — a 1px decorative rule.
 *   - hover    — a 3px graphite indicator (the control border role, 3:1) over the rule, shown
 *                anywhere in the hit area, not only over the visible pixel: "this can move".
 *   - active   — the indicator turns Qeet (the brand border role, 3:1) while dragging.
 *   - focus    — the Qeet focus ring around the divider; arrow keys resize, Home/End jump.
 *   - disabled — no indicator and no tab stop; the library shows a not-allowed cursor.
 *
 * The indicator is a pseudo-element, so it never changes the divider's 1px box or the panel
 * layout. In forced-colours mode the rule and the indicator use system colours.
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
        "group/resizable-handle relative z-10 flex shrink-0 items-center justify-center bg-border outline-none",
        "focus-visible:focus-ring forced-colors:bg-[CanvasText]",
        "after:pointer-events-none after:absolute after:bg-transparent after:transition-colors after:duration-fast after:ease-standard",
        "data-[separator=hover]:after:bg-control data-[separator=active]:after:bg-border-brand",
        "forced-colors:data-[separator=hover]:after:bg-[Highlight] forced-colors:data-[separator=active]:after:bg-[Highlight]",
        vertical
          ? "h-px w-full after:inset-x-0 after:-inset-y-px"
          : "w-px after:inset-y-0 after:-inset-x-px",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div
          data-slot="resizable-handle-grip"
          className={cn(
            "z-10 flex items-center justify-center rounded-sm border border-border-strong bg-surface text-muted-foreground shadow-xs",
            "transition-colors duration-fast ease-standard",
            "group-data-[separator=hover]/resizable-handle:border-control group-data-[separator=hover]/resizable-handle:text-foreground",
            "group-data-[separator=active]/resizable-handle:border-border-brand group-data-[separator=active]/resizable-handle:text-foreground",
            vertical ? "h-3 w-5" : "h-5 w-3",
          )}
        >
          <GripVerticalIcon aria-hidden className={cn("size-2.5", vertical && "rotate-90")} />
        </div>
      )}
    </Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
