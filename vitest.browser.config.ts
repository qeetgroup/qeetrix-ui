/**
 * Browser-mode Vitest project — the evidence jsdom cannot produce.
 *
 * `TEST-001` was not "add more tests". Everything in this repository is asserted in jsdom,
 * which performs no layout, does not implement `inert`, and does not move focus on Tab. So
 * `inert` exclusion, focus containment, reflow at 200% zoom, scroll locking and hit-target
 * size were *stated* in comments and unprovable. This project runs a small suite in real
 * Chromium so each of those becomes a test that can fail.
 *
 * Deliberately narrow. A browser test that re-asserts a jsdom-provable fact costs a browser
 * launch and buys nothing, so `src/__tests__/browser/` holds only assertions that need real
 * layout, real focus navigation or a real `inert` implementation. Everything else stays in
 * the jsdom project (vitest.config.ts), which is where the other 1,600 tests belong.
 *
 * Cost, stated plainly: this needs a Playwright Chromium build on the machine
 * (~200 MB for the headless shell, downloaded by `bunx playwright install chromium`), so it
 * is **not** part of `bun run verify`. It is its own script (`bun run test:browser`) and its
 * own CI job. See docs/standards/testing.md.
 *
 * The Tailwind plugin is not optional here: the reflow assertions depend on `max-h-*` and
 * `overflow-y-auto` actually applying, and without a compiled stylesheet those class names
 * are inert strings and the tests would pass on anything.
 */
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/** Extra engines are opt-in: only Chromium is guaranteed to be installed. */
const browsers = (process.env.QEETRIX_BROWSERS ?? "chromium").split(",").map((n) => n.trim());

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    // Browser mode pre-bundles dependencies, and Vite will happily inline a second copy of
    // React into `@base-ui/react` while the test file imports the first — which surfaces as
    // "Invalid hook call", not as a resolution error. jsdom mode never hits this because it
    // does not pre-bundle.
    dedupe: ["react", "react-dom"],
  },
  // The dependency optimizer is the one sharp edge of browser mode. Unless React is an
  // optimizer entry in its own right, a pre-bundled dependency gets its own inlined copy and
  // the first component that reads a context throws "Invalid hook call" — a failure that looks
  // like a bug in the component under test. Listing React here makes every consumer, bundled
  // or not, resolve to the same module instance.
  optimizeDeps: {
    include: [
      "react",
      "react/jsx-dev-runtime",
      "react/jsx-runtime",
      "react-dom",
      "react-dom/client",
      "@testing-library/react",
    ],
  },
  test: {
    name: "browser",
    include: ["src/__tests__/browser/**/*.test.tsx"],
    setupFiles: ["./src/__tests__/browser/setup.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      screenshotFailures: false,
      instances: browsers.flatMap((name) => {
        const browser = name as "chromium" | "firefox" | "webkit";
        return [
          { browser, include: ["src/__tests__/browser/*.test.tsx"] },
          // A second instance rather than a second config: `prefers-reduced-motion` and
          // `forced-colors` are properties of the browser context, so they cannot be switched
          // from inside a running page. Everything under media/ gets a context that has them on,
          // which is the only way to observe the two host-global blocks in src/styles/base.css.
          {
            browser,
            name: `${browser}-forced`,
            include: ["src/__tests__/browser/media/*.test.tsx"],
            provider: playwright({
              contextOptions: { forcedColors: "active", reducedMotion: "reduce" },
            }),
          },
        ];
      }),
    },
  },
});
