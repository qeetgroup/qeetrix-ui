import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useIsMobile } from "@/hooks/use-mobile";

describe("useIsMobile", () => {
  it("tracks the canonical below-md media query", () => {
    let matches = false;
    const listeners = new Set<() => void>();
    const mediaQuery = {
      get matches() {
        return matches;
      },
      media: "(max-width: 767px)",
      onchange: null,
      addEventListener: vi.fn((_event: string, listener: () => void) => listeners.add(listener)),
      removeEventListener: vi.fn((_event: string, listener: () => void) =>
        listeners.delete(listener),
      ),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList;
    vi.spyOn(window, "matchMedia").mockImplementation((query) => {
      expect(query).toBe("(max-width: 767px)");
      return mediaQuery;
    });

    const { result, unmount } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      matches = true;
      for (const listener of listeners) listener();
    });
    expect(result.current).toBe(true);

    unmount();
    expect(mediaQuery.removeEventListener).toHaveBeenCalled();
  });
});
