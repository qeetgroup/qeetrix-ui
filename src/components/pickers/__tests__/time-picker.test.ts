import { describe, expect, it } from "vitest";

import { parseTime } from "@/components/pickers/time-picker";

describe("parseTime", () => {
  it("parses HH:mm and HH:mm:ss", () => {
    expect(parseTime("09:30")).toEqual({ h: 9, m: 30, s: 0 });
    expect(parseTime("23:59:45")).toEqual({ h: 23, m: 59, s: 45 });
  });

  it("returns null for empty/invalid input", () => {
    expect(parseTime(undefined)).toBeNull();
    expect(parseTime("")).toBeNull();
    expect(parseTime("nope")).toBeNull();
  });
});
