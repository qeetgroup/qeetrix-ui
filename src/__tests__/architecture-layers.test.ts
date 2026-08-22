/**
 * The layer rules, tested against synthetic graphs and then against the real one.
 *
 * Synthetic first, deliberately: the repository currently has no layer violations, so a test
 * that only ran against real code would pass whether or not the checker worked. Each rule is
 * exercised on a hand-built module graph, and the real graph is then asserted clean — which is
 * the regression guard for the architecture itself.
 */
import { describe, expect, it } from "vitest";
import {
  LAYER_ALLOWED_ASSET_DEPENDENCIES,
  LAYER_ALLOWED_DEPENDENCIES,
  LAYER_DIRECTORIES,
  LAYER_RULE_EXPLANATIONS,
} from "@/contracts/layers";
import {
  buildModuleGraph,
  categoryOf,
  findAssetDependencyViolations,
  findDeepLayerViolations,
  findLayerViolations,
  findRelativeEscapes,
  findRuleSetProblems,
  isAssetPath,
  isTestPath,
  layerOf,
  resolveSpecifier,
} from "../../scripts/lib/layers.mjs";
import { readLiteralExportsFromDirectory } from "../../scripts/lib/ts-literals.mjs";

const ROOT = process.cwd();
const vocabulary = readLiteralExportsFromDirectory(`${ROOT}/src/contracts`);

/** Build a module graph from `file → [imports]` plus a layer for each file. */
function graph(entries: Record<string, { layer: string; imports?: string[] }>) {
  return new Map(
    Object.entries(entries).map(([file, node]) => [
      file,
      { file, layer: node.layer, imports: node.imports ?? [], test: isTestPath(file) },
    ]),
  );
}

/**
 * The richer node shape the resolved-identity rules read: each edge keeps the specifier as
 * written *and* the file it resolved to, and an asset is marked as one.
 *
 * Built by hand for the same reason the graphs above are: the repository has no cross-category
 * relative import and no component importing a stylesheet, so a test that only ran against real
 * code would pass whether or not the rule worked.
 */
function resolvedGraph(
  entries: Record<
    string,
    { layer: string; asset?: boolean; edges?: { specifier: string; target: string | null }[] }
  >,
) {
  return new Map(
    Object.entries(entries).map(([file, node]) => [
      file,
      {
        file,
        layer: node.layer,
        category: categoryOf(file),
        asset: node.asset ?? isAssetPath(file),
        edges: node.edges ?? [],
        imports: (node.edges ?? []).map((edge) => edge.target).filter((t) => t !== null),
        test: isTestPath(file),
      },
    ]),
  );
}

const check = (modules: ReturnType<typeof graph>, allowed = LAYER_ALLOWED_DEPENDENCIES) =>
  findLayerViolations({
    modules,
    allowed,
    explanations: LAYER_RULE_EXPLANATIONS,
  });

describe("layer attribution", () => {
  it("maps each directory to its layer", () => {
    expect(layerOf("src/components/actions/button.tsx", LAYER_DIRECTORIES)).toBe("components");
    expect(layerOf("src/internal/portal.tsx", LAYER_DIRECTORIES)).toBe("internal");
    expect(layerOf("src/lib/utils.ts", LAYER_DIRECTORIES)).toBe("lib");
    expect(layerOf("src/contracts/component.ts", LAYER_DIRECTORIES)).toBe("contracts");
    expect(layerOf("src/manifests/component-registry.ts", LAYER_DIRECTORIES)).toBe("manifests");
  });

  it("matches the entry point exactly rather than as a prefix", () => {
    expect(layerOf("src/index.ts", LAYER_DIRECTORIES)).toBe("entry");
    expect(layerOf("src/index-legacy.ts", LAYER_DIRECTORIES)).toBeNull();
  });

  it("does not let one layer swallow a similarly named sibling", () => {
    expect(layerOf("src/components-legacy/button.tsx", LAYER_DIRECTORIES)).toBeNull();
  });

  it("recognises test files wherever they live", () => {
    expect(isTestPath("src/components/actions/__tests__/button.test.tsx")).toBe(true);
    expect(isTestPath("src/__tests__/a11y.test.tsx")).toBe(true);
    expect(isTestPath("src/components/actions/button.tsx")).toBe(false);
  });
});

