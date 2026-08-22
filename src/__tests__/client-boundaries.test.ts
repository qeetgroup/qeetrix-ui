/**
 * Client boundaries.
 *
 * A `"use client"` directive is a public contract: it decides whether a consumer can render the
 * component in a server component, and adding one to a widely-composed component pushes a whole
 * subtree onto the client. So two things are checked here:
 *
 *   1. **the curated intent** — a hand-picked set that must keep, or must not gain, a boundary.
 *      This is the regression guard: these are the components where getting it wrong is
 *      expensive, and the list is a deliberate decision rather than a derived fact.
 *   2. **the manifest agrees, for all 145** — `capabilities.ssr` in component-manifest.json is
 *      derived from the directive, so asserting it against the source proves the published
 *      metadata tells the truth, and makes the manifest the one place to look up the posture.
 *
 * Before, only the 30 curated components were covered and the manifest was unverified.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REQUIRED_CLIENT_MODULES = [
  "access-review",
  "audit-event",
  "breadcrumb",
  "code-block",
  "color-picker",
  "color-swatch",
  "copyable-secret",
  "country-picker",
  "feed",
  "field",
  "json-tree",
  "logo-uploader",
  "time-since",
  "timezone-picker",
] as const;

const SERVER_SAFE_MODULES = [
  "alert",
  "app-shell",
  "badge",
  "description-list",
  "empty-state",
  "form",
  "kbd",
  "label",
  "page-header",
  "progress-circle",
  "security-item",
  "spinner",
  "stat",
  "stepper",
  "table",
  "timeline",
] as const;

// Components live under src/components/<category>/; scripts/config/component-map.json
// is the single source of truth for that mapping (build, checks and tests all read it).
const categoryMap: Record<string, string[]> = JSON.parse(
  readFileSync(resolve(process.cwd(), "scripts/config/component-map.json"), "utf8"),
);
const categoryOf = new Map(
  Object.entries(categoryMap).flatMap(([category, slugs]) =>
    slugs.map((slug) => [slug, category] as const),
  ),
);

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "component-manifest.json"), "utf8"),
) as { components: { slug: string; capabilities: { ssr: string } }[] };

function sourceFor(moduleName: string) {
  const category = categoryOf.get(moduleName);
  if (!category) throw new Error(`${moduleName} is not in scripts/config/component-map.json`);
  const filePath = resolve(process.cwd(), "src", "components", category, `${moduleName}.tsx`);
  return readFileSync(filePath, "utf8");
}

function hasClientDirective(source: string) {
  return source.startsWith('"use client";') || source.startsWith("'use client';");
}

describe("component client boundaries", () => {
  for (const moduleName of REQUIRED_CLIENT_MODULES) {
    it(`${moduleName} declares its client boundary`, () => {
      expect(hasClientDirective(sourceFor(moduleName))).toBe(true);
    });
  }

  for (const moduleName of SERVER_SAFE_MODULES) {
    it(`${moduleName} remains server-safe`, () => {
      expect(hasClientDirective(sourceFor(moduleName))).toBe(false);
    });
  }

  it("publishes an ssr posture that matches the source, for every component", () => {
    const wrong = manifest.components
      .map(({ slug, capabilities }) => {
        const expected = hasClientDirective(sourceFor(slug)) ? "client-boundary" : "server-safe";
        return capabilities.ssr === expected ? null : `${slug}: ${capabilities.ssr} ≠ ${expected}`;
      })
      .filter((entry) => entry !== null);
    expect(wrong).toEqual([]);
  });

  it("agrees with the curated lists", () => {
    const posture = new Map(manifest.components.map((c) => [c.slug, c.capabilities.ssr]));
    for (const slug of REQUIRED_CLIENT_MODULES) {
      expect(posture.get(slug), slug).toBe("client-boundary");
    }
    for (const slug of SERVER_SAFE_MODULES) {
      expect(posture.get(slug), slug).toBe("server-safe");
    }
  });
});
