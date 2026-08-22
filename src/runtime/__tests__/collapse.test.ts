// @vitest-environment node
//
// The fit computation behind OverflowList. Asserted here rather than through a render because
// jsdom measures every element as zero-width, so a rendered list always "fits".

import { describe, expect, it } from "vitest";

import { computeVisibleCount } from "@/runtime/collapse";

const base = { gap: 6, triggerWidth: 40, collapseFrom: "end" } as const;

describe("computeVisibleCount", () => {
  it("keeps every item when the whole list fits, reserving nothing for a trigger", () => {
    // 100 + 6 + 100 + 6 + 100 = 312, which fits in 320 only because no trigger is reserved.
    expect(computeVisibleCount({ ...base, widths: [100, 100, 100], available: 320 })).toBe(3);
  });

  it("reserves room for the trigger once something has to collapse", () => {
    // 312 > 300, so the trigger is in play: budget is 300 - 40 - 6 = 254 → two items (206).
    expect(computeVisibleCount({ ...base, widths: [100, 100, 100], available: 300 })).toBe(2);
  });

  it("measures the trailing items when collapsing from the start", () => {
    // Leading items are narrow, trailing ones wide. Counting from the front would claim three
    // items fit and then show the three widest.
    const widths = [20, 20, 20, 200, 200];
    expect(computeVisibleCount({ ...base, widths, available: 300, collapseFrom: "start" })).toBe(1);
    expect(computeVisibleCount({ ...base, widths, available: 300, collapseFrom: "end" })).toBe(3);
  });

  it("returns zero when not even one item fits beside the trigger", () => {
    expect(computeVisibleCount({ ...base, widths: [500, 500], available: 300 })).toBe(0);
  });

  it("renders everything while the container is unmeasured", () => {
    expect(computeVisibleCount({ ...base, widths: [100, 100, 100], available: 0 })).toBe(3);
  });

  it("has nothing to show for an empty list", () => {
    expect(computeVisibleCount({ ...base, widths: [], available: 500 })).toBe(0);
  });
});