describe("module resolution", () => {
  it("resolves the @/ alias to a real file", () => {
    expect(resolveSpecifier("@/lib/utils", "src/components/actions/button.tsx", ROOT)).toBe(
      "src/lib/utils.ts",
    );
  });

  it("resolves a relative sibling", () => {
    expect(resolveSpecifier("./button", "src/components/Button/index.ts", ROOT)).toBe(
      "src/components/Button/button.tsx",
    );
  });

  it("resolves a directory to its index", () => {
    expect(resolveSpecifier("@/providers", "src/index.ts", ROOT)).toBe("src/providers/index.ts");
  });

  it("ignores external packages", () => {
    expect(resolveSpecifier("react", "src/index.ts", ROOT)).toBeNull();
    expect(resolveSpecifier("@base-ui/react/dialog", "src/index.ts", ROOT)).toBeNull();
  });

  it("returns null for an alias that resolves to nothing", () => {
    expect(resolveSpecifier("@/nowhere/at-all", "src/index.ts", ROOT)).toBeNull();
  });
});

describe("allowed dependencies", () => {
  it("permits a component importing a component, a lib helper and a provider", () => {
    const modules = graph({
      "src/components/surfaces/dialog.tsx": {
        layer: "components",
        imports: [
          "src/components/actions/button.tsx",
          "src/lib/utils.ts",
          "src/providers/density-provider.tsx",
        ],
      },
      "src/components/actions/button.tsx": { layer: "components" },
      "src/lib/utils.ts": { layer: "lib" },
      "src/providers/density-provider.tsx": { layer: "providers" },
    });
    expect(check(modules)).toEqual([]);
  });

  it("permits entry importing a component", () => {
    const modules = graph({
      "src/index.ts": { layer: "entry", imports: ["src/components/Button/button.tsx"] },
      "src/components/Button/button.tsx": { layer: "components" },
    });
    expect(check(modules)).toEqual([]);
  });

  it("permits a hook importing a lib helper", () => {
    const modules = graph({
      "src/hooks/use-mobile.ts": { layer: "hooks", imports: ["src/lib/responsive.ts"] },
      "src/lib/responsive.ts": { layer: "lib" },
    });
    expect(check(modules)).toEqual([]);
  });
});

describe("forbidden dependencies", () => {
  it("rejects a component importing entry, and says why", () => {
    const modules = graph({
      "src/components/Button/button.tsx": {
        layer: "components",
        imports: ["src/index.ts"],
      },
      "src/index.ts": { layer: "entry" },
    });
    expect(check(modules)).toHaveLength(1);
    expect(check(modules)[0].sourceLayer).toBe("components");
    expect(check(modules)[0].targetLayer).toBe("entry");
  });

  it("rejects internal importing components", () => {
    const modules = graph({
      "src/internal/portal.tsx": { layer: "internal", imports: ["src/components/Button/button.tsx"] },
      "src/components/Button/button.tsx": { layer: "components" },
    });
    expect(check(modules)[0]?.rule).toBe("an internal primitive must not depend on a composed component");
  });

  it("rejects runtime reaching into components", () => {
    const modules = graph({
      "src/runtime/focus.ts": { layer: "runtime", imports: ["src/components/actions/button.tsx"] },
      "src/components/actions/button.tsx": { layer: "components" },
    });
    expect(check(modules)[0]?.rule).toBe(
      "runtime is component-agnostic; pass behaviour in instead",
    );
  });

  it("rejects a provider importing a component", () => {
    const modules = graph({
      "src/providers/theme-provider.tsx": {
        layer: "providers",
        imports: ["src/components/actions/button.tsx"],
      },
      "src/components/actions/button.tsx": { layer: "components" },
    });
    expect(check(modules)).toHaveLength(1);
  });

  it("rejects a contract importing anything outside contracts", () => {
    const modules = graph({
      "src/contracts/component.ts": { layer: "contracts", imports: ["src/lib/utils.ts"] },
      "src/lib/utils.ts": { layer: "lib" },
    });
    expect(check(modules)).toHaveLength(1);
  });

  it("exempts test files", () => {
    const modules = graph({
      "src/lib/__tests__/motion.test.ts": {
        layer: "lib",
        imports: ["src/components/Button/button.tsx", "src/index.ts"],
      },
      "src/components/Button/button.tsx": { layer: "components" },
      "src/index.ts": { layer: "entry" },
    });
    expect(check(modules)).toEqual([]);
  });

  it("reports a layer with no declared rules", () => {
    const modules = graph({ "src/mystery/thing.ts": { layer: "mystery" } });
    expect(check(modules)[0]?.rule).toContain('no dependency rules are declared for the "mystery"');
  });
});

