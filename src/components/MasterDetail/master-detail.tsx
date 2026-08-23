"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/Drawer/sheet";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/Resizable/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useResolvedDirection } from "@/providers/direction-provider";

interface MasterDetailProps {
  list: React.ReactNode;
  detail: React.ReactNode;
  /** Mobile only: whether the detail sheet is open. */
  detailOpen?: boolean;
  onDetailOpenChange?: (open: boolean) => void;
  /** Accessible title for the mobile detail sheet. */
  detailTitle?: string;
  /** Desktop list pane size, as a percentage of the group's width. */
  defaultListSize?: number;
  /** Smallest the list pane may be dragged to, as a percentage of the group's width. */
  minListSize?: number;
  className?: string;
}

/**
 * Responsive list + detail layout: a resizable two-pane split on desktop, and a
 * list with the detail in a slide-over `Sheet` on mobile (Mail, Contacts, Tasks, Logs).
 *
 * The detail always sits at the inline *end* — right of the list in LTR, left of it in
 * RTL — so the mobile sheet enters from the side the desktop pane occupies. The desktop
 * split mirrors on its own, because a flex row follows `dir`.
 */
function MasterDetail({
  list,
  detail,
  detailOpen,
  onDetailOpenChange,
  detailTitle = "Details",
  defaultListSize = 32,
  minListSize = 22,
  className,
}: MasterDetailProps) {
  const isMobile = useIsMobile();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const direction = useResolvedDirection(rootRef);

  if (isMobile) {
    return (
      <div ref={rootRef} data-slot="master-detail" className={cn("h-full", className)}>
        {list}
        <Sheet open={detailOpen} onOpenChange={onDetailOpenChange}>
          {/* Sheet takes physical sides only, so the inline end is resolved here. */}
          <SheetContent
            side={direction === "rtl" ? "left" : "right"}
            className="w-full gap-0 p-0 sm:max-w-md"
          >
            <SheetTitle className="sr-only">{detailTitle}</SheetTitle>
            <div className="flex-1 overflow-auto">{detail}</div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      elementRef={rootRef}
      data-slot="master-detail"
      className={cn("h-full rounded-lg border border-border", className)}
    >
      {/* Percent, spelled as a string on purpose: react-resizable-panels reads a bare
          number as *pixels*, so `defaultSize={32}` was a 32-pixel list pane. */}
      <ResizablePanel
        defaultSize={`${defaultListSize}%`}
        minSize={`${minListSize}%`}
        className="overflow-auto"
      >
        {list}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="overflow-auto">{detail}</ResizablePanel>
    </ResizablePanelGroup>
  );
}

export type { MasterDetailProps };
export { MasterDetail };
