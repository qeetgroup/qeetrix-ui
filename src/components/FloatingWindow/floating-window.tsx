"use client";

import { XIcon } from "lucide-react";
import * as React from "react";

import type { MessagesFor } from "@/lib/messages";
import { overlayMessages } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { useMessages } from "@/providers/messages-provider";
import { clampToViewport } from "@/runtime/overlay-position";

interface Position {
  x: number;
  y: number;
}

/**
 * How much of the panel has to stay on screen. Enough for the drag handle and the close
 * button, so a panel dragged towards an edge can always be dragged back.
 */
const KEEP_VISIBLE = 64;

interface UseFloatingWindowOptions {
  defaultPosition?: Position;
  /**
   * The panel being dragged. Its measured size bounds the drag, so a tall or wide panel
   * cannot be pushed past the edge; without it a minimum visible strip is assumed.
   */
  surfaceRef?: React.RefObject<HTMLElement | null>;
}

/** Drag state + handlers for a non-modal floating panel. Spread `dragHandleProps` on the header. */
function useFloatingWindow(options?: UseFloatingWindowOptions) {
  const [position, setPosition] = React.useState<Position>(
    options?.defaultPosition ?? { x: 24, y: 24 },
  );
  const drag = React.useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);
  const surfaceRef = options?.surfaceRef;

  // Clamp against what the panel actually measures. The previous implementation subtracted a
  // literal 80/40px, which let a 400px-wide panel sit almost entirely off screen.
  const clamp = React.useCallback(
    (next: Position): Position => {
      if (typeof window === "undefined") return next;
      const rect = surfaceRef?.current?.getBoundingClientRect();
      return clampToViewport(
        next,
        { width: rect?.width ?? 0, height: rect?.height ?? 0 },
        { width: window.innerWidth, height: window.innerHeight },
        KEEP_VISIBLE,
      );
    },
    [surfaceRef],
  );

  // A panel parked near an edge must not be stranded off screen when the window shrinks.
  React.useEffect(() => {
    function handleResize() {
      setPosition((prev) => {
        const next = clamp(prev);
        return next.x === prev.x && next.y === prev.y ? prev : next;
      });
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { ox: position.x, oy: position.y, px: e.clientX, py: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setPosition(clamp({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }));
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
  /**
   * Overrides for this component's built-in English strings. Each key falls back to the
   * nearest `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"overlay">;
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
  messages: messageOverrides,
  className,
  children,
  ...props
}: FloatingWindowProps) {
  const messages = useMessages("overlay", overlayMessages, messageOverrides);
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const { position, dragHandleProps } = useFloatingWindow({ defaultPosition, surfaceRef });
  const titleId = React.useId();

  if (!open) return null;

  return (
    <div
      ref={surfaceRef}
      role="dialog"
      aria-modal={false}
      aria-labelledby={title ? titleId : undefined}
      data-slot="floating-window"
      className={cn(
        "fixed z-(--qx-z-fixed) flex max-h-[80dvh] flex-col rounded-lg border border-border bg-card text-card-foreground shadow-modal",
        className,
      )}
      style={{ left: position.x, top: position.y, width }}
      {...props}
    >
      <div
        data-slot="floating-window-header"
        {...dragHandleProps}
        className="flex cursor-grab touch-none items-center justify-between gap-2 rounded-t-lg border-b border-border bg-muted/disabled px-3 py-2 active:cursor-grabbing"
      >
        <span id={titleId} className="truncate text-sm font-medium">
          {title}
        </span>
        {onClose && (
          <button
            type="button"
            aria-label={messages.close}
            onClick={onClose}
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/disabled"
          >
            <XIcon aria-hidden className="size-4" />
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
