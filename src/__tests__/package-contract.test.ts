// @vitest-environment node
/**
 * The published export map, as a contract rather than a habit.
 *
 * `check:package` proves every published path resolves — but only after a full build, so it is
 * not what a contributor runs. These assertions need no build: they read package.json and the
 * source tree, and they fail the moment the export map stops being an enumerated decision.
 *
 * The bug class they guard is specific. `"./hooks/*"`, `"./lib/*"`, `"./providers/*"` and
 * `"./blocks/*"` used to be wildcard exports, which made every module in those directories a
 * supported import path the day it was created — `useControllableState`, an internal hook, was
 * public and nobody had decided that. A wildcard cannot be reviewed; a list can.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import publicApi from "./public-api.json";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (path: string) => readFileSync(`${ROOT}${path}`, "utf8");
const readJson = (path: string) => JSON.parse(read(path));

const pkg = readJson("/package.json") as {
  exports: Record<string, null | string | Record<string, string>>;
};
const categoryMap = readJson("/scripts/config/category-map.json") as Record<string, string[]>;

const modulesIn = (directory: string, extension: string) =>
  readdirSync(`${ROOT}${directory}`)
    .filter((file) => file.endsWith(extension) && file !== `index${extension}`)
    .map((file) => file.replace(extension, ""))
    .sort();

/**
 * Modules that exist under a published directory and are deliberately NOT published. Listing
 * them is the point: adding a file to src/hooks or src/lib now forces a decision here instead of
 * silently becoming part of the public API.
 */
const INTERNAL = {
  hooks: ["use-controllable-state"],
  // Deliberately unpublished. The direction and locale primitives reach consumers through
  // `useResolvedDirection`, `useDirectionalKeys` and `useLocale` on the providers entry point,
  // which is the supported surface; the raw modules stay internal so their shape can change.
  lib: ["direction", "locale", "messages"],
};

const explicitExports = Object.entries(pkg.exports).filter(
  (entry): entry is [string, Record<string, string>] =>
    !entry[0].includes("*") && entry[1] !== null && typeof entry[1] === "object",
);

describe("the export map is an allowlist", () => {
  it.each(["./hooks/*", "./lib/*", "./providers/*", "./blocks/*"])(
    "%s is not a wildcard export",
    (pattern) => {
      expect(pkg.exports[pattern]).toBeUndefined();
    },
  );

  it("publishes exactly the hooks that are supported", () => {
    const published = Object.keys(pkg.exports)
      .filter((key) => key.startsWith("./hooks/"))
      .map((key) => key.replace("./hooks/", ""))
      .sort();
    expect([...published, ...INTERNAL.hooks].sort()).toEqual(modulesIn("/src/hooks", ".ts"));
  });

  it("publishes exactly the lib modules that are supported", () => {
    const published = Object.keys(pkg.exports)
      .filter((key) => key.startsWith("./lib/"))
      .map((key) => key.replace("./lib/", ""))
      .sort();
    expect([...published, ...INTERNAL.lib].sort()).toEqual(modulesIn("/src/lib", ".ts"));
  });

  it("publishes every block and every provider by name", () => {
    const published = (prefix: string) =>
      Object.keys(pkg.exports)
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.replace(prefix, ""))
        .sort();
    expect(published("./blocks/")).toEqual(modulesIn("/src/blocks", ".tsx"));
    expect(published("./providers/").filter((name) => name !== "")).toEqual(
      modulesIn("/src/providers", ".tsx"),
    );
  });

  it("keeps the internal hook internal", () => {
    // The regression this exists for: it was reachable as @qeetrix/ui/hooks/use-controllable-state.
    expect(pkg.exports["./hooks/use-controllable-state"]).toBeUndefined();
    expect(read("/src/hooks/use-controllable-state.ts")).toContain("useControllableState");
  });
});

describe("implementation paths are denied, not merely undocumented", () => {
  it("denies every category directory", () => {
    for (const category of Object.keys(categoryMap)) {
      expect(
        pkg.exports[`./components/${category}/*`],
        `./components/${category}/* must be denied`,
      ).toBeNull();
    }
  });

  it("denies the components barrel", () => {
    // @qeetrix/ui is the barrel; @qeetrix/ui/components/index was a second way to say it.
    expect(pkg.exports["./components/index"]).toBeNull();
  });

  it("keeps the flat façade and the legacy path as patterns", () => {
    // These two are the whole point of the shim layer, and scripts/build/subpath-shims.mjs only
    // writes names from the category map — so the pattern cannot resolve anything unlisted.
    expect(pkg.exports["./components/*"]).toEqual({
      types: "./dist/components/*.d.ts",
      import: "./dist/components/*.js",
      default: "./dist/components/*.js",
    });
    expect(pkg.exports["./components/ui/*"]).toBeTruthy();
  });
});

describe("every explicit export is complete and locked", () => {
  it("declares types, import and default for each entry point", () => {
    for (const [specifier, target] of explicitExports) {
      expect(Object.keys(target).sort(), specifier).toEqual(["default", "import", "types"]);
      expect(target.import, specifier).toMatch(/^\.\/dist\/.+\.js$/);
      expect(target.types, specifier).toBe(target.import.replace(/\.js$/, ".d.ts"));
    }
  });

  it("locks the surface of every explicit entry point", () => {
    // API-002: the lock used to cover ".", "./brand" and "./blocks" only, so a provider, a block
    // module, a hook or a lib helper could change shape without failing anything.
    expect(Object.keys(publicApi).sort()).toEqual(explicitExports.map(([key]) => key).sort());
  });

  it("records a kind, not just a name, for every export", () => {
    const kinds = new Set(
      Object.values(publicApi as Record<string, Record<string, string>>).flatMap((entry) =>
        Object.values(entry),
      ),
    );
    expect(kinds.size).toBeGreaterThan(1);
    for (const kind of kinds) {
      expect(["class", "enum", "function", "interface", "type", "variable", "namespace"]).toContain(
        kind,
      );
    }
  });
});
