import { describe, expect, it } from "vitest";

import { parseTime } from "@/components/DatePicker/time-picker";

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

  it("accepts a single-digit hour and ignores a fraction of a second", () => {
    expect(parseTime("9:05")).toEqual({ h: 9, m: 5, s: 0 });
    // What a native <input type="time" step="0.001"> submits.
    expect(parseTime("23:59:59.250")).toEqual({ h: 23, m: 59, s: 59 });
  });

  it("rejects anything that is not a real wall-clock time", () => {
    // `parseInt` accepted every one of these, and a picker holding an hour or minute it has no
    // option for renders an empty column while believing it has a value.
    for (const value of [
      "24:00",
      "25:00",
      "09:60",
      "09:30:60",
      "9:5",
      "09:30abc",
      "1e1:30",
      "-1:30",
    ]) {
      expect(parseTime(value)).toBeNull();
    }
  });
});
