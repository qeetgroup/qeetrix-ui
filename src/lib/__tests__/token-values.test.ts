import { describe, expect, it } from "vitest";

import {
  CHART_COLOR,
  COMPONENT,
  DURATION,
  EASING,
  ICON_SIZE,
  ICON_STROKE,
  SHADOW,
  STATE_OPACITY,
  Z_INDEX,
} from "@/lib/token-values";

describe("generated token values", () => {
  it("exposes motion and icon constants from authored tokens", () => {
    expect(DURATION.standard).toBe(200);
    expect(EASING.decelerate).toBe("cubic-bezier(0, 0, 0.2, 1)");
    expect(ICON_SIZE.md).toBe(20);
    expect(ICON_STROKE.thin).toBe(1.5);
  });

  it("exposes semantic layer and component values", () => {
    expect(Z_INDEX.toast).toBe(1800);
    expect(Z_INDEX.tour).toBeGreaterThan(Z_INDEX.tourBackdrop);
    expect(Z_INDEX.skipNav).toBeGreaterThan(Z_INDEX.tour);
    expect(STATE_OPACITY.disabled).toBe(0.5);
    expect(COMPONENT.sidebar.width.default).toBe("16rem");
    expect(COMPONENT.tour.cardWidth).toBe("288px");
    expect(SHADOW.insetSubtle).toContain("inset");
  });

  it("exposes eight series and semantic chart CSS references", () => {
    expect(Object.keys(CHART_COLOR).filter((key) => key.startsWith("series"))).toHaveLength(8);
    expect(CHART_COLOR.series1).toBe("var(--chart-1)");
    expect(CHART_COLOR.grid).toBe("var(--chart-grid)");
    expect(CHART_COLOR.negative).toBe("var(--chart-negative)");
  });
});
