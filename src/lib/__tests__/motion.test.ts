import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMotion } from "@/hooks/use-motion";
import { transition } from "@/lib/motion";

describe("transition()", () => {
  it("builds a CSS transition from motion tokens", () => {
    expect(transition("opacity")).toBe("opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)");
    expect(transition(["opacity", "transform"], { duration: "fast", easing: "decelerate" })).toBe(
      "opacity 150ms cubic-bezier(0, 0, 0.2, 1), transform 150ms cubic-bezier(0, 0, 0.2, 1)",
    );
  });

  it("accepts raw numbers, raw easing, and a delay", () => {
    expect(transition("width", { duration: 250, easing: "ease-in-out", delay: 50 })).toBe(
      "width 250ms ease-in-out 50ms",
    );
  });
});

describe("useMotion()", () => {
  function setReduced(matches: boolean) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  it("returns full motion by default", () => {
    setReduced(false);
    const { result } = renderHook(() => useMotion());
    expect(result.current.reduced).toBe(false);
    expect(result.current.duration("slow")).toBe(300);
    expect(result.current.transition("opacity")).toContain("200ms");
  });

  it("collapses to no-motion when reduced", () => {
    setReduced(true);
    const { result } = renderHook(() => useMotion());
    expect(result.current.reduced).toBe(true);
    expect(result.current.duration("slow")).toBe(0);
    expect(result.current.transition("opacity")).toBe("none");
  });
});
