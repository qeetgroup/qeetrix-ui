"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { belowWidthQuery } from "@/lib/responsive";

export function useIsMobile() {
  return useMediaQuery(belowWidthQuery("md"));
}
