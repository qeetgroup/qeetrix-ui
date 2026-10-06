"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/Drawer/sheet";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/Resizable/resizable";
import { useControllableState } from "@/hooks/use-controllable-state";
import { useMediaQuery } from "@/hooks/use-media-query";
import { masterDetailMessages } from "@/lib/messages";
import { type Breakpoint, belowWidthQuery } from "@/lib/responsive";
import { cn } from "@/lib/utils";
import { useResolvedDirection } from "@/providers/direction-provider";
import { useMessages } from "@/providers/messages-provider";

/**
 * A pane size. A number is a percentage of the group's width (the documented unit since the
 * component shipped); a string is passed through with its unit — `"18rem"`, `"280px"`, `"40%"` —
 * which is how a list column gets a floor that does not shrink with the window.
 */
type PaneSize = number | string;

interface MasterDetailProps {
  list: React.ReactNode;
  detail: React.ReactNode;
  /** Narrow layouts only: whether the detail sheet is open (controlled). */
  detailOpen?: boolean;
  /** Narrow layouts only: whether the detail sheet starts open (uncontrolled). */
  defaultDetailOpen?: boolean;
  onDetailOpenChange?: (open: boolean) => void;
  /** Accessible title for the narrow-layout detail sheet. */
  detailTitle?: string;
  /** Desktop list pane size. */
  defaultListSize?: PaneSize;
  /** Smallest the list pane may be dragged to. */
  minListSize?: PaneSize;
  /**
   * Largest the list pane may be dragged to, so the detail always keeps room to read. Unset by
   * default (no cap), which is how the split has always behaved.
   */
  maxListSize?: PaneSize;
  /**
   * Viewport breakpoint below which the split becomes a list with the detail in a sheet.
   * `md` (768px) by default; `lg` suits a layout that already gives a sidebar part of the
   * width on a tablet.
   */
  collapseBelow?: Breakpoint;
  className?: string;
}

const paneSize = (size: PaneSize) => (typeof size === "number" ? `${size}%` : size);

/**
 * Responsive list + detail layout: a resizable two-pane split on wide screens, and a list
 * with the detail in a slide-over `Sheet` below `collapseBelow` (Mail, Contacts, Tasks, Logs,
 * People directories, payment ledgers).
 *
 * The panes scroll independently and are clipped to the frame's corners. The detail always
 * sits at the inline *end* — right of the list in LTR, left of it in RTL — so the sheet enters
 * from the side the desktop pane occupies. The desktop split mirrors on its own, because a
 * flex row follows `dir`.
 *
 * Landmarks are the caller's: give the list and the detail their own (`<nav aria-label>`,
 * `<section aria-labelledby>`) — this component draws the frame, it cannot know the content.
 */
function MasterDetail({
  list,
  detail,
  detailOpen,
  defaultDetailOpen = false,
  onDetailOpenChange,
  detailTitle,
  defaultListSize = 32,
  minListSize = 22,
  maxListSize,
  collapseBelow = "md",
  className,
}: MasterDetailProps) {
  const messages = useMessages("masterDetail", masterDetailMessages);
  const narrow = useMediaQuery(belowWidthQuery(collapseBelow));
  const rootRef = React.useRef<HTMLDivElement>(null);
  const direction = useResolvedDirection(rootRef);
  const [open, setOpen] = useControllableState({
    value: detailOpen,
    defaultValue: defaultDetailOpen,
    onChange: onDetailOpenChange,
  });

  if (narrow) {
    return (
      // Collapsed, the list is the whole view, so it scrolls here — it used to overflow the
      // root and could not be scrolled at all below `collapseBelow`.
      <div
        ref={rootRef}
        data-slot="master-detail"
        className={cn("h-full overflow-auto overscroll-contain", className)}
      >
        {list}
        <Sheet open={open} onOpenChange={setOpen}>
          {/* The inline end, resolved from this subtree: a portalled sheet cannot read the
              direction of a provider-only RTL subtree, so a logical side would land LTR there. */}
          <SheetContent
            side={direction === "rtl" ? "left" : "right"}
            className="w-full gap-0 p-0 sm:max-w-md"
          >
            <SheetTitle className="sr-only">{detailTitle ?? messages.detailTitle}</SheetTitle>
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
      className={cn("h-full overflow-hidden rounded-lg border border-border", className)}
    >
      {/* Sizes are strings on purpose: react-resizable-panels reads a bare number as *pixels*,
          so `defaultSize={32}` was a 32-pixel list pane. */}
      <ResizablePanel
        defaultSize={paneSize(defaultListSize)}
        minSize={paneSize(minListSize)}
        maxSize={maxListSize === undefined ? undefined : paneSize(maxListSize)}
        className="overflow-auto overscroll-contain"
      >
        {list}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="overflow-auto overscroll-contain">{detail}</ResizablePanel>
    </ResizablePanelGroup>
  );
}

export type { MasterDetailProps };
export { MasterDetail };
