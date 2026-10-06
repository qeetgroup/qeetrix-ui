import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@scripts": fileURLToPath(new URL("./scripts", import.meta.url)),
      "@root": fileURLToPath(new URL(".", import.meta.url)),
      // The playground's examples import the package by name, as consumers do; resolve it to
      // source rather than to a self-referenced (possibly stale) dist/.
      "@qeetrix/ui": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    // playground/__tests__ asserts every manifest module has a playground example.
    include: ["src/**/*.test.{ts,tsx}", "playground/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
