"use client";

import { GripVerticalIcon } from "lucide-react";
import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizableOrientationContext = React.createContext<"horizontal" | "vertical">("horizontal");

/** Container for resizable panels. Set `orientation` to "horizontal" (default) or "vertical". */
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

/** The draggable divider between two panels. Set `withHandle` for a visible grip. */
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
