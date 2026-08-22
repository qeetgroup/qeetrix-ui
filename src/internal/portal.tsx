"use client";

import * as React from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: React.ReactNode;
  container?: Element | DocumentFragment | null;
}

/**
 * Renders children into `document.body` (or a custom container) via `React.createPortal`.
 *
 * A `primitive`: it renders, but it makes no design decision — there is nothing to theme, size
 * or space. Mounting is deferred to the client to avoid SSR hydration mismatches.
 *
 * @see docs/architecture/component-layers.md
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
