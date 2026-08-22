import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import baseline from "./scripts/config/coverage-baseline.json" with { type: "json" };

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Browser-mode tests are a separate project (vitest.browser.config.ts). They assert real
    // layout, real `inert` and real focus navigation, so running them here would either fail
    // or — worse — pass vacuously against jsdom's stubs.
    exclude: ["**/node_modules/**", "**/dist/**", "src/__tests__/browser/**"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "./node_modules/.cache/qeetrix/coverage",
      // What is measured is the published surface. Generated files are excluded because a
      // coverage number over generated code measures the generator, not this package, and
      // barrels because re-export-only modules are covered by definition and dilute the ratio
      // until it stops meaning anything.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/__tests__/**",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/index.ts",
        "src/**/index.ts",
        "src/brand/logos/**",
        "src/foundations/token-values.ts",
        "src/manifests/**",
      ],
      // Off by default, which means a single unrelated failure produces no numbers at all —
      // exactly when the numbers are most useful. The run still fails on the failure.
      reportOnFailure: true,
      thresholds: baseline.thresholds,
    },
  },
});
