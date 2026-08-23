"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/Popover/popover";
import type { MessagesFor } from "@/lib/messages";
import { overflowListMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";
import { type CollapseFrom, computeVisibleCount } from "@/runtime/collapse";

/**
 * Width reserved for the overflow trigger before it has been rendered once and measured.
 * Only used for the first collapse decision; refined from the real element immediately after.
 */
const TRIGGER_RESERVE = 48;

interface OverflowListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Items to lay out; those that don't fit collapse into the overflow trigger. */
  items: React.ReactNode[];
  /** "end" (default) hides trailing items; "start" keeps the last items visible (breadcrumb mode). */
  collapseFrom?: CollapseFrom;
  /** Render the overflow trigger. Defaults to a "+N" pill that opens a popover of hidden items. */
  renderOverflow?: (hidden: React.ReactNode[], count: number) => React.ReactNode;
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"overflowList">;
  /** Gap (Tailwind class) between items. */
  gap?: string;
}

/**
 * Renders as many items as fit on one line and collapses the rest into a
 * "+N more" trigger. Re-measures on container resize.
 *
 * Items are mounted exactly once. An earlier implementation measured a duplicate hidden copy
 * of every item, which mounted caller nodes twice: two elements with the same `id`, two of
 * every effect, two network requests from anything that fetched on mount. Instead the first
 * layout pass renders the real items, caches their intrinsic widths, and collapses in the same
 * frame — `useLayoutEffect` runs before paint, so the full row is never seen.
 */
function OverflowList({
  items,
  collapseFrom = "end",
  renderOverflow,
  gap = "gap-1.5",
  messages: messageOverrides,
  className,
  ...props
}: OverflowListProps) {
  const messages = useMessages("overflowList", overflowListMessages, messageOverrides);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rowRef = React.useRef<HTMLDivElement>(null);
  const triggerWidthRef = React.useRef(TRIGGER_RESERVE);
  const [visibleCount, setVisibleCount] = React.useState(items.length);
  const [measurement, setMeasurement] = React.useState<{
    items: React.ReactNode[];
    widths: number[];
  } | null>(null);

  // A new item set has to be measured before it can be collapsed, so that pass renders every
  // item. `items` is a fresh array on each parent render, so this re-measures whenever the
  // caller re-renders — deliberate: item content can change width without the length changing.
  const needsMeasure = measurement?.items !== items;
  const renderCount = needsMeasure ? items.length : visibleCount;

  const recompute = React.useCallback(
    (widths: number[]) => {
      const container = containerRef.current;
      const row = rowRef.current;
      if (!container || !row) return;

      const overflowNode = row.querySelector<HTMLElement>('[data-slot="overflow-list-overflow"]');
      if (overflowNode && overflowNode.offsetWidth > 0) {
        triggerWidthRef.current = overflowNode.offsetWidth;
      }

      const next = computeVisibleCount({
        widths,
        available: container.clientWidth,
        gap: Number.parseFloat(getComputedStyle(row).columnGap) || 0,
        triggerWidth: triggerWidthRef.current,
        collapseFrom,
      });
      setVisibleCount((prev) => (prev === next ? prev : next));
    },
    [collapseFrom],
  );

  React.useLayoutEffect(() => {
    if (needsMeasure) {
      const row = rowRef.current;
      const cells = row
        ? Array.from(row.querySelectorAll<HTMLElement>('[data-slot="overflow-list-item"]'))
        : [];
      setMeasurement({ items, widths: cells.map((cell) => cell.offsetWidth) });
      return;
    }
    recompute(measurement.widths);
  }, [needsMeasure, items, measurement, recompute]);

  // Resize only changes the space available, not the intrinsic item widths, so it recomputes
  // from the cache instead of re-mounting the whole row. ResizeObserver never fires in jsdom.
  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !measurement) return;
    const observer = new ResizeObserver(() => recompute(measurement.widths));
    observer.observe(container);
    return () => observer.disconnect();
  }, [measurement, recompute]);

  const hiddenCount = items.length - renderCount;
  const visible = collapseFrom === "start" ? items.slice(hiddenCount) : items.slice(0, renderCount);
  const hidden = collapseFrom === "start" ? items.slice(0, hiddenCount) : items.slice(renderCount);

  const overflow =
    hiddenCount > 0 ? (
      <div data-slot="overflow-list-overflow" className="shrink-0">
        {renderOverflow ? (
          renderOverflow(hidden, hiddenCount)
        ) : (
          <Popover>
            <PopoverTrigger
              data-slot="overflow-list-trigger"
              className="inline-flex h-6 items-center rounded-full border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/disabled"
              aria-label={messages.showMore(hiddenCount)}
            >
              +{hiddenCount}
            </PopoverTrigger>
            <PopoverContent className="flex max-w-xs flex-wrap gap-1.5">{hidden}</PopoverContent>
          </Popover>
        )}
      </div>
    ) : null;

  return (
    <div
      ref={containerRef}
      data-slot="overflow-list"
      className={cn("relative w-full", className)}
      {...props}
    >
      <div ref={rowRef} className={cn("flex flex-nowrap items-center overflow-hidden", gap)}>
        {collapseFrom === "start" && overflow}
        {visible.map((item, i) => {
          const itemKey = `${collapseFrom === "start" ? hiddenCount + i : i}`;
          return (
            <div key={itemKey} data-slot="overflow-list-item" className="shrink-0">
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
