import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The internal Qeetrix UI component playground. Repository tooling only: it lives outside
 * `src/`, is never part of the published package (`files` is `["dist"]`), and consumes the
 * library from source so token and component edits show up live.
 *
 *   bun run playground         dev server
 *   bun run playground:build   static build in playground/dist
 *
 * `@qeetrix/ui` resolves to `src/index.ts` rather than the package's own `dist/` (which a
 * self-reference would pick up), so examples import exactly what consumers import, from the
 * code being edited. `@/` is the library's internal alias and has to resolve the same way.
 */

const repository = fileURLToPath(new URL("..", import.meta.url));
const source = fileURLToPath(new URL("../src", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@qeetrix\/ui$/, replacement: `${source}/index.ts` },
      { find: /^@\//, replacement: `${source}/` },
    ],
  },
  server: {
    port: 5199,
    // The library source, its fonts, the manifest and the generated tokens all live one level up.
    fs: { allow: [repository] },
  },
  preview: { port: 5198 },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // One chunk per component family plus the shell; the heaviest family (charts) is ~400 kB.
    chunkSizeWarningLimit: 1600,
  },
});
