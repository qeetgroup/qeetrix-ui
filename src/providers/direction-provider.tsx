"use client";

import {
  DirectionProvider as BaseDirectionProvider,
  useDirection,
} from "@base-ui/react/direction-provider";
import type * as React from "react";

import { cn } from "@/lib/utils";

type Direction = "ltr" | "rtl";

interface DirectionProviderProps extends Omit<React.ComponentProps<"div">, "dir"> {
  /** Reading direction. Defaults to `"ltr"`. */
  direction?: Direction;
}

/**
 * Enables right-to-left layout for a subtree. Wraps Base UI's direction
 * context (so menus, sliders, etc. flip correctly) and renders a wrapper
 * carrying the `dir` attribute, so CSS logical properties and Tailwind `rtl:`
 * variants resolve too. The Qeetrix components already use logical utilities
 * (`ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`), so most flip automatically.
 *
 * For whole-app RTL, also set `dir` on `<html>`; this provider is ideal for
 * scoped regions (a preview, an embedded locale).
 */
function DirectionProvider({
  direction = "ltr",
  className,
  children,
  ...props
}: DirectionProviderProps) {
  return (
    <BaseDirectionProvider direction={direction}>
      <div
        data-slot="direction-provider"
        dir={direction}
        className={cn("contents", className)}
        {...props}
      >
        {children}
      </div>
    </BaseDirectionProvider>
  );
}

export type { Direction, DirectionProviderProps };
export { DirectionProvider, useDirection };
