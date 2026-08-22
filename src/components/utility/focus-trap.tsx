"use client";

import type * as React from "react";
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

export type { UseFocusTrapOptions } from "@/runtime/focus-trap";
export { useFocusTrap } from "@/runtime/focus-trap";
export type { FocusTrapProps };
export { FocusTrap };
