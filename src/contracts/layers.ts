/**
 * The architecture layers of @qeetrix/ui, and the dependency rules between them.
 *
 * This module is the single source of truth for the layering. `scripts/check/architecture.mjs`
 * reads these declarations statically and enforces them against the real module graph, and
 * docs/architecture/dependency-rules.md is written from the same table.
 *
 * The direction of flow is:
 *
 *     tokens → runtime / internal → components
 *
 * with `lib`, `hooks` and `providers` as supporting layers that may never reach forward into
 * `components`.
 *
 * Dependencies are **deny by default**: an edge is legal only if the target layer appears in
 * the source layer's entry in `LAYER_ALLOWED_DEPENDENCIES`. That is what makes the forbidden
 * cases (`tokens → components`, `runtime → components`, `internal → components`, …) hold
 * automatically, including for layers that do not exist on disk yet: the rule is live the
 * moment the first file lands there.
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
  "runtime",
  "lib",
  "hooks",
  "internal",
  "providers",
  "components",
  "blocks",
  "patterns",
  "entry",
  "tests",
] as const;
export type ArchitectureLayer = (typeof ARCHITECTURE_LAYERS)[number];

/**
 * The layers that hold renderable component code. A `ComponentContract.layer` is one of
 * these — a token or a hook is not a component.
 */
export const COMPONENT_LAYERS = ["internal", "components"] as const;
export type ComponentLayer = (typeof COMPONENT_LAYERS)[number];

/**
 * Where each layer lives, as a path relative to the package root.
 *
 * `runtime` is declared but not yet populated: the target architecture reserves it, and its
 * rules are enforced from the first file onwards.
 */
export const LAYER_DIRECTORIES = {
  tokens: "src/tokens",
  styles: "src/styles",
  contracts: "src/contracts",
  manifests: "src/manifests",
  runtime: "src/runtime",
  lib: "src/lib",
  hooks: "src/hooks",
  internal: "src/internal",
  providers: "src/providers",
  components: "src/components",
  blocks: "src/blocks",
  patterns: "src/patterns",
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

  // Framework-free helpers.
  runtime: ["runtime", "tokens"],
  lib: ["lib", "runtime", "tokens"],
  hooks: ["hooks", "lib", "runtime", "tokens"],

  // Renderable code.
  internal: ["internal", "hooks", "lib", "runtime", "tokens"],
  providers: ["providers", "hooks", "lib", "runtime", "contracts", "tokens"],
  components: [
    "components",
    "internal",
    "providers",
    "hooks",
    "lib",
    "runtime",
    "contracts",
    "tokens",
  ],

  // Copy-paste source built on the package and never published (tsconfig.build.json excludes
  // them): an app copies the file, so it may import only what an app can — the package entry,
  // `@qeetrix/ui`.
  blocks: ["entry"],
  patterns: ["entry"],

  // src/index.ts — the published barrel. It composes the surface, so it may reach anywhere
  // except the test harness.
  entry: [
    "components",
    "internal",
    "providers",
    "hooks",
    "lib",
    "runtime",
    "manifests",
    "contracts",
    "tokens",
  ],
} as const satisfies Record<LayeredSource, readonly ArchitectureLayer[]>;

/**
 * Non-TypeScript production inputs, governed explicitly.
 *
 * `LAYER_ALLOWED_ASSET_DEPENDENCIES[source]` is the complete set of layers `source` may import
 * a `.css` or `.json` file from. Absent means none — the same deny-by-default as
 * `LAYER_ALLOWED_DEPENDENCIES`, and the reason this table exists separately:
 *
 *   - `components` may depend on the `tokens` layer, because it reads *generated TypeScript*
 *     derived from it. Importing a raw token JSON is a different act: it bypasses the CSS
 *     bridge, ships the whole token file into the bundle, and hides the component's colour
 *     source from `check:token-usage`.
 *   - a stylesheet is a side effect. A component that imports one has decided, on behalf of
 *     every consumer, that the styles load — which is the choice `styles.css` exists to make
 *     once, at the package boundary.
 *
 * The table is empty on purpose: today nothing in the shipped tree imports an asset, and the
 * empty allow-list is what keeps it that way. A future entry is a reviewed decision, not a
 * side effect of somebody adding an import.
 *
 * Test files are exempt, as they are for module dependencies — a harness legitimately reads
 * the generated stylesheet to assert what it contains.
 */
export const LAYER_ALLOWED_ASSET_DEPENDENCIES = {} as const satisfies Partial<
  Record<LayeredSource, readonly ArchitectureLayer[]>
>;

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
  "runtime->components": "runtime is component-agnostic; pass behaviour in instead",
  "internal->components": "an internal primitive must not depend on a composed component",
  "contracts->components": "contracts must stay readable by build scripts; keep them type-only",
  "hooks->components": "a hook must not render or import components",
  "providers->components": "providers wrap children; they must not import components",
  "blocks->components": "a block is copied into apps: import from @qeetrix/ui, not its internals",
  "patterns->components":
    "a pattern is copied into apps: import from @qeetrix/ui, not its internals",
} as const;
