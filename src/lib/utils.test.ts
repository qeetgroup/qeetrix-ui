import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges conditional classes and drops falsy values", () => {
    const hidden = false;
    expect(cn("text-sm", hidden && "hidden", undefined, "font-bold")).toBe("text-sm font-bold");
  });

  it("dedupes conflicting Tailwind utilities (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
