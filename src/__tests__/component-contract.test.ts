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
import {
  DENSITY_APPLICABILITY,
  DENSITY_MODES,
  DERIVABLE_DENSITY_APPLICABILITY,
} from "@/contracts/density";
import { DIRECTIONS } from "@/contracts/direction";
import { COMPONENT_LAYERS } from "@/contracts/layers";
import { INTERACTION_STATES } from "@/contracts/states";
import { THEME_MODES } from "@/contracts/theme";
import { MANIFEST_SCHEMA_VERSION } from "@/manifests/component-manifest";
import { COMPONENT_REGISTRY, REGISTRY_DEFAULTS } from "@/manifests/component-registry";
import manifestJson from "../../component-manifest.json";
import { detectableStates, hasDeprecationMarker } from "../../scripts/lib/component-source.mjs";
import { formatFinding, pascalCase, validateManifest } from "../../scripts/lib/contract.mjs";
import {
  readLiteralExports,
  readLiteralExportsFromDirectory,
  readPropAxes,
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
      // `semantic` is `pass` because the fixture's status is `stable`, and `stable` now requires
      // an audited `semantic` dimension (GOV-001). The rest stay `not-audited`, which is what
      // keeps the computed roll-up at `not-audited` — the property most of these cases are about.
      dimensions: Object.fromEntries(
        [
          "name",
          "keyboard",
          "focus",
          "screenReader",
          "rtl",
          "reducedMotion",
          "forcedColors",
          "contrast",
        ]
          .map((dimension) => [dimension, "not-audited"])
          .concat([["semantic", "pass"]]),
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
    // The provider used to re-declare this union, which a regex had to keep in step. It now
    // imports the contract type, so drift is a compile error — a stronger guarantee than this
    // test can give. What remains worth asserting is that it has not gone back to a local copy,
    // and that the union still lives in the contract with the members the vocabulary declares.
    const provider = readFileSync(root("src/providers/direction-provider.tsx"), "utf8");
    expect(provider).toMatch(/import\s+type\s*\{[^}]*\bDirection\b[^}]*\}\s*from\s*"@\/contracts/);
    expect(provider).not.toMatch(/^type Direction\s*=/m);

    // The contract derives the type from the vocabulary array rather than restating it, so the
    // members are asserted against that array's source text. Comparing the imported `DIRECTIONS`
    // to a union parsed out of the same file would be circular.
    const contract = readFileSync(root("src/contracts/direction.ts"), "utf8");
    const declared = [
      ...(/DIRECTIONS\s*=\s*\[([^\]]+)\]/.exec(contract)?.[1] ?? "").matchAll(/"([^"]+)"/g),
    ]
      .map((m) => m[1])
      .sort();
    expect(declared).toEqual([...DIRECTIONS].sort());
    expect(contract).toMatch(/type Direction = \(typeof DIRECTIONS\)\[number\]/);
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

describe("promotion evidence (GOV-001)", () => {
  it("accepts `stable` when the evidence is there", () => {
    expect(validate([validEntry()]).errors).toEqual([]);
  });

  it("rejects `stable` with no unit suite, and names what is missing", () => {
    const entry = validEntry({ testing: { ...validEntry().testing, unit: false } });
    expect(issues(validate([entry]))).toContain("a unit test suite");
  });

  it("rejects `stable` with no axe test", () => {
    const entry = validEntry({ testing: { ...validEntry().testing, accessibility: false } });
    expect(issues(validate([entry]))).toContain("a test that runs axe");
  });

  it("rejects `stable` with an unaudited semantic dimension", () => {
    // The clause that moved 68 components to beta: a component nothing asserts the semantics of
    // is not a stability promise anybody has earned.
    const accessibility = validEntry().accessibility as Record<string, unknown>;
    const entry = validEntry({
      accessibility: {
        ...accessibility,
        dimensions: {
          ...(accessibility.dimensions as Record<string, string>),
          semantic: "not-audited",
        },
      },
    });
    expect(issues(validate([entry]))).toContain("an audited `semantic` dimension");
  });

  it("holds `beta` to none of it", () => {
    const entry = validEntry({
      status: "beta",
      testing: {
        unit: false,
        accessibility: false,
        interaction: false,
        visual: false,
        hydration: false,
      },
    });
    expect(entry.status).toBe("beta");
    expect(issues(validate([entry]))).not.toContain("without the evidence for it");
  });

  it("requires the registry entry to declare a status rather than inherit one", () => {
    const result = validate([validEntry()], {
      registry: { "example-widget": { accessibility: { required: true, pattern: "button" } } },
    });
    expect(issues(result)).toContain("does not declare a status");
  });
});

