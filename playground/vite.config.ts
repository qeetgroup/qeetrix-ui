import { existsSync } from "node:fs";
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

/**
 * The Qeet brand logos (`QeetLogo`, `QeetWordmarkLogo`) live in `@qeetrix/icons`. Until a release
 * that ships them is installed here, the Brand page reads their generated modules from the
 * qeetrix-icons checkout beside this repository; without that checkout it falls back to labelled
 * stand-ins in `src/brand-fallback/`, so the playground still builds.
 */
const iconsRepository = fileURLToPath(new URL("../../qeetrix-icons", import.meta.url));
const iconsSource = existsSync(`${iconsRepository}/src/generated/logos/qeet-wordmark.ts`)
  ? `${iconsRepository}/src`
  : fileURLToPath(new URL("./src/brand-fallback", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@qeetrix\/ui$/, replacement: `${source}/index.ts` },
      { find: /^@\//, replacement: `${source}/` },
      { find: /^@qeetrix-icons\//, replacement: `${iconsSource}/` },
    ],
    // One React, whichever repository a module was resolved from.
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5199,
    // The library source, its fonts, the manifest and the generated tokens all live one level up.
    fs: { allow: [repository, iconsRepository] },
  },
  preview: { port: 5198 },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // One chunk per component family plus the shell; the heaviest family (charts) is ~400 kB.
    chunkSizeWarningLimit: 1600,
  },
});
