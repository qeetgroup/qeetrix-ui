"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/surfaces/popover";
import { cn } from "@/lib/utils";

interface OverflowListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Items to lay out; those that don't fit collapse into the overflow trigger. */
  items: React.ReactNode[];
  /** "end" (default) hides trailing items; "start" keeps the last items visible (breadcrumb mode). */
  collapseFrom?: "start" | "end";
  /** Render the overflow trigger. Defaults to a "+N" pill that opens a popover of hidden items. */
  renderOverflow?: (hidden: React.ReactNode[], count: number) => React.ReactNode;
  /** Gap (Tailwind class) between items. */
  gap?: string;
}

/**
 * Renders as many items as fit on one line and collapses the rest into a
 * "+N more" trigger. Re-measures on container resize.
 */
function OverflowList({
  items,
  collapseFrom = "end",
  renderOverflow,
  gap = "gap-1.5",
  className,
  ...props
}: OverflowListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = React.useState(items.length);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const recompute = () => {
      const available = container.clientWidth;
      const children = Array.from(measure.children) as HTMLElement[];
      if (available === 0 || children.length === 0) {
        setVisibleCount(items.length);
        return;
      }
      // Last child is the overflow trigger template; the rest are items.
      const triggerWidth = children[children.length - 1]?.offsetWidth ?? 0;
      const itemEls = children.slice(0, items.length);
      const gapPx = parseFloat(getComputedStyle(measure).columnGap || "0") || 0;

      let used = 0;
      let count = 0;
      for (let i = 0; i < itemEls.length; i++) {
        const w = itemEls[i].offsetWidth + (count > 0 ? gapPx : 0);
        // Reserve room for the trigger unless everything fits.
        const reserve = i === itemEls.length - 1 ? 0 : triggerWidth + gapPx;
        if (used + w + reserve > available) break;
        used += w;
        count++;
      }
      setVisibleCount(Math.max(0, Math.min(items.length, count)));
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [items]);

  const hiddenCount = items.length - visibleCount;
  const visible =
    collapseFrom === "start" ? items.slice(hiddenCount) : items.slice(0, visibleCount);
  const hidden = collapseFrom === "start" ? items.slice(0, hiddenCount) : items.slice(visibleCount);

  const overflow =
    hiddenCount > 0 ? (
      renderOverflow ? (
        renderOverflow(hidden, hiddenCount)
      ) : (
        <Popover>
          <PopoverTrigger
            data-slot="overflow-list-trigger"
            className="inline-flex h-6 items-center rounded-full border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={`Show ${hiddenCount} more`}
          >
            +{hiddenCount}
          </PopoverTrigger>
          <PopoverContent className="flex max-w-xs flex-wrap gap-1.5">{hidden}</PopoverContent>
        </Popover>
      )
    ) : null;

  return (
    <div
      ref={containerRef}
      data-slot="overflow-list"
      className={cn("relative w-full", className)}
      {...props}
    >
      {/* Hidden measuring row: all items + a trigger template, never shown. */}
      <div
        ref={measureRef}
        aria-hidden
        className={cn("pointer-events-none invisible absolute flex flex-nowrap", gap)}
      >
        {items.map((item, i) => {
          const itemKey = `measure-${i}`;
          return (
            <div key={itemKey} className="shrink-0">
              {item}
            </div>
          );
        })}
        <div className="shrink-0">
          <span className="inline-flex h-6 items-center rounded-full border px-2 text-xs">+99</span>
        </div>
      </div>

      <div className={cn("flex flex-nowrap items-center overflow-hidden", gap)}>
        {collapseFrom === "start" && overflow}
        {visible.map((item, i) => {
          const itemKey = `visible-${i}`;
          return (
            <div key={itemKey} className="shrink-0">
              {item}
            </div>
          );
        })}
        {collapseFrom === "end" && overflow}
      </div>
    </div>
  );
}

export type { OverflowListProps };
export { OverflowList };
