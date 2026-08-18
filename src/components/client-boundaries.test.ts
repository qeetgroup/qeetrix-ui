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

function sourceFor(moduleName: string) {
  const filePath = resolve(process.cwd(), "src", "components", "ui", `${moduleName}.tsx`);
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
});