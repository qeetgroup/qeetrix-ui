import { afterEach, describe, expect, it } from "vitest";
import {
  readStoredJson,
  readStoredText,
  writeStoredJson,
  writeStoredText,
} from "@/runtime/storage";

/** Replace a `localStorage` method with one that throws, the way a blocked origin does. */
function breakStorage(method: "getItem" | "setItem") {
  const prototype = Object.getPrototypeOf(window.localStorage);
  const original = prototype[method];
  prototype[method] = () => {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
  };

  return () => {
    prototype[method] = original;
  };
}

interface Preference {
  size: number;
}

/** Accepts `{ size: number }` and nothing else. */
function parsePreference(value: unknown): Preference | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const size = (value as { size?: unknown }).size;

  return typeof size === "number" ? { size } : undefined;
}

describe("failure-safe localStorage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("round-trips text", () => {
    expect(writeStoredText("qx-test:text", "dark")).toBe(true);
    expect(readStoredText("qx-test:text")).toBe("dark");
    expect(readStoredText("qx-test:absent")).toBeNull();
  });

  it("reports a refused write instead of throwing", () => {
    const restore = breakStorage("setItem");

    try {
      expect(writeStoredText("qx-test:text", "dark")).toBe(false);
    } finally {
      restore();
    }
  });

  it("reads as absent instead of throwing when storage is unreadable", () => {
    const restore = breakStorage("getItem");

    try {
      expect(readStoredText("qx-test:text")).toBeNull();
      expect(readStoredJson("qx-test:json", parsePreference)).toBeUndefined();
    } finally {
      restore();
    }
  });

  it("round-trips JSON through the validator", () => {
    expect(writeStoredJson("qx-test:json", { size: 12 })).toBe(true);
    expect(readStoredJson("qx-test:json", parsePreference)).toEqual({ size: 12 });
  });

  it.each([
    ["not JSON", "{size:"],
    ["JSON of the wrong shape", '{"size":"wide"}'],
    ["JSON of the wrong type", '"wide"'],
    ["null", "null"],
  ])("treats stored bytes that are %s as absent", (_label, bytes) => {
    localStorage.setItem("qx-test:json", bytes);

    expect(readStoredJson("qx-test:json", parsePreference)).toBeUndefined();
  });

  it("refuses a value that cannot be serialised, and stores nothing", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(writeStoredJson("qx-test:json", circular)).toBe(false);
    expect(localStorage.getItem("qx-test:json")).toBeNull();
  });

  it("lets a validator that throws mean absent rather than crash the caller", () => {
    localStorage.setItem("qx-test:json", '{"size":12}');

    expect(
      readStoredJson("qx-test:json", () => {
        throw new TypeError("hostile validator");
      }),
    ).toBeUndefined();
  });
});
