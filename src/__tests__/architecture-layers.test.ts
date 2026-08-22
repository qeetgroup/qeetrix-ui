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
  LAYER_ALLOWED_DEPENDENCIES,
  LAYER_DIRECTORIES,
  LAYER_RULE_EXPLANATIONS,
} from "@/contracts/layers";
import {
  buildModuleGraph,
  findDeepLayerViolations,
  findLayerViolations,
  findRuleSetProblems,
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

const check = (modules: ReturnType<typeof graph>, allowed = LAYER_ALLOWED_DEPENDENCIES) =>
  findLayerViolations({
    modules,
    allowed,
    explanations: LAYER_RULE_EXPLANATIONS,
  });

describe("layer attribution", () => {
  it("maps each directory to its layer", () => {
    expect(layerOf("src/components/actions/button.tsx", LAYER_DIRECTORIES)).toBe("components");
    expect(layerOf("src/blocks/auth.tsx", LAYER_DIRECTORIES)).toBe("blocks");
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
    expect(resolveSpecifier("./button", "src/components/actions/index.ts", ROOT)).toBe(
      "src/components/actions/button.tsx",
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

  it("permits a block importing a component", () => {
    const modules = graph({
      "src/blocks/auth.tsx": { layer: "blocks", imports: ["src/components/actions/button.tsx"] },
      "src/components/actions/button.tsx": { layer: "components" },
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
  it("rejects a component importing a block, and says why", () => {
    const modules = graph({
      "src/components/actions/button.tsx": {
        layer: "components",
        imports: ["src/blocks/dashboard-shell.tsx"],
      },
      "src/blocks/dashboard-shell.tsx": { layer: "blocks" },
    });
    expect(check(modules)).toEqual([
      {
        file: "src/components/actions/button.tsx",
        dependency: "src/blocks/dashboard-shell.tsx",
        sourceLayer: "components",
        targetLayer: "blocks",
        rule: "components cannot depend on blocks — blocks compose components",
      },
    ]);
  });

  it("rejects a primitive importing a block", () => {
    const modules = graph({
      "src/primitives/press.ts": { layer: "primitives", imports: ["src/blocks/auth.tsx"] },
      "src/blocks/auth.tsx": { layer: "blocks" },
    });
    expect(check(modules)[0]?.rule).toBe("a primitive must not depend on a block");
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
        imports: ["src/components/actions/button.tsx", "src/blocks/auth.tsx"],
      },
      "src/components/actions/button.tsx": { layer: "components" },
      "src/blocks/auth.tsx": { layer: "blocks" },
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
    expect(problems.map((p) => p.kind)).toContain("cycle");
  });

  it("catches a rule set a legal chain could escape through", () => {
    const problems = findRuleSetProblems({ blocks: ["components"], components: ["lib"], lib: [] });
    expect(problems.map((p) => p.kind)).toContain("not-transitively-closed");
    expect(problems[0]?.message).toContain("blocks → lib is not allowed");
  });

  it("is read identically by the static reader the checker uses", () => {
    expect(vocabulary.LAYER_ALLOWED_DEPENDENCIES).toEqual(LAYER_ALLOWED_DEPENDENCIES);
    expect(vocabulary.LAYER_DIRECTORIES).toEqual(LAYER_DIRECTORIES);
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
});
