"use client";

import * as React from "react";
import type { Direction } from "@/lib/direction";
import { directionFromDom } from "@/lib/direction";

type Side = "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

const useIsomorphicLayoutEffect =
  typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;

/**
 * Resolve a logical `side` to a physical one before it reaches Base UI's positioner.
 *
 * Base UI reads `inline-start` / `inline-end` from its own DirectionProvider only, so an
 * application that sets `<html dir="rtl">` without one got its popovers, hover cards and tooltips
 * on the LTR side. A provider that declares RTL wins; otherwise the document's direction does.
 * Physical sides pass through untouched.
 *
 * `declared` is the caller's `useDirection()` — passed in rather than read here, because the
 * `internal` layer may not import `providers` (src/contracts/layers.ts).
 *
 * Limitation: an explicitly LTR provider inside an RTL document is read as RTL, because the
 * provider's default and an explicit `"ltr"` are indistinguishable from `useDirection()`.
 *
 * Internal — shared by Popover, HoverCard and Tooltip; not exported from the package.
 */
function usePhysicalSide<S extends Side>(side: S, declared: Direction): S | "left" | "right" {
  const [documentRtl, setDocumentRtl] = React.useState(false);

  useIsomorphicLayoutEffect(() => {
    setDocumentRtl(directionFromDom(document.documentElement) === "rtl");
  }, []);

  if (side !== "inline-start" && side !== "inline-end") return side;
  const rtl = declared === "rtl" || documentRtl;
  if (side === "inline-start") return rtl ? "right" : "left";
  return rtl ? "left" : "right";
}

export { usePhysicalSide };
