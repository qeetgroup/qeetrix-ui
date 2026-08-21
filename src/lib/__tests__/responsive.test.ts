import { describe, expect, it } from "vitest";

import { BREAKPOINTS, belowWidthQuery, minWidthQuery } from "@/lib/responsive";

describe("responsive foundation", () => {
  it("matches the Tailwind v4 default breakpoint ladder", () => {
    expect(BREAKPOINTS).toEqual({ sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 });
  });

  it("creates min-width and below-width queries without overlap", () => {
    expect(minWidthQuery("md")).toBe("(min-width: 768px)");
    expect(belowWidthQuery("md")).toBe("(max-width: 767px)");
  });
});
