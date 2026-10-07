"use client";

import { MoveIcon } from "@qeetrix/icons/icons/move";
import { XIcon } from "@qeetrix/icons/icons/x";
import * as React from "react";

import { Button } from "@/components/Button/button";
import type { MessagesFor } from "@/lib/messages";
import { floatingWindowMessages, overlayMessages } from "@/lib/messages";
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

/**
 * A press on one of these inside the drag handle is that control's, not a drag. Without the
 * guard, pressing the close button started a drag and captured the pointer on the header, and a
 * captured pointer can retarget the button's click.
 */
const NOT_A_DRAG_HANDLE = "button, a[href], input, select, textarea, [contenteditable='true']";

/** The move handle is a button, but pressing it with a pointer is exactly a drag. */
const MOVE_HANDLE = '[data-slot="floating-window-move"]';

/**
 * Keyboard move steps, in px: an arrow key moves the panel one step, Shift + arrow a large one.
 * Arrows are physical in every direction, as the panel's position is: ArrowLeft moves it left on
 * screen in an RTL document too.
 */
const KEYBOARD_STEP = 8;
const KEYBOARD_STEP_LARGE = 40;

const ARROW_DELTAS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

interface UseFloatingWindowOptions {
  defaultPosition?: Position;
  /**
   * The panel being dragged. Its measured size bounds the drag, so a tall or wide panel
   * cannot be pushed past the edge; without it a minimum visible strip is assumed.
   */
  surfaceRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Drag state + handlers for a non-modal floating panel. Spread `dragHandleProps` on the header
 * and `moveHandleProps` on a focusable move handle, so the panel moves from the keyboard as well
 * as with a pointer (WCAG 2.1.1). `moveBy` is the same clamped move, for a custom control.
 */
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

  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    const target = e.currentTarget as HTMLElement;
    if (target.hasPointerCapture?.(e.pointerId)) target.releasePointerCapture(e.pointerId);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Primary button, touch contact or pen tip only: a right-click opens the context menu and a
    // middle-click autoscrolls, and neither should pick the panel up.
    if (e.button !== 0) return;
    const control = (e.target as Element).closest?.(NOT_A_DRAG_HANDLE);
    if (control && !control.matches(MOVE_HANDLE)) return;
    drag.current = { ox: position.x, oy: position.y, px: e.clientX, py: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setPosition(clamp({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }));
  };

  const moveBy = React.useCallback(
    (dx: number, dy: number) => setPosition((prev) => clamp({ x: prev.x + dx, y: prev.y + dy })),
    [clamp],
  );

  const onMoveKeyDown = (e: React.KeyboardEvent) => {
    const delta = ARROW_DELTAS[e.key];
    if (!delta || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
    moveBy(delta[0] * step, delta[1] * step);
  };

  return {
    position,
    setPosition,
    moveBy,
    moveHandleProps: { onKeyDown: onMoveKeyDown },
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      // A drag the browser takes over (a scroll gesture, a system dialog, the pointer leaving
      // the window) ends with pointercancel rather than pointerup; without these the panel
      // stayed glued to the pointer.
      onPointerCancel: endDrag,
      onLostPointerCapture: () => {
        drag.current = null;
      },
    },
  };
}

/* ── Layering ────────────────────────────────────────────────────────────────────────────
 * Several floating windows share one layer (--qx-z-fixed). The one the user last pressed or
 * focused is raised one step above the others, like a desktop window, and carries the deeper
 * modal elevation; the rest sit at the popover elevation. A single module-level slot read
 * through useSyncExternalStore re-renders only the two windows whose state changes.
 */
let frontWindow: object | null = null;
const frontListeners = new Set<() => void>();

function bringToFront(id: object) {
  if (frontWindow === id) return;
  frontWindow = id;
  for (const listener of frontListeners) listener();
}

function releaseFront(id: object) {
  if (frontWindow !== id) return;
  frontWindow = null;
  for (const listener of frontListeners) listener();
}

function subscribeFront(listener: () => void) {
  frontListeners.add(listener);
  return () => {
    frontListeners.delete(listener);
  };
}

function useIsFrontWindow(id: object, open: boolean) {
  React.useEffect(() => {
    if (!open) return;
    // A window that opens comes to the front; one that closes gives the slot up.
    bringToFront(id);
    return () => releaseFront(id);
  }, [id, open]);
  return React.useSyncExternalStore(
    subscribeFront,
    () => frontWindow === id,
    () => false,
  );
}