describe("deep dependencies", () => {
  it("names the whole chain when a violation is buried behind a legal import", () => {
    const modules = graph({
      "src/components/actions/icon-button.tsx": {
        layer: "components",
        imports: ["src/components/actions/button.tsx"],
      },
      "src/components/actions/button.tsx": {
        layer: "components",
        imports: ["src/blocks/dashboard-shell.tsx"],
      },
      "src/blocks/dashboard-shell.tsx": { layer: "blocks" },
    });
    const deep = findDeepLayerViolations({ modules, allowed: LAYER_ALLOWED_DEPENDENCIES });
    expect(deep).toContainEqual({
      file: "src/components/actions/icon-button.tsx",
      sourceLayer: "components",
      targetLayer: "blocks",
      path: [
        "src/components/actions/icon-button.tsx",
        "src/components/actions/button.tsx",
        "src/blocks/dashboard-shell.tsx",
      ],
    });
  });

  it("stays quiet when every hop is legal", () => {
    const modules = graph({
      "src/blocks/auth.tsx": { layer: "blocks", imports: ["src/components/inputs/field.tsx"] },
      "src/components/inputs/field.tsx": { layer: "components", imports: ["src/lib/utils.ts"] },
      "src/lib/utils.ts": { layer: "lib" },
    });
    expect(findDeepLayerViolations({ modules, allowed: LAYER_ALLOWED_DEPENDENCIES })).toEqual([]);
  });
});

describe("the rule set itself", () => {
  it("is acyclic and transitively closed", () => {
    expect(findRuleSetProblems(LAYER_ALLOWED_DEPENDENCIES)).toEqual([]);
  });

  it("catches a cycle between two layers", () => {
    const problems = findRuleSetProblems({ components: ["blocks"], blocks: ["components"] });
    expect(problems.map((p: { kind: string }) => p.kind)).toContain("cycle");
  });

  it("catches a rule set a legal chain could escape through", () => {
    const problems = findRuleSetProblems({ blocks: ["components"], components: ["lib"], lib: [] });
    expect(problems.map((p: { kind: string }) => p.kind)).toContain("not-transitively-closed");
    expect(problems[0]?.message).toContain("blocks → lib is not allowed");
  });

  it("is read identically by the static reader the checker uses", () => {
    expect(vocabulary.LAYER_ALLOWED_DEPENDENCIES).toEqual(LAYER_ALLOWED_DEPENDENCIES);
    expect(vocabulary.LAYER_DIRECTORIES).toEqual(LAYER_DIRECTORIES);
  });
});

describe("category identity", () => {
  it("reads the category off the resolved path, whatever named it", () => {
    expect(categoryOf("src/components/inputs/input.tsx")).toBe("inputs");
    expect(categoryOf("src/components/inputs/__tests__/input.test.tsx")).toBe("inputs");
  });

  it("has no category for a file that is not inside one", () => {
    expect(categoryOf("src/components/index.ts")).toBeNull();
    expect(categoryOf("src/lib/utils.ts")).toBeNull();
    // `src/components-legacy` must not be read as the `-legacy` category of `src/components`.
    expect(categoryOf("src/components-legacy/actions/button.tsx")).toBeNull();
  });
});

describe("relative imports that leave their own directory", () => {
  it("catches ../<category>/…, which the old specifier pattern missed entirely", () => {
    const modules = resolvedGraph({
      "src/components/actions/button.tsx": {
        layer: "components",
        edges: [{ specifier: "../inputs/input", target: "src/components/inputs/input.tsx" }],
      },
      "src/components/inputs/input.tsx": { layer: "components" },
    });
    const found = findRelativeEscapes({ modules });
    expect(found).toHaveLength(1);
    expect(found[0].fromCategory).toBe("actions");
    expect(found[0].toCategory).toBe("inputs");
    expect(found[0].rule).toContain("@/components/inputs");
  });

  it("catches ../../components/<category>/…, the form the old pattern did match", () => {
    const modules = resolvedGraph({
      "src/components/actions/button.tsx": {
        layer: "components",
        edges: [
          { specifier: "../../components/inputs/input", target: "src/components/inputs/input.tsx" },
        ],
      },
      "src/components/inputs/input.tsx": { layer: "components" },
    });
    expect(findRelativeEscapes({ modules })).toHaveLength(1);
  });

  it("catches a relative import that leaves the components tree altogether", () => {
    const modules = resolvedGraph({
      "src/components/actions/button.tsx": {
        layer: "components",
        edges: [{ specifier: "../../lib/utils", target: "src/lib/utils.ts" }],
      },
      "src/lib/utils.ts": { layer: "lib" },
    });
    const found = findRelativeEscapes({ modules });
    expect(found).toHaveLength(1);
    expect(found[0].rule).toContain("@/ alias");
  });

  it("leaves ./sibling and @/alias imports alone", () => {
    const modules = resolvedGraph({
      "src/components/actions/button.tsx": {
        layer: "components",
        edges: [
          { specifier: "./button-parts", target: "src/components/actions/button-parts.tsx" },
          { specifier: "@/components/Input/input", target: "src/components/inputs/input.tsx" },
          { specifier: "react", target: null },
        ],
      },
      "src/components/actions/button-parts.tsx": { layer: "components" },
      "src/components/inputs/input.tsx": { layer: "components" },
    });
    expect(findRelativeEscapes({ modules })).toEqual([]);
  });

  it("exempts test files, which legitimately reach outside src/", () => {
    const modules = resolvedGraph({
      "src/__tests__/architecture-layers.test.ts": {
        layer: "tests",
        edges: [{ specifier: "../../scripts/lib/layers.mjs", target: "scripts/lib/layers.mjs" }],
      },
    });
    expect(findRelativeEscapes({ modules })).toEqual([]);
  });
});

