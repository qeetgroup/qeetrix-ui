"use client";

import type * as React from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/layout/resizable";
import { Sheet, SheetContent, SheetTitle } from "@/components/surfaces/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MasterDetailProps {
  list: React.ReactNode;
  detail: React.ReactNode;
  /** Mobile only: whether the detail sheet is open. */
  detailOpen?: boolean;
  onDetailOpenChange?: (open: boolean) => void;
  /** Accessible title for the mobile detail sheet. */
  detailTitle?: string;
  /** Desktop list pane size (% of width). */
  defaultListSize?: number;
  minListSize?: number;
  className?: string;
}

/**
 * Responsive list + detail layout: a resizable two-pane split on desktop, and a
 * list with the detail in a slide-over `Sheet` on mobile (Mail, Contacts, Tasks, Logs).
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

  if (isMobile) {
    return (
      <div data-slot="master-detail" className={cn("h-full", className)}>
        {list}
        <Sheet open={detailOpen} onOpenChange={onDetailOpenChange}>
          <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
            <SheetTitle className="sr-only">{detailTitle}</SheetTitle>
            <div className="flex-1 overflow-auto">{detail}</div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      data-slot="master-detail"
      className={cn("h-full rounded-lg border border-border", className)}
    >
      <ResizablePanel defaultSize={defaultListSize} minSize={minListSize} className="overflow-auto">
        {list}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="overflow-auto">{detail}</ResizablePanel>
    </ResizablePanelGroup>
  );
}

export type { MasterDetailProps };
export { MasterDetail };
