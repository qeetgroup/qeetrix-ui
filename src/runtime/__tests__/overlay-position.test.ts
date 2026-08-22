// @vitest-environment node
//
// Placement arithmetic, tested with real numbers. jsdom reports every box as zero-sized, so a
// rendered assertion cannot see a flip or a clamp — the decisions only exist in this module.

import { describe, expect, it } from "vitest";

import { clampToViewport, resolveAnchoredPosition } from "@/runtime/overlay-position";

const viewport = { width: 1000, height: 800 };
const size = { width: 320, height: 200 };
const base = { size, viewport, offset: 12, margin: 8 } as const;

describe("resolveAnchoredPosition", () => {
  it("places the surface below the anchor and centres it horizontally", () => {
    const { top, left, side } = resolveAnchoredPosition({
      ...base,
      anchor: { top: 100, left: 400, width: 100, height: 40 },
      side: "bottom",
    });
    expect(side).toBe("bottom");
    expect(top).toBe(152); // 100 + 40 + 12
    expect(left).toBe(290); // 400 + 50 - 160
  });

  it("flips to the opposite side when the requested side has no room", () => {
    // 60px of viewport left below the anchor, but 700px above it.
    const { top, side } = resolveAnchoredPosition({
      ...base,
      anchor: { top: 720, left: 400, width: 100, height: 20 },
      side: "bottom",
    });
    expect(side).toBe("top");
    expect(top).toBe(508); // 720 - 200 - 12
  });

  it("keeps the requested side when the opposite one is no better", () => {
    // A near-full-height anchor: neither side fits the surface, and above is worse than below,
    // so flipping would only make it harder to reach. The request stands and the clamp copes.
    const { side, top } = resolveAnchoredPosition({
      ...base,
      anchor: { top: 0, left: 400, width: 100, height: 780 },
      side: "bottom",
    });
    expect(side).toBe("bottom");
    expect(top).toBe(592); // clamped to 800 - 200 - 8
  });

  it("clamps a surface that would overflow the trailing edge", () => {
    const { left } = resolveAnchoredPosition({
      ...base,
      anchor: { top: 100, left: 980, width: 20, height: 20 },
      side: "bottom",
    });
    // Centring would put it at 830; the viewport allows 1000 - 320 - 8.
    expect(left).toBe(672);
  });

  it("clamps a surface that would overflow the leading edge", () => {
    const { left } = resolveAnchoredPosition({
      ...base,
      anchor: { top: 100, left: 0, width: 20, height: 20 },
      side: "bottom",
    });
    expect(left).toBe(8);
  });

  it("pins a surface larger than the viewport to the start edge instead of off screen", () => {
    const { top, left } = resolveAnchoredPosition({
      ...base,
      size: { width: 1200, height: 900 },
      anchor: { top: 400, left: 400, width: 100, height: 40 },
      side: "right",
    });
    expect(top).toBe(8);
    expect(left).toBe(8);
  });

  it("centres the surface when the anchor cannot be found", () => {
    const { top, left } = resolveAnchoredPosition({ ...base, anchor: null, side: "bottom" });
    expect(top).toBe(300);
    expect(left).toBe(340);
  });

  it("never returns a negative coordinate for an unmeasured surface", () => {
    const { top, left } = resolveAnchoredPosition({
      ...base,
      size: { width: 320, height: 0 },
      anchor: { top: 0, left: 0, width: 0, height: 0 },
      side: "top",
    });
    expect(top).toBeGreaterThanOrEqual(8);
    expect(left).toBeGreaterThanOrEqual(8);
  });
});

describe("clampToViewport", () => {
  it("bounds a drag by the surface's measured size, not a fixed assumption", () => {
    const clamped = clampToViewport(
      { x: 5000, y: 5000 },
      { width: 400, height: 300 },
      viewport,
      64,
    );
    // 64px of the panel stays on screen on each axis.
    expect(clamped).toEqual({ x: 936, y: 736 });
  });

  it("keeps a small surface fully on screen", () => {
    const clamped = clampToViewport({ x: 5000, y: 5000 }, { width: 40, height: 30 }, viewport, 64);
    expect(clamped).toEqual({ x: 960, y: 770 });
  });

  it("refuses to move the surface off the leading edge", () => {
    const clamped = clampToViewport(
      { x: -500, y: -500 },
      { width: 400, height: 300 },
      viewport,
      64,
    );
    expect(clamped).toEqual({ x: 0, y: 0 });
  });

  it("falls back to the minimum visible strip before the surface is measured", () => {
    const clamped = clampToViewport({ x: 5000, y: 5000 }, { width: 0, height: 0 }, viewport, 64);
    expect(clamped).toEqual({ x: 936, y: 736 });
  });
});
