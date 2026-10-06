import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { RollingNumber } from "@/components/RollingNumber/rolling-number";

const a11y = (c: Element) =>
  axe(c, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });

const root = (c: HTMLElement) => c.querySelector<HTMLElement>('[data-slot="rolling-number"]');
/** What a sighted user sees — the animated digits. */
const shown = (c: HTMLElement) => root(c)?.querySelector('[aria-hidden="true"]')?.textContent;
/** What assistive technology reads — only ever the target value. */
const spoken = (c: HTMLElement) => root(c)?.querySelector(".sr-only")?.textContent;

// A hand-cranked animation clock, so the frames are deterministic.
let now = 0;
let nextId = 0;
let frames = new Map<number, FrameRequestCallback>();
function advance(ms: number) {
  act(() => {
    now += ms;
    const due = [...frames.values()];
    frames = new Map();
    for (const frame of due) frame(now);
  });
}

beforeEach(() => {
  now = 0;
  nextId = 0;
  frames = new Map();
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    nextId += 1;
    frames.set(nextId, cb);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("RollingNumber", () => {
  it("renders the formatted value", () => {
    const { container } = render(<RollingNumber value={1234} locale="en-US" />);
    expect(shown(container)).toBe("1,234");
    expect(spoken(container)).toBe("1,234");
  });

  it("exposes a polite live region that a consumer can override", () => {
    const { container, rerender } = render(<RollingNumber value={5} />);
    expect(root(container)).toHaveAttribute("aria-live", "polite");
    rerender(<RollingNumber value={5} aria-live="off" />);
    expect(root(container)).toHaveAttribute("aria-live", "off");
  });

  it("announces the target once, never the intermediate frames", () => {
    const { container, rerender } = render(
      <RollingNumber value={0} duration={1000} locale="en-US" />,
    );
    rerender(<RollingNumber value={100} duration={1000} locale="en-US" />);
    // The spoken copy is the destination immediately; the counting digits are hidden from AT.
    expect(spoken(container)).toBe("100");
    advance(16);
    advance(400);
    expect(shown(container)).not.toBe("100");
    expect(spoken(container)).toBe("100");
    advance(1000);
    expect(shown(container)).toBe("100");
  });

  it("continues from the number on screen when the value changes mid-animation", () => {
    const { container, rerender } = render(
      <RollingNumber value={0} duration={1000} locale="en-US" />,
    );
    rerender(<RollingNumber value={100} duration={1000} locale="en-US" />);
    advance(0);
    advance(500); // easeOutCubic at t=0.5 → 87.5
    const midway = Number(shown(container));
    expect(midway).toBeGreaterThan(80);

    rerender(<RollingNumber value={200} duration={1000} locale="en-US" />);
    advance(0);
    advance(1);
    // Previously this restarted from the last *settled* value (0) and visibly jumped back.
    expect(Number(shown(container))).toBeGreaterThanOrEqual(midway);
  });

  it("jumps straight to the value under reduced motion", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("reduce"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const { container, rerender } = render(<RollingNumber value={1} duration={1000} />);
    rerender(<RollingNumber value={9} duration={1000} />);
    expect(shown(container)).toBe("9");
    expect(frames.size).toBe(0);
  });

  it("isolates the number's direction from surrounding text", () => {
    const { container } = render(<RollingNumber value={-42} locale="en-US" />);
    expect(root(container)).toHaveAttribute("dir", "auto");
    expect(root(container)).toHaveClass("tabular-nums");
  });

  it("has no axe violations", async () => {
    const { container } = render(<RollingNumber value={1234} locale="en-US" />);
    expect(await a11y(container)).toHaveNoViolations();
  });
});