describe("non-TypeScript production inputs", () => {
  const allowedAssets = LAYER_ALLOWED_ASSET_DEPENDENCIES as Record<string, readonly string[]>;

  it("rejects a component importing a stylesheet", () => {
    const modules = resolvedGraph({
      "src/components/actions/button.tsx": {
        layer: "components",
        edges: [{ specifier: "@/styles/index.css", target: "src/styles/index.css" }],
      },
      "src/styles/index.css": { layer: "styles" },
    });
    const found = findAssetDependencyViolations({ modules, allowedAssets });
    expect(found).toHaveLength(1);
    expect(found[0].targetLayer).toBe("styles");
  });

  it("rejects a component importing a raw token file, which the module table would allow", () => {
    const modules = resolvedGraph({
      "src/components/actions/button.tsx": {
        layer: "components",
        edges: [
          { specifier: "@/tokens/primitive/color.json", target: "src/tokens/primitive/color.json" },
        ],
      },
      "src/tokens/primitive/color.json": { layer: "tokens" },
    });
    // The module allow-list permits components → tokens; the asset table does not, which is
    // the whole reason it is a separate table.
    expect(check(modules as never)).toEqual([]);
    expect(findAssetDependencyViolations({ modules, allowedAssets })).toHaveLength(1);
  });

  it("permits an asset import once the layer is listed", () => {
    const modules = resolvedGraph({
      "src/styles/build.ts": {
        layer: "styles",
        edges: [{ specifier: "./tokens.json", target: "src/styles/tokens.json" }],
      },
      "src/styles/tokens.json": { layer: "styles" },
    });
    expect(
      findAssetDependencyViolations({ modules, allowedAssets: { styles: ["styles"] } }),
    ).toEqual([]);
  });

  it("exempts test files, which read the generated stylesheet to assert what it contains", () => {
    const modules = resolvedGraph({
      "src/__tests__/accessibility/environment.test.ts": {
        layer: "tests",
        edges: [{ specifier: "@/styles/index.css", target: "src/styles/index.css" }],
      },
      "src/styles/index.css": { layer: "styles" },
    });
    expect(findAssetDependencyViolations({ modules, allowedAssets })).toEqual([]);
  });

  it("classifies assets by extension, not by directory", () => {
    expect(isAssetPath("src/styles/index.css")).toBe(true);
    expect(isAssetPath("src/tokens/primitive/color.json")).toBe(true);
    expect(isAssetPath("src/components/actions/button.tsx")).toBe(false);
  });
});

describe("the real module graph", () => {
  const built = buildModuleGraph({ root: ROOT, layerDirectories: LAYER_DIRECTORIES });

  it("attributes every source file to a layer", () => {
    expect(built.unmapped).toEqual([]);
  });

  it("resolves every internal import", () => {
    expect(built.unresolved).toEqual([]);
  });

  it("has no forbidden dependencies", () => {
    expect(check(built.modules)).toEqual([]);
  });

  it("has no forbidden dependency chains", () => {
    expect(
      findDeepLayerViolations({ modules: built.modules, allowed: LAYER_ALLOWED_DEPENDENCIES }),
    ).toEqual([]);
  });

  it("has no relative import that leaves its own directory", () => {
    expect(findRelativeEscapes({ modules: built.modules })).toEqual([]);
  });

  it("has no ungoverned dependency on a stylesheet or token file", () => {
    expect(
      findAssetDependencyViolations({
        modules: built.modules,
        allowedAssets: LAYER_ALLOWED_ASSET_DEPENDENCIES,
      }),
    ).toEqual([]);
  });

  it("includes the non-TypeScript production inputs as nodes", () => {
    // Before assets were in the graph a component could import either of these and the gate
    // would report a clean TypeScript tree.
    expect(built.modules.get("src/styles/index.css")?.layer).toBe("styles");
    expect(built.modules.get("src/tokens/primitive/color.json")?.layer).toBe("tokens");
  });

  it("resolves the .js specifiers the brand subtree re-exports through", () => {
    // `src/brand/index.ts` names its children as "./logos/qeet-logo.js". Until that resolved,
    // the entire brand subtree was absent from the graph and no layer rule could see it.
    const brand = built.modules.get("src/brand/index.ts");
    expect(brand?.imports).toContain("src/brand/logos/qeet-logo.tsx");
  });
});
