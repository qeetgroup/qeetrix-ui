"use client";

import { XIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface Position {
  x: number;
  y: number;
}

interface UseFloatingWindowOptions {
  defaultPosition?: Position;
}

/** Drag state + handlers for a non-modal floating panel. Spread `dragHandleProps` on the header. */
function useFloatingWindow(options?: UseFloatingWindowOptions) {
  const [position, setPosition] = React.useState<Position>(
    options?.defaultPosition ?? { x: 24, y: 24 },
  );
  const drag = React.useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { ox: position.x, oy: position.y, px: e.clientX, py: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const vw = typeof window !== "undefined" ? window.innerWidth : 9999;
    const vh = typeof window !== "undefined" ? window.innerHeight : 9999;
    const nx = d.ox + (e.clientX - d.px);
    const ny = d.oy + (e.clientY - d.py);
    setPosition({
      x: Math.max(0, Math.min(nx, vw - 80)),
      y: Math.max(0, Math.min(ny, vh - 40)),
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return { position, setPosition, dragHandleProps: { onPointerDown, onPointerMove, onPointerUp } };
}

interface FloatingWindowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  defaultPosition?: Position;
  /** Width in px. */
  width?: number;
}

/**
 * A draggable, non-modal floating panel (`role=dialog`, `aria-modal=false`) — for
 * help overlays, detachable widgets, and in-context tools. Does not trap focus.
 */
function FloatingWindow({
  title,
  open = true,
  onClose,
  defaultPosition,
  width = 320,
  className,
  children,
  ...props
}: FloatingWindowProps) {
  const { position, dragHandleProps } = useFloatingWindow({ defaultPosition });
  const titleId = React.useId();

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal={false}
      aria-labelledby={title ? titleId : undefined}
      data-slot="floating-window"
      className={cn(
        "fixed z-50 flex max-h-[80vh] flex-col rounded-lg border border-border bg-card text-card-foreground shadow-modal",
        className,
      )}
      style={{ left: position.x, top: position.y, width }}
      {...props}
    >
      <div
        data-slot="floating-window-header"
        {...dragHandleProps}
        className="flex cursor-grab touch-none items-center justify-between gap-2 rounded-t-lg border-b border-border bg-muted/50 px-3 py-2 active:cursor-grabbing"
      >
        <span id={titleId} className="truncate text-sm font-medium">
          {title}
        </span>
        {onClose && (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>
      <div data-slot="floating-window-content" className="flex-1 overflow-auto p-3 text-sm">
        {children}
      </div>
    </div>
  );
}

export type { FloatingWindowProps };
export { FloatingWindow, useFloatingWindow };
