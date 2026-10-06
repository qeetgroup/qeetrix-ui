"use client";

import * as React from "react";
import { useFocusTrap } from "@/runtime/focus-trap";

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
 *
 * Containment only: focus is kept inside, pulled back when a script or a removed
 * element sends it out, and restored on deactivation. It does **not** inert the
 * page or lock scroll, so it is not on its own a modal boundary — a pointer or a
 * virtual cursor can still reach the content behind it. Prefer `Dialog`,
 * `AlertDialog` or `Sheet` for anything that claims to be modal.
 *
 * Renders no styling of its own: the trap is behaviour, and the surface it wraps owns the
 * look. A `ref` you pass is merged with the trap's own, so measuring or focusing the container
 * from outside does not switch the trap off.
 */
function FocusTrap({
  active = true,
  restoreFocus = true,
  initialFocusRef,
  children,
  ref,
  ...props
}: FocusTrapProps) {
  const { containerRef } = useFocusTrap(active, { restoreFocus, initialFocusRef });

  const mergedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [containerRef, ref],
  );

  return (
    <div ref={mergedRef} data-slot="focus-trap" {...props}>
      {children}
    </div>
  );
}

export type { UseFocusTrapOptions } from "@/runtime/focus-trap";
export { useFocusTrap } from "@/runtime/focus-trap";
export type { FocusTrapProps };
export { FocusTrap };
