/**
 * The architecture layers of @qeetrix/ui, and the dependency rules between them.
 *
 * This module is the single source of truth for the layering. `scripts/check/architecture.mjs`
 * reads these declarations statically and enforces them against the real module graph, and
 * docs/architecture/dependency-rules.md is written from the same table.
 *
 * The direction of flow is:
 *
 *     tokens → foundations → runtime / primitives → components → blocks
 *
 * with `lib`, `hooks` and `providers` as supporting layers that may never reach forward into
 * `components` or `blocks`.
 *
 * Dependencies are **deny by default**: an edge is legal only if the target layer appears in
 * the source layer's entry in `LAYER_ALLOWED_DEPENDENCIES`. That is what makes the forbidden
 * cases (`tokens → components`, `components → blocks`, `primitives → blocks`,
 * `runtime → components`, …) hold automatically, including for layers that do not exist on
 * disk yet: the rule is live the moment the first file lands there.
 *
 * @see docs/architecture/component-layers.md
 * @see docs/architecture/dependency-rules.md
 */

/** Every layer the source tree recognises, ordered from most foundational to most composed. */
export const ARCHITECTURE_LAYERS = [
  "tokens",
  "styles",
  "contracts",
  "manifests",
  "foundations",
  "runtime",
  "lib",
  "hooks",
  "primitives",
  "providers",
  "brand",
  "components",
  "blocks",
  "entry",
  "tests",
] as const;
export type ArchitectureLayer = (typeof ARCHITECTURE_LAYERS)[number];

/**
 * The layers that hold renderable component code. A `ComponentContract.layer` is one of
 * these — a token or a hook is not a component.
 */
export const COMPONENT_LAYERS = ["primitives", "components", "blocks"] as const;
export type ComponentLayer = (typeof COMPONENT_LAYERS)[number];

/**
 * Where each layer lives, as a path relative to the package root.
 *
 * `foundations`, `runtime` and `primitives` are declared but not yet populated: the target
 * architecture reserves them, and their rules are enforced from the first file onwards.
 * Nothing is moved into them in Phase 1 — see docs/architecture/overview.md § Migration.
 */
export const LAYER_DIRECTORIES = {
  tokens: "src/tokens",
  styles: "src/styles",
  contracts: "src/contracts",
  manifests: "src/manifests",
  foundations: "src/foundations",
  runtime: "src/runtime",
  lib: "src/lib",
  hooks: "src/hooks",
  primitives: "src/primitives",
  providers: "src/providers",
  brand: "src/brand",
  components: "src/components",
  blocks: "src/blocks",
  entry: "src/index.ts",
  tests: "src/__tests__",
} as const satisfies Record<ArchitectureLayer, string>;

/**
 * The allow-list. `LAYER_ALLOWED_DEPENDENCIES[source]` is the complete set of layers that
 * `source` may import from — anything absent is a violation.
 *
 * Same-layer imports are listed explicitly rather than implied, because two layers
 * (`tokens`, `styles`) legitimately have no internal imports at all and one (`contracts`)
 * must stay closed.
 */
export const LAYER_ALLOWED_DEPENDENCIES = {
  // Data, not code. Tokens are JSON compiled by Style Dictionary; they import nothing.
  tokens: [],
  styles: [],

  // Types and vocabularies. Closed on purpose: a contract that imports a component could
  // not be read by a build script.
  contracts: ["contracts"],
  manifests: ["contracts", "manifests"],

  // Token-derived values and framework-free helpers.
  foundations: ["foundations", "tokens"],
  runtime: ["runtime", "foundations", "tokens"],
  lib: ["lib", "runtime", "foundations", "tokens"],
  hooks: ["hooks", "lib", "runtime", "foundations", "tokens"],

  // Renderable code.
  primitives: ["primitives", "hooks", "lib", "runtime", "foundations", "tokens"],
  providers: ["providers", "hooks", "lib", "runtime", "foundations", "contracts", "tokens"],
  brand: ["brand", "lib", "runtime", "foundations", "tokens"],
  components: [
    "components",
    "primitives",
    "providers",
    "brand",
    "hooks",
    "lib",
    "runtime",
    "foundations",
    "contracts",
    "tokens",
  ],
  blocks: [
    "blocks",
    "components",
    "primitives",
    "providers",
    "brand",
    "hooks",
    "lib",
    "runtime",
    "foundations",
    "contracts",
    "tokens",
  ],

  // src/index.ts — the published barrel. It composes the surface, so it may reach anywhere
  // except the test harness.
  entry: [
    "blocks",
    "components",
    "primitives",
    "providers",
    "brand",
    "hooks",
    "lib",
    "runtime",
    "foundations",
    "manifests",
    "contracts",
    "tokens",
  ],
} as const satisfies Record<LayeredSource, readonly ArchitectureLayer[]>;

/**
 * Layers whose files are excluded from dependency enforcement.
 *
 * Test files are not part of the shipped module graph: a harness legitimately imports a
 * component, a provider and a lib helper in the same file. Enforcement therefore skips any
 * file under a `__tests__/` folder or named `*.test.ts(x)`, wherever it lives — the colocated
 * `src/components/<category>/__tests__/` suites included.
 */
export const LAYER_RULE_EXEMPT_LAYERS = ["tests"] as const;

/** The layers that dependency rules are declared for — everything except the test harness. */
export type LayeredSource = Exclude<ArchitectureLayer, (typeof LAYER_RULE_EXEMPT_LAYERS)[number]>;

/**
 * Forbidden edges called out by name, so the checker can explain *why* rather than only
 * that the target is missing from an allow-list. Purely for diagnostics — the allow-list
 * above is what is actually enforced.
 */
export const LAYER_RULE_EXPLANATIONS = {
  "tokens->components": "tokens are data and must not reach into component code",
  "tokens->blocks": "tokens are data and must not reach into block code",
  "foundations->components": "foundations sit below components; invert the dependency",
  "foundations->blocks": "foundations sit below blocks; invert the dependency",
  "runtime->components": "runtime is component-agnostic; pass behaviour in instead",
  "runtime->blocks": "runtime is block-agnostic; pass behaviour in instead",
  "primitives->components": "a primitive must not depend on a composed component",
  "primitives->blocks": "a primitive must not depend on a block",
  "components->blocks": "components cannot depend on blocks — blocks compose components",
  "contracts->components": "contracts must stay readable by build scripts; keep them type-only",
  "hooks->components": "a hook must not render or import components",
  "providers->components": "providers wrap children; they must not import components",
} as const;
