import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";
import * as matchers from "vitest-axe/matchers";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// jsdom is missing a handful of browser APIs that Base UI / Recharts touch.
// Provide minimal no-op polyfills so component tests don't crash on mount.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
}

window.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
window.IntersectionObserver ??= IntersectionObserverStub as unknown as typeof IntersectionObserver;

// Pointer-capture + scroll APIs used by Base UI menus/selects.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
// Base UI ScrollArea calls getAnimations() in a timeout after mount; jsdom lacks it.
if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => [];
}
