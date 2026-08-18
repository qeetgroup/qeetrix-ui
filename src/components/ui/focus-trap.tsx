"use client";

import * as React from "react";

/**
 * CSS selector that enumerates every natively-focusable element type.
 * Disabled controls and elements with tabindex="-1" are intentionally excluded.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  /** Restore focus to the previously-focused element on deactivation. Defaults to `true`. */
  restoreFocus?: boolean;
  /** Element to focus on activation instead of the first focusable in the container. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Hook that constrains keyboard focus inside a container element.
 *
 * When `active` is `true`:
 * - Focuses `initialFocusRef.current` (if provided) or the first focusable child.
 * - Intercepts `Tab` / `Shift+Tab` to keep focus cycling within the container.
 * - Restores focus to the previously-focused element on cleanup (if `restoreFocus` is `true`).
 *
 * Returns `{ containerRef }` — attach to the wrapping element.
 */
function useFocusTrap(
  active: boolean,
  options: UseFocusTrapOptions = {},
): { containerRef: React.RefObject<HTMLDivElement | null> } {
  const { restoreFocus = true, initialFocusRef } = options;
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // Snapshot the element that held focus before the trap activated.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the trap.
    const focusTarget =
      initialFocusRef?.current ??
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)[0] ??
      null;

    focusTarget?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      // Re-read the (guarded) ref inside the closure so it is narrowed to a
      // non-null HTMLDivElement here. Exclude inert sub-trees from the pool.
      const node = containerRef.current;
      if (!node) return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.closest("[inert]"),
      );

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (restoreFocus && previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [active, restoreFocus, initialFocusRef]);

  return { containerRef };
}

interface FocusTrapProps extends React.ComponentProps<"div"> {
  /** Whether the focus trap is active. Defaults to `true`. */
  active?: boolean;
  /** Restore focus to the element that was focused before activation. Defaults to `true`. */
  restoreFocus?: boolean;
  /** Ref to the element that should receive focus on activation. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

/**
 * Component wrapper around `useFocusTrap`. Renders a `<div>` that contains
 * keyboard focus when `active` is `true`. Intended for custom overlay patterns
 * that cannot use the Base UI Dialog primitive.
 */
function FocusTrap({
  active = true,
  restoreFocus = true,
  initialFocusRef,
  children,
  ...props
}: FocusTrapProps) {
  const { containerRef } = useFocusTrap(active, { restoreFocus, initialFocusRef });

  return (
    <div ref={containerRef} data-slot="focus-trap" {...props}>
      {children}
    </div>
  );
}

export type { FocusTrapProps, UseFocusTrapOptions };
export { FocusTrap, useFocusTrap };
