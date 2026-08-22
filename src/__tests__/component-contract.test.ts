/**
 * The component contract, tested from three sides:
 *
 *   1. the vocabularies — that the static reader used by the build and check scripts sees
 *      exactly what TypeScript sees, and that the contract agrees with the rest of the
 *      repository (the category map, the providers, the state detectors)
 *   2. the registry — that no declaration outlives its component and no deprecation is
 *      recorded without a migration path
 *   3. the validator — that a valid manifest passes and each class of invalid manifest is
 *      rejected with an actionable message
 *
 * The third group is where the gate earns its keep, so those cases are synthetic: they must
 * fail even when the real repository is clean.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ARIA_PATTERNS } from "@/contracts/accessibility";
import {
  COMPONENT_CATEGORIES,
  COMPONENT_STATUSES,
  SSR_SUPPORT_LEVELS,
  SUPPORT_LEVELS,
} from "@/contracts/component";
import { DENSITY_MODES } from "@/contracts/density";
import { DIRECTIONS } from "@/contracts/direction";
import { COMPONENT_LAYERS } from "@/contracts/layers";
import { INTERACTION_STATES } from "@/contracts/states";
import { THEME_MODES } from "@/contracts/theme";
import { MANIFEST_SCHEMA_VERSION } from "@/manifests/component-manifest";
import { COMPONENT_REGISTRY, REGISTRY_DEFAULTS } from "@/manifests/component-registry";
import manifestJson from "../../component-manifest.json";
import { detectableStates } from "../../scripts/lib/component-source.mjs";
import { formatFinding, pascalCase, validateManifest } from "../../scripts/lib/contract.mjs";
import {
  readLiteralExports,
  readLiteralExportsFromDirectory,
} from "../../scripts/lib/ts-literals.mjs";

const root = (...parts: string[]) => resolve(process.cwd(), ...parts);
const vocabulary = readLiteralExportsFromDirectory(root("src/contracts"));
const categoryMap: Record<string, string[]> = JSON.parse(
  readFileSync(root("scripts/config/category-map.json"), "utf8"),
);
const manifest = manifestJson as unknown as Record<string, unknown> & {
  components: Record<string, never>[];
};

/** Members of a string-literal union type alias, e.g. `type Density = "a" | "b";`. */
function unionMembers(source: string, typeName: string): string[] {
  const match = new RegExp(`type ${typeName} =([^;]+);`).exec(source);
  if (!match) throw new Error(`no type alias named ${typeName}`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
}

// A manifest entry that satisfies every rule — the base each negative case mutates.
function validEntry(overrides: Record<string, unknown> = {}) {
  return {
    slug: "example-widget",
    name: "ExampleWidget",
    category: "actions",
    layer: "components",
    import: "@qeetrix/ui",
    deepImport: "@qeetrix/ui/components/example-widget",
    groupImport: "@qeetrix/ui/components/actions",
    status: "stable",
    capabilities: {
      rtl: "supported",
      darkMode: "supported",
      density: "unknown",
      ssr: "server-safe",
      reducedMotion: "not-applicable",
    },
    states: ["hover", "disabled"],
    api: {
      variants: ["default"],
      sizes: ["default"],
      variantGroups: ["size", "variant"],
      variantAliases: null,
      domainAxes: null,
      controlled: null,
    },
    accessibility: {
      required: true,
      pattern: "button",
      audit: "not-audited",
      dimensions: Object.fromEntries(
        [
          "semantic",
          "name",
          "keyboard",
          "focus",
          "screenReader",
          "rtl",
          "reducedMotion",
          "forcedColors",
          "contrast",
        ].map((dimension) => [dimension, "not-audited"]),
      ),
      keyboard: null,
      focus: null,
      liveRegion: null,
      exceptions: null,
    },
    testing: {
      unit: true,
      accessibility: true,
      interaction: false,
      visual: true,
      hydration: false,
    },
    deprecation: null,
    story: true,
    tested: true,
    deprecated: false,
    ...overrides,
  };
}

function validate(entries: Record<string, unknown>[], options: Record<string, unknown> = {}) {
  return validateManifest({
    manifest: {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      count: entries.length,
      categories: {},
      statuses: {},
      components: entries,
    },
    vocabulary,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    ...options,
  });
}

const issues = (result: { errors: { issue: string }[] }) =>
  result.errors.map((error) => error.issue).join("\n");

describe("contract vocabularies", () => {
  // The build and check scripts cannot import TypeScript, so they read these declarations
  // statically. If the reader and the compiler ever disagree, every gate downstream is
  // validating against the wrong list.
  it.each([
    ["COMPONENT_STATUSES", COMPONENT_STATUSES],
    ["COMPONENT_CATEGORIES", COMPONENT_CATEGORIES],
    ["COMPONENT_LAYERS", COMPONENT_LAYERS],
    ["SUPPORT_LEVELS", SUPPORT_LEVELS],
    ["SSR_SUPPORT_LEVELS", SSR_SUPPORT_LEVELS],
    ["INTERACTION_STATES", INTERACTION_STATES],
    ["ARIA_PATTERNS", ARIA_PATTERNS],
    ["DENSITY_MODES", DENSITY_MODES],
    ["DIRECTIONS", DIRECTIONS],
    ["THEME_MODES", THEME_MODES],
  ])("%s is read identically by the static reader", (name, values) => {
    expect(vocabulary[name]).toEqual([...values]);
  });

  it("declares exactly the categories that exist on disk", () => {
    expect([...COMPONENT_CATEGORIES].sort()).toEqual(Object.keys(categoryMap).sort());
  });

  it("only declares interaction states the generator can detect", () => {
    expect([...INTERACTION_STATES].sort()).toEqual(detectableStates().sort());
  });

  it("agrees with the density provider", () => {
    const source = readFileSync(root("src/providers/density-provider.tsx"), "utf8");
    expect(unionMembers(source, "Density")).toEqual([...DENSITY_MODES].sort());
  });

  it("agrees with the theme provider", () => {
    const source = readFileSync(root("src/providers/theme-provider.tsx"), "utf8");
    expect(unionMembers(source, "Theme")).toEqual([...THEME_MODES].sort());
  });

  it("agrees with the direction provider", () => {
    const source = readFileSync(root("src/providers/direction-provider.tsx"), "utf8");
    expect(unionMembers(source, "Direction")).toEqual([...DIRECTIONS].sort());
  });
});

describe("component registry", () => {
  it("declares nothing that is not a component", () => {
    const slugs = new Set(Object.values(categoryMap).flat());
    const orphans = Object.keys(COMPONENT_REGISTRY).filter((slug) => !slugs.has(slug));
    expect(orphans).toEqual([]);
  });

  it("gives every deprecated component a reason and a migration path", () => {
    for (const [slug, declaration] of Object.entries(COMPONENT_REGISTRY)) {
      const entry = declaration as { status?: string; deprecation?: Record<string, unknown> };
      if (entry.status !== "deprecated") continue;
      expect(entry.deprecation, `${slug} has no deprecation record`).toBeDefined();
      expect(entry.deprecation?.reason).toBeTruthy();
      expect(entry.deprecation?.since).toBeTruthy();
      // A replacement may legitimately be null, but the field must be a decision.
      expect(entry.deprecation).toHaveProperty("replacement");
      expect(entry.deprecation).toHaveProperty("removeIn");
    }
  });

  it("defaults to a status the contract knows", () => {
    expect(COMPONENT_STATUSES).toContain(REGISTRY_DEFAULTS.status);
  });
});

describe("the generated manifest", () => {
  it("is valid against the contract", () => {
    const result = validateManifest({
      manifest,
      vocabulary,
      registry: COMPONENT_REGISTRY,
      registryDefaults: REGISTRY_DEFAULTS,
      categoryMap,
      schemaVersion: MANIFEST_SCHEMA_VERSION,
    });
    expect(issues(result)).toBe("");
  });

  it("covers every component in the category map", () => {
    const slugs = Object.values(categoryMap).flat().sort();
    expect(manifest.components.map((c) => c.slug as unknown as string).sort()).toEqual(slugs);
  });

  it("keeps the schema-v1 fields every existing consumer reads", () => {
    for (const entry of manifest.components) {
      for (const field of ["slug", "name", "category", "import", "deepImport", "groupImport"]) {
        expect(typeof entry[field as keyof typeof entry]).toBe("string");
      }
      for (const field of ["story", "tested", "deprecated"]) {
        expect(typeof entry[field as keyof typeof entry]).toBe("boolean");
      }
    }
  });

  it("carries a complete contract for every component", () => {
    for (const entry of manifest.components) {
      for (const block of ["capabilities", "states", "api", "accessibility", "testing"]) {
        expect(
          entry[block as keyof typeof entry],
          `${entry.slug} is missing ${block}`,
        ).toBeDefined();
      }
    }
  });
});

describe("manifest validation", () => {
  it("accepts a valid contract", () => {
    expect(validate([validEntry()]).errors).toEqual([]);
  });

  it("rejects an invalid status", () => {
    expect(issues(validate([validEntry({ status: "production" })]))).toContain(
      'status "production" is not a valid status',
    );
  });

  it("rejects an invalid category", () => {
    expect(issues(validate([validEntry({ category: "widgets" })]))).toContain(
      'category "widgets" is not a valid category',
    );
  });

  it("rejects an invalid layer", () => {
    expect(issues(validate([validEntry({ layer: "lib" })]))).toContain(
      'layer "lib" is not a component layer',
    );
  });

  it("rejects a slug that is not kebab-case", () => {
    expect(issues(validate([validEntry({ slug: "ExampleWidget" })]))).toContain(
      "is not kebab-case",
    );
  });

  it("rejects a name that does not match its slug", () => {
    expect(issues(validate([validEntry({ name: "Widget" })]))).toContain(
      'name "Widget" does not match its slug',
    );
  });

  it("rejects a duplicate registration", () => {
    const result = validate([validEntry(), validEntry()]);
    expect(issues(result)).toContain(
      'duplicate registration — slug "example-widget" appears twice',
    );
    expect(issues(result)).toContain('duplicate registration — name "ExampleWidget" appears twice');
  });

  it("rejects an unknown capability value", () => {
    const entry = validEntry({
      capabilities: { ...validEntry().capabilities, rtl: true },
    });
    expect(issues(validate([entry]))).toContain('capabilities.rtl is "true"');
  });

  it("rejects an unknown ssr posture", () => {
    const entry = validEntry({
      capabilities: { ...validEntry().capabilities, ssr: "supported" },
    });
    expect(issues(validate([entry]))).toContain('capabilities.ssr is "supported"');
  });

  it("rejects an unknown interaction state", () => {
    expect(issues(validate([validEntry({ states: ["glowing"] })]))).toContain(
      'states contains "glowing"',
    );
  });

  it("rejects a required accessibility contract with no pattern", () => {
    const entry = validEntry({
      accessibility: { ...validEntry().accessibility, required: true, pattern: null },
    });
    expect(issues(validate([entry]))).toContain("Missing accessibility.pattern");
  });

  it("rejects an APG pattern that is not claimed as required", () => {
    const entry = validEntry({
      accessibility: { ...validEntry().accessibility, required: false, pattern: "dialog" },
    });
    expect(issues(validate([entry]))).toContain(
      'accessibility.pattern is "dialog" but required is false',
    );
  });

  it("rejects an unknown ARIA pattern", () => {
    const entry = validEntry({
      accessibility: { ...validEntry().accessibility, required: true, pattern: "sidebar" },
    });
    expect(issues(validate([entry]))).toContain(
      'accessibility.pattern "sidebar" is not a known ARIA pattern',
    );
  });

  it("allows a reviewed component with no applicable pattern", () => {
    const entry = validEntry({
      accessibility: { ...validEntry().accessibility, required: false, pattern: "none" },
    });
    expect(validate([entry]).errors).toEqual([]);
  });

  it("rejects a deprecated component with no deprecation record", () => {
    const entry = validEntry({ status: "deprecated", deprecated: true, deprecation: null });
    expect(issues(validate([entry]))).toContain("status is deprecated but there is no deprecation");
  });

  it("rejects a deprecation record on a component that is not deprecated", () => {
    const entry = validEntry({
      deprecation: {
        since: "1.0.0",
        reason: "x",
        replacement: null,
        migration: null,
        removeIn: null,
      },
    });
    expect(issues(validate([entry]))).toContain("has a deprecation record but status is");
  });

  it("rejects a deprecation record with no reason", () => {
    const entry = validEntry({
      status: "deprecated",
      deprecated: true,
      deprecation: {
        since: "1.0.0",
        reason: "",
        replacement: null,
        migration: null,
        removeIn: null,
      },
    });
    expect(issues(validate([entry]))).toContain("deprecation.reason is missing");
  });

  it("rejects a legacy flag that disagrees with the contract", () => {
    expect(issues(validate([validEntry({ tested: false })]))).toContain(
      "legacy `tested` flag disagrees with testing.unit",
    );
    expect(issues(validate([validEntry({ deprecated: true })]))).toContain(
      "legacy `deprecated` flag is true",
    );
  });

  it("rejects a stale schema version", () => {
    const result = validateManifest({
      manifest: { schemaVersion: 1, count: 0, components: [] },
      vocabulary,
      schemaVersion: MANIFEST_SCHEMA_VERSION,
    });
    expect(issues(result)).toContain("schemaVersion is 1");
  });

  it("detects a component missing from the manifest", () => {
    const result = validate([], { categoryMap: { actions: ["button"] } });
    expect(issues(result)).toContain("is in category-map.json but missing from the manifest");
  });

  it("detects a declaration with no component", () => {
    const result = validate([validEntry()], { registry: { "ghost-widget": {} } });
    expect(issues(result)).toContain("declared in the registry but there is no such component");
  });

  it("detects a category the contract does not know", () => {
    const result = validate([validEntry()], { categoryMap: { actions: [], widgets: [] } });
    expect(issues(result)).toContain(
      'category "widgets" exists in category-map.json but not in the contract',
    );
  });

  it("detects a tally that disagrees with the entries", () => {
    const result = validateManifest({
      manifest: {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        count: 5,
        categories: { actions: 9 },
        statuses: {},
        components: [validEntry()],
      },
      vocabulary,
      schemaVersion: MANIFEST_SCHEMA_VERSION,
    });
    expect(issues(result)).toContain("count is 5 but there are 1 entries");
    expect(issues(result)).toContain("categories.actions is 9 but 1 components match");
  });

  it("warns about a variant axis named twice, without failing", () => {
    const entry = validEntry({
      api: {
        variants: ["default"],
        sizes: null,
        variantGroups: ["kind"],
        variantAliases: null,
        domainAxes: null,
        controlled: null,
      },
    });
    const result = validate([entry]);
    expect(result.errors).toEqual([]);
    expect(result.warnings.map((w: { issue: string }) => w.issue).join()).toContain(
      'cva group "kind" duplicates an existing concept',
    );
  });

  it("rejects a repeated variant name", () => {
    const entry = validEntry({
      api: {
        variants: ["default", "default"],
        sizes: null,
        variantGroups: ["variant"],
        variantAliases: null,
        domainAxes: null,
        controlled: null,
      },
    });
    expect(issues(validate([entry]))).toContain('api.variants lists "default" twice');
  });
});

describe("diagnostics", () => {
  it("names the component, the issue, the expectation and the file", () => {
    const [finding] = validate([
      validEntry({
        accessibility: { ...validEntry().accessibility, required: true, pattern: null },
      }),
    ]).errors;
    const rendered = formatFinding(finding);
    expect(rendered).toContain("Component Contract Error");
    expect(rendered).toContain("Component: ExampleWidget");
    expect(rendered).toContain("Missing accessibility.pattern");
    expect(rendered).toContain("Location:");
    expect(rendered).toContain("src/manifests/component-registry.ts");
  });

  it("derives the display name from the slug", () => {
    expect(pascalCase("alert-dialog")).toBe("AlertDialog");
    expect(pascalCase("otp-input")).toBe("OtpInput");
  });
});

describe("the schema version is readable by the build", () => {
  it("matches the TypeScript constant", () => {
    const literal = readLiteralExports(root("src/manifests/component-manifest.ts"));
    expect(literal.MANIFEST_SCHEMA_VERSION).toBe(MANIFEST_SCHEMA_VERSION);
  });
});