describe("deprecation records point somewhere real (GOV-001)", () => {
  const deprecated = (deprecation: Record<string, unknown>) =>
    validEntry({
      status: "deprecated",
      deprecated: true,
      deprecation: {
        since: "1.0.0",
        reason: "Renamed.",
        replacement: null,
        migration: null,
        removeIn: null,
        ...deprecation,
      },
    });

  it("accepts a replacement that resolves to another component", () => {
    const result = validate([
      deprecated({ replacement: "ExampleWidget" }),
      validEntry({ slug: "other-widget", name: "OtherWidget" }),
    ]);
    expect(issues(result)).not.toContain("not a component in this library");
  });

  it("rejects a replacement nobody can import", () => {
    // A migration path that points at nothing is worse than no migration path: it reads as
    // guidance and cannot be followed.
    expect(issues(validate([deprecated({ replacement: "ThingThatNeverShipped" })]))).toContain(
      "not a component in this library",
    );
  });

  it("rejects a removal announced for a minor", () => {
    const result = validate([deprecated({ removeIn: "1.4.0", replacement: "ExampleWidget" })]);
    expect(result.errors.map((error) => error.expected).join("\n")).toContain(
      "a removal cannot ship in a minor or a patch",
    );
  });

  it("rejects a removal announced for a version already released", () => {
    const result = validate([deprecated({ removeIn: "1.0.0", replacement: "ExampleWidget" })], {
      packageVersion: "1.4.2",
    });
    expect(issues(result)).toContain("already 1.4.2");
  });

  it("rejects a removal version with no replacement and no explanation", () => {
    expect(issues(validate([deprecated({ removeIn: "2.0.0" })]))).toContain(
      "announces a removal version with no replacement",
    );
  });
});

describe("derived claims are re-derived, not trusted (MAN-001)", () => {
  it("rejects a testing claim the sources do not support", () => {
    const result = validate([validEntry()], {
      testEvidence: { "example-widget": { interaction: true } },
    });
    expect(issues(result)).toContain("testing.interaction is false but the sources say true");
  });

  it("rejects a wrong deep import", () => {
    expect(issues(validate([validEntry({ deepImport: "@qeetrix/ui/example-widget" })]))).toContain(
      "deepImport is",
    );
  });

  it("rejects a group import that names the wrong category", () => {
    expect(
      issues(validate([validEntry({ groupImport: "@qeetrix/ui/components/inputs" })])),
    ).toContain("groupImport is");
  });

  it("rejects an undeclared manifest field, and a missing declared one", () => {
    const result = validateManifest({
      manifest: {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        count: 0,
        generated: "2026-01-01",
        surpriseField: true,
        components: [],
      },
      vocabulary,
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      schemaFields: { document: ["schemaVersion", "count", "generated", "components"] },
    });
    expect(issues(result)).toContain('emits an undeclared top-level field "surpriseField"');
  });

  it("rejects a timestamp where a date belongs", () => {
    const result = validateManifest({
      manifest: {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        count: 0,
        generated: "2026-01-01T09:31:00+05:30",
        components: [],
      },
      vocabulary,
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      schemaFields: { document: ["schemaVersion", "count", "generated", "components"] },
    });
    expect(issues(result)).toContain("generated is");
  });

  it("rejects a tally that is missing a vocabulary key", () => {
    const result = validateManifest({
      manifest: {
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        count: 1,
        generated: "2026-01-01",
        categories: { actions: 1 },
        statuses: { stable: 1 },
        accessibilityAudit: { "not-audited": 1 },
        components: [validEntry()],
      },
      vocabulary,
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      categoryMap: { actions: ["example-widget"] },
      schemaFields: {
        document: [
          "schemaVersion",
          "count",
          "generated",
          "categories",
          "statuses",
          "accessibilityAudit",
          "components",
        ],
      },
    });
    // Only the keys that happened to be present were checked before, so a whole audit state
    // could vanish from the summary and read as zero to every consumer.
    expect(issues(result)).toContain('accessibilityAudit has no entry for "audited"');
  });
});