interface FloatingWindowProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  defaultPosition?: Position;
  /** Width in px. */
  width?: number;
  /**
   * Let the user resize the panel from its corner (CSS `resize`). Off by default. The browser's
   * resize grip is pointer-only, so keep the default size usable on its own.
   */
  resizable?: boolean;
  /**
   * Overrides for this component's built-in English strings — the close button (`overlay`
   * group) and the move handle (`floatingWindow` group). Each key falls back to the nearest
   * `MessagesProvider`, then to the default — see `@qeetrix/ui/providers`.
   */
  messages?: MessagesFor<"overlay"> & MessagesFor<"floatingWindow">;
}

/**
 * A draggable, non-modal floating panel (`role=dialog`, `aria-modal=false`) — for
 * help overlays, detachable widgets, and in-context tools. Does not trap focus.
 *
 * Escape closes it while focus is inside (when `onClose` is given). Pressing or focusing a
 * window brings it in front of the other floating windows. Dragging is by the header with any
 * pointer; from the keyboard, the move handle at the start of the title bar takes the arrow
 * keys (Shift for larger steps). The panel always stays at least partly on screen.
 */
function FloatingWindow({
  title,
  open = true,
  onClose,
  defaultPosition,
  width = 320,
  resizable = false,
  messages: messageOverrides,
  className,
  children,
  style,
  onKeyDown,
  onPointerDownCapture,
  onFocusCapture,
  ...props
}: FloatingWindowProps) {
  const messages = useMessages("overlay", overlayMessages, messageOverrides);
  const moveMessages = useMessages("floatingWindow", floatingWindowMessages, messageOverrides);
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const { position, dragHandleProps, moveHandleProps } = useFloatingWindow({
    defaultPosition,
    surfaceRef,
  });
  const titleId = React.useId();
  const moveHintId = React.useId();
  const [layerId] = React.useState(() => ({}));
  const isFront = useIsFrontWindow(layerId, open);

  if (!open) return null;

  return (
    <div
      ref={surfaceRef}
      role="dialog"
      aria-modal={false}
      aria-labelledby={title ? titleId : undefined}
      data-slot="floating-window"
      data-active={isFront || undefined}
      className={cn(
        "fixed z-(--qx-z-fixed) flex max-h-[80dvh] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-(--qx-corner-overlay) border border-border bg-popover text-popover-foreground shadow-popover transition-shadow duration-fast ease-standard data-[active]:z-[calc(var(--qx-z-fixed)+1)] data-[active]:shadow-modal",
        resizable && "min-h-24 min-w-48 resize",
        className,
      )}
      style={{ left: position.x, top: position.y, width, ...style }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== "Escape" || !onClose) return;
        event.preventDefault();
        onClose();
      }}
      onPointerDownCapture={(event) => {
        onPointerDownCapture?.(event);
        bringToFront(layerId);
      }}
      onFocusCapture={(event) => {
        onFocusCapture?.(event);
        bringToFront(layerId);
      }}
      {...props}
    >
      <div
        data-slot="floating-window-header"
        {...dragHandleProps}
        className="flex shrink-0 cursor-grab touch-none items-center gap-1.5 border-b border-border bg-surface-subtle py-1.5 ps-1.5 pe-1.5 select-none active:cursor-grabbing"
      >
        <Button
          data-slot="floating-window-move"
          variant="ghost"
          size="icon-xs"
          aria-label={moveMessages.move}
          aria-describedby={moveHintId}
          {...moveHandleProps}
          className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
        >
          <MoveIcon aria-hidden />
        </Button>
        <span id={moveHintId} hidden>
          {moveMessages.moveHint}
        </span>
        <span id={titleId} className="min-w-0 flex-1 truncate font-ui text-sm font-medium">
          {title}
        </span>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={messages.close}
            onClick={onClose}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <XIcon aria-hidden />
          </Button>
        )}
      </div>
      <div
        data-slot="floating-window-content"
        className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 text-sm"
      >
        {children}
      </div>
    </div>
  );
}

export type { FloatingWindowProps };
export { FloatingWindow, useFloatingWindow };
