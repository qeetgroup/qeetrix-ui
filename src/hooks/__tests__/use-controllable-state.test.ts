import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useControllableState } from "@/hooks/use-controllable-state";

describe("useControllableState", () => {
  describe("uncontrolled", () => {
    it("seeds from defaultValue and owns state afterwards", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useControllableState({ defaultValue: "a", onChange }),
      );
      expect(result.current[0]).toBe("a");

      act(() => result.current[1]("b"));
      expect(result.current[0]).toBe("b");
      expect(onChange).toHaveBeenCalledExactlyOnceWith("b");
    });

    it("calls a lazy default exactly once", () => {
      const factory = vi.fn(() => "lazy");
      const { result, rerender } = renderHook(() =>
        useControllableState({ defaultValue: factory }),
      );
      rerender();
      expect(result.current[0]).toBe("lazy");
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("starts undefined when there is no defaultValue", () => {
      const { result } = renderHook(() => useControllableState<string | undefined>({}));
      expect(result.current[0]).toBeUndefined();
    });
  });

  describe("controlled", () => {
    it("treats the prop as authoritative and never diverges", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useControllableState({ value: "a", onChange }));

      act(() => result.current[1]("b"));
      // The parent ignored the callback, so the value must not have moved.
      expect(result.current[0]).toBe("a");
      expect(onChange).toHaveBeenCalledExactlyOnceWith("b");
    });

    it("follows the prop when the parent updates it", () => {
      const { result, rerender } = renderHook(
        ({ value }: { value: string }) => useControllableState({ value }),
        { initialProps: { value: "a" } },
      );
      rerender({ value: "b" });
      expect(result.current[0]).toBe("b");
    });

    it("ignores defaultValue", () => {
      const { result } = renderHook(() =>
        useControllableState({ value: "controlled", defaultValue: "ignored" }),
      );
      expect(result.current[0]).toBe("controlled");
    });
  });

  describe("what counts as controlled", () => {
    // Only `undefined` means uncontrolled — an empty string, zero, false and null are values.
    it.each([
      ["empty string", "", "next"],
      ["zero", 0, 1],
      ["false", false, true],
      ["null", null, "next"],
    ])("%s is a controlled value", (_label, value, next) => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useControllableState<unknown>({ value, defaultValue: "unused", onChange }),
      );
      expect(result.current[0]).toBe(value);
      act(() => result.current[1](next));
      expect(result.current[0]).toBe(value);
      expect(onChange).toHaveBeenCalledExactlyOnceWith(next);
    });

    it("treats undefined as uncontrolled even with a defaultValue present", () => {
      const { result } = renderHook(() =>
        useControllableState<string | undefined>({ value: undefined, defaultValue: "seed" }),
      );
      expect(result.current[0]).toBe("seed");
      act(() => result.current[1]("moved"));
      expect(result.current[0]).toBe("moved");
    });
  });

  describe("functional updates", () => {
    it("computes from the current value when uncontrolled", () => {
      const { result } = renderHook(() => useControllableState({ defaultValue: 1 }));
      act(() => result.current[1]((previous) => previous + 1));
      act(() => result.current[1]((previous) => previous + 1));
      expect(result.current[0]).toBe(3);
    });

    it("computes from the controlled value, not stale internal state", () => {
      const onChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ value }: { value: number }) => useControllableState({ value, onChange }),
        { initialProps: { value: 5 } },
      );
      rerender({ value: 9 });
      act(() => result.current[1]((previous) => previous + 1));
      expect(onChange).toHaveBeenLastCalledWith(10);
    });
  });

  describe("values", () => {
    it("carries objects and arrays by reference", () => {
      const next = { id: 2 };
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useControllableState<{ id: number }>({ defaultValue: { id: 1 }, onChange }),
      );
      act(() => result.current[1](next));
      expect(result.current[0]).toBe(next);
    });

    it("does not report a set to the value it already has", () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useControllableState({ defaultValue: "a", onChange }));
      act(() => result.current[1]("a"));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it("returns a stable setter across renders", () => {
    const { result, rerender } = renderHook(() =>
      useControllableState({ defaultValue: "a", onChange: () => {} }),
    );
    const first = result.current[1];
    rerender();
    expect(result.current[1]).toBe(first);
  });

  it("uses the latest onChange without changing the setter", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ onChange }: { onChange: (v: string) => void }) =>
        useControllableState({ defaultValue: "a", onChange }),
      { initialProps: { onChange: first } },
    );
    const setter = result.current[1];
    rerender({ onChange: second });
    expect(result.current[1]).toBe(setter);
    act(() => result.current[1]("b"));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith("b");
  });
});