describe("reading axis props off the source (CVA-001)", () => {
  const axes = (slug: string, category: string) =>
    readPropAxes(root(`src/components/${category}/${slug}.tsx`), vocabulary.AXIS_PROP_NAMES);

  it("finds an axis declared inline on the component's parameter", () => {
    // The dominant shape in this library: `function Avatar({ size }: Root.Props & { size?: … })`.
    // Reading only named exported types found 1 of the 21 axes there are.
    expect(axes("avatar", "data-display")).toEqual(["size"]);
    expect(axes("switch", "selection")).toEqual(["size"]);
  });

  it("finds an axis declared on an exported …Props type", () => {
    expect(axes("card", "surfaces")).toEqual(["size"]);
  });

  it("finds an axis on a sub-component, not just the root", () => {
    // ContextMenuItem is the one with the variant; the root has none.
    expect(axes("context-menu", "navigation")).toEqual(["variant"]);
  });

  it("reports nothing for a component with no axis-shaped prop", () => {
    expect(axes("separator", "utility")).toEqual([]);
    expect(axes("skeleton", "feedback")).toEqual([]);
  });

  it("agrees with the manifest for every component", () => {
    // The gate's whole premise: a `null` axis in the manifest must mean the props declare none.
    const unrecorded = manifest.components.filter((component) => {
      const entry = component as unknown as {
        slug: string;
        category: string;
        api: {
          variants: string[] | null;
          sizes: string[] | null;
          variantGroups: string[] | null;
          domainAxes: string[] | null;
          axisSources: Record<string, unknown> | null;
        };
      };
      const recorded = new Set([
        ...(entry.api.variants !== null ? ["variant"] : []),
        ...(entry.api.sizes !== null ? ["size"] : []),
        ...(entry.api.variantGroups ?? []),
        ...(entry.api.domainAxes ?? []),
        ...Object.keys(entry.api.axisSources ?? {}),
      ]);
      return axes(entry.slug, entry.category).some((axis) => !recorded.has(axis));
    });
    expect(unrecorded.map((component) => (component as unknown as { slug: string }).slug)).toEqual(
      [],
    );
  });
});

describe("variant axes are recorded or explained (CVA-001)", () => {
  it("accepts a component whose props declare no axis", () => {
    const entry = validEntry({
      api: { ...(validEntry().api as object), variants: null, sizes: null, variantGroups: null },
    });
    expect(issues(validate([entry], { propAxes: { "example-widget": [] } }))).not.toContain(
      "records no axis",
    );
  });

  it("rejects an axis-shaped prop with nothing recorded for it", () => {
    // `null` cannot mean both "no size axis" and "a size axis nobody wrote down".
    const entry = validEntry({
      api: { ...(validEntry().api as object), variants: null, sizes: null, variantGroups: null },
    });
    expect(issues(validate([entry], { propAxes: { "example-widget": ["size"] } }))).toContain(
      'has a public "size" prop but records no axis for it',
    );
  });

  it("accepts it once the source of the values is recorded", () => {
    const entry = validEntry({
      api: {
        ...(validEntry().api as object),
        variants: null,
        sizes: null,
        variantGroups: null,
        axisSources: { size: { source: "data-attribute", note: "data-size: default | sm." } },
      },
    });
    expect(issues(validate([entry], { propAxes: { "example-widget": ["size"] } }))).toEqual("");
  });

  it("rejects an axis record with no note", () => {
    const entry = validEntry({
      api: {
        ...(validEntry().api as object),
        axisSources: { size: { source: "data-attribute", note: "  " } },
      },
    });
    expect(issues(validate([entry], { propAxes: { "example-widget": ["size"] } }))).toContain(
      "has no note",
    );
  });

  it("rejects a record for a prop the component does not declare", () => {
    const entry = validEntry({
      api: {
        ...(validEntry().api as object),
        axisSources: { tone: { source: "cva", note: "stale." } },
      },
    });
    expect(issues(validate([entry], { propAxes: { "example-widget": [] } }))).toContain(
      "which its props do not declare",
    );
  });
});

