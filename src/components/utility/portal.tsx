"use client";

import * as React from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: React.ReactNode;
  container?: Element | DocumentFragment | null;
}

/**
 * Renders children into `document.body` (or a custom container) via
 * `React.createPortal`. Utility for overlay patterns not covered by
 * Dialog / Drawer / Sheet.
 *
 * Mounting is deferred to the client to avoid SSR hydration mismatches.
 */
function Portal({ children, container }: PortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, container ?? document.body);
}

export type { PortalProps };
export { Portal };
