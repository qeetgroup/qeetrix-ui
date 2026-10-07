import { describe, expect, it } from "vitest";

import { COMPONENT, DURATION, EASING, ICON_SIZE, ICON_STROKE } from "@/lib/token-values";

describe("generated token values", () => {
  it("exposes motion and icon constants from authored tokens", () => {
    expect(DURATION.standard).toBe(200);
    expect(EASING.decelerate).toBe("cubic-bezier(0, 0, 0.2, 1)");
    expect(ICON_SIZE.md).toBe(20);
    expect(ICON_STROKE.thin).toBe(1.5);
  });

  it("exposes the component geometry JavaScript positions with", () => {
    expect(COMPONENT.sidebar.width.default).toBe("16rem");
    expect(COMPONENT.tour.cardWidth).toBe("288px");
  });
});