describe("diagnostics", () => {
  it("names the component, the issue, the expectation and the file", () => {
    // `status: "beta"` so the only finding is the one under test — a `stable` component with no
    // recorded pattern fails the promotion-evidence check too, and would come first.
    const [finding] = validate([
      validEntry({
        status: "beta",
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

describe("density applicability is reviewed per slug (DENSITY-001)", () => {
  type Recorded = { density: string; evidence: string };
  const snapshot: { components: Record<string, Recorded> } = JSON.parse(
    readFileSync(root("scripts/config/density-applicability.json"), "utf8"),
  );
  const recorded = snapshot.components;
  const declaredDensity = (slug: string) =>
    (COMPONENT_REGISTRY as Record<string, { capabilities?: { density?: string } }>)[slug]
      ?.capabilities?.density;
  const densityOf = (entry: Record<string, never>) =>
    (entry as unknown as { capabilities: { density: string } }).capabilities.density;
  const slugOf = (entry: Record<string, never>) => (entry as unknown as { slug: string }).slug;

  it("records a value and a reason for every component, and for nothing else", () => {
    const slugs = manifest.components.map(slugOf).sort();
    expect(Object.keys(recorded).sort()).toEqual(slugs);
    for (const [slug, entry] of Object.entries(recorded)) {
      expect(DENSITY_APPLICABILITY, slug).toContain(entry.density);
      // The whole point of the file. A value with nothing behind it is the original defect.
      expect(entry.evidence.trim().length, slug).toBeGreaterThan(20);
    }
  });

  it("agrees with the manifest slug by slug", () => {
    const disagreements = manifest.components
      .filter((entry) => recorded[slugOf(entry)]?.density !== densityOf(entry))
      .map((entry) => `${slugOf(entry)}: ${densityOf(entry)}`);
    expect(disagreements).toEqual([]);
  });

  it("declares every value derivation may not produce, and no value it may", () => {
    const derivable = new Set<string>(DERIVABLE_DENSITY_APPLICABILITY);
    const undeclared = manifest.components
      .filter((entry) => !derivable.has(densityOf(entry)) && !declaredDensity(slugOf(entry)))
      .map(slugOf);
    expect(undeclared).toEqual([]);

    /**
     * The other direction, which matters more than it looks.
     *
     * A registry declaration wins over the derived signal. So declaring a value derivation could
     * have reached anyway does not just add noise — `density: "unknown"` on a component would
     * pin it at `unknown` on the day someone finally makes it read a metric, and the manifest
     * would report the backlog entry forever. The four families still on `unknown` are therefore
     * deliberately silent in the registry.
     */
    const pinned = manifest.components
      .filter((entry) => declaredDensity(slugOf(entry)) === "unknown")
      .map(slugOf);
    expect(pinned).toEqual([]);
  });

  it("says what would settle each remaining unknown", () => {
    const unknowns = Object.entries(recorded).filter(([, e]) => e.density === "unknown");
    // Four, and shrinking is the only allowed direction. Named so a fifth cannot appear quietly.
    expect(unknowns.map(([slug]) => slug).sort()).toEqual([
      "checkbox",
      "radio-group",
      "rating",
      "switch",
    ]);
    for (const [slug, entry] of unknowns) {
      expect(entry.evidence, slug).toMatch(/settle|ruling|decision/i);
    }
  });

  /**
   * The four `supported` claims that are not visible in their own source.
   *
   * `IconButton` and the three Input wrappers inherit a density-resolved height from the
   * component they render. Nothing in their own files says so, so the claim rests on two facts
   * that live elsewhere and could each be changed by someone who has never read this file: the
   * inherited size still resolves a density metric, and the wrapper still asks for that size.
   * Button's density-resolved height is on `default`/`icon` only — `CloseButton` pins `icon-sm`
   * and is `unsupported` for exactly that reason — so the prop default is load-bearing.
   */
  it("holds the inherited density claims to the source they depend on", () => {
    const read = (path: string) => readFileSync(root("src/components", path), "utf8");

    const button = read("actions/button.tsx");
    expect(button).toContain('icon: "size-[var(--qx-component-button-height)]"');
    expect(read("actions/icon-button.tsx")).toContain('size = "icon"');

    // Input has no size axis: one height, and it is density-resolved.
    expect(read("inputs/input.tsx")).toContain("h-[var(--qx-component-input-height)]");
    for (const wrapper of ["currency-input", "mask-input", "password-input"]) {
      const source = read(`inputs/${wrapper}.tsx`);
      expect(source, wrapper).toContain('from "@/components/inputs/input"');
      expect(source, wrapper).toMatch(/<Input\b/);
    }

    for (const slug of ["icon-button", "currency-input", "mask-input", "password-input"]) {
      expect(recorded[slug].density, slug).toBe("supported");
    }
  });
});

describe("a deprecated prop is not a deprecated component", () => {
  /**
   * The marker used to be `/@deprecated\b/` over the whole file, which cannot tell a module
   * header from one prop's JSDoc. Carousel deprecated a single message prop and the manifest
   * reported the component deprecated, which then failed the gate against its `stable` status.
   * Only column-0 comments count now: a module header, or the JSDoc above an exported function.
   */
  it("reads the marker from top-level comments only", () => {
    expect(
      hasDeprecationMarker(
        [
          '"use client";',
          "",
          "interface Props {",
          "  /** @deprecated Use `x`. */",
          "  old?: string;",
          "}",
        ].join("\n"),
      ),
    ).toBe(false);
    expect(hasDeprecationMarker("// @deprecated — use Pagination.\nexport {};")).toBe(true);
    expect(hasDeprecationMarker("/**\n * @deprecated Use Pagination.\n */\nexport {};")).toBe(true);
    expect(hasDeprecationMarker('"use client";\nexport {};')).toBe(false);
  });

  it("agrees with the repository: exactly one component carries the marker", () => {
    const marked = manifest.components
      .map((entry) => entry as unknown as { slug: string; category: string; deprecated: boolean })
      .filter((entry) => entry.deprecated)
      .map((entry) => entry.slug);
    expect(marked).toEqual(["pagination-bar"]);
  });
});
