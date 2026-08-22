/**
 * Setup for the browser project only. The jsdom setup (src/__tests__/setup.ts) is not loaded
 * here on purpose: every polyfill in it exists because jsdom lacks the API, and installing a
 * stub in a real browser would replace the behaviour under test with the stub.
 *
 * The stylesheet is imported for real. These tests assert geometry, and Qeetrix geometry lives
 * in Tailwind utilities — without a compiled stylesheet a reflow assertion would be measuring
 * an unstyled div.
 *
 * It has to be `styles.css`, the *full* entry, not `index.css`. index.css is now the core entry
 * (published as `@qeetrix/ui/core.css`) and deliberately omits the host-global layer, so
 * media/base-layer-media-queries.test.tsx — the only place the reduced-motion collapse and the
 * forced-colors remapping are ever observed — would be asserting rules that were not loaded.
 */
import "@testing-library/jest-dom/vitest";
import "@/styles/styles.css";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  // Overlays inert and scroll-lock `document.body`. Unmounting restores both, but a failed
  // assertion can unwind before the effect cleanup runs, and body state is shared across the
  // whole file in browser mode.
  document.body.style.overflow = "";
  document.body.style.paddingInlineEnd = "";
  for (const element of document.body.querySelectorAll("[inert]")) {
    element.removeAttribute("inert");
  }
});
