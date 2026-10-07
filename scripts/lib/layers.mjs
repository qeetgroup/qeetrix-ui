/**
 * layers.mjs — the architecture layer model, as enforceable functions.
 *
 * The rules themselves live in src/contracts/layers.ts (read statically via
 * scripts/lib/ts-literals.mjs); this module turns them into three things:
 *
 *   1. a real module graph for `src/` — every internal import resolved to a file, via the
 *      TypeScript pre-processor rather than a regex, so re-exports, type-only imports and
 *      dynamic `import()` are all seen and nothing is matched by substring. Non-TypeScript
 *      production inputs (`.css`, `.json`) are nodes too: a stylesheet or a token file is a
 *      real dependency, and one that used to sit outside the graph entirely
 *   1b. canonical identity — every edge keeps the specifier that produced it *and* the file it
 *      resolved to, so a rule can be written against what a module actually depends on rather
 *      than against the shape of the text that named it
 *   2. direct-edge enforcement — deny by default against LAYER_ALLOWED_DEPENDENCIES
 *   3. coherence checks on the rule set itself — it must be acyclic and transitively closed,
 *      which is what guarantees a legal chain of edges can never add up to an illegal
 *      dependency
 *
 * Everything here is a pure function over plain data so the rules can be tested against
 * synthetic graphs — see src/__tests__/architecture-layers.test.ts.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

const SOURCE_EXTENSIONS = [".ts", ".tsx"];
const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/**
 * Non-TypeScript production inputs that are nevertheless real dependencies.
 *
 * A component that imports `src/styles/index.css` or a raw token JSON has taken on that file's
 * side effects and compile-time coupling just as surely as if it had imported a module. Before
 * these were in the graph, `check:architecture` could report a clean TypeScript tree while the
 * layering had already been crossed.
 */
export const ASSET_EXTENSIONS = [".css", ".json"];

/** Where a package-relative path names a non-TypeScript input. */
export function isAssetPath(path, assetExtensions = ASSET_EXTENSIONS) {
  return assetExtensions.some((extension) => path.endsWith(extension));
}

/** A test file is not part of the shipped module graph, wherever it lives. */
export function isTestPath(path) {
  return path.includes("/__tests__/") || /\.test\.tsx?$/.test(path);
}

/**
 * The layer a package-relative path belongs to, or `null` when no layer claims it.
 *
 * Matching is on path boundaries, longest directory first, so `src/components` can never
 * swallow a future `src/components-legacy` and a file entry (`src/index.ts`) is matched
 * exactly rather than as a prefix.
 */
export function layerOf(relativePath, layerDirectories) {
  const normalised = relativePath.split("\\").join("/");
  const entries = Object.entries(layerDirectories).sort(([, a], [, b]) => b.length - a.length);

  for (const [layer, location] of entries) {
    if (normalised === location) return layer;
    if (normalised.startsWith(`${location}/`)) return layer;
  }
  return null;
}

/**
 * Every file under a directory with one of `extensions`, as package-relative paths.
 *
 * Directory entries are sorted before recursing so the returned order is a property of the
 * names, not of the filesystem — two checkouts of the same tree produce the same list.
 */
export function listSourceFiles(root, directory, extensions = SOURCE_EXTENSIONS) {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];

  const files = [];
  const walk = (current) => {
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (extensions.some((extension) => entry.name.endsWith(extension))) {
        files.push(relative(root, path));
      }
    }
  };

  if (statSync(absolute).isDirectory()) walk(absolute);
  else files.push(relative(root, absolute));
  return files;
}

/**
 * Resolve one module specifier to a package-relative file, or `null` for anything external.
 *
 * Handles the two forms the codebase uses — the `@/*` alias from tsconfig `paths`, and
 * relative paths — and probes the same candidates the bundler would, including the
 * `./thing.js` → `./thing.tsx` rewrite that ESM-style TypeScript specifiers rely on.
 *
 * That last case matters more than it looks: `src/brand/index.ts` re-exports through
 * `./logos/qeet-logo.js`, and until those specifiers resolved, the whole brand subtree sat
 * outside the dependency graph — invisible to every layer rule.
 */
export function resolveSpecifier(specifier, fromRelativePath, root) {
  let base;
  if (specifier.startsWith("@/")) base = join(root, "src", specifier.slice(2));
  else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = resolve(join(root, dirname(fromRelativePath)), specifier);
  } else return null;

  // A TypeScript module that imports "./x.js" means "./x.ts(x)"; probe both spellings.
  const bases = [base];
  const rewritten = base.replace(/\.(js|jsx|mjs|cjs)$/, "");
  if (rewritten !== base) bases.push(rewritten);

  for (const candidateBase of bases) {
    for (const suffix of CANDIDATE_SUFFIXES) {
      const candidate = `${candidateBase}${suffix}`;
      if (existsSync(candidate) && statSync(candidate).isFile()) return relative(root, candidate);
    }
  }
  return null;
}

/**
 * The module specifiers a file imports.
 *
 * `ts.preProcessFile` is TypeScript's own dependency scanner: it reports static imports,
 * `export … from`, type-only imports, `import()` calls and triple-slash references, and it
 * ignores anything inside a string or comment.
 */
export function readImportSpecifiers(absolutePath) {
  const { importedFiles, ambientExternalModules } = ts.preProcessFile(
    readFileSync(absolutePath, "utf8"),
    /* readImportFiles */ true,
    /* detectJavaScriptImports */ true,
  );
  return [
    ...importedFiles.map((reference) => reference.fileName),
    ...(ambientExternalModules ?? []),
  ];
}

/**
 * The component category a package-relative path belongs to, or `null` when it is not a
 * component file.
 *
 * This is the *canonical* identity: it is read off the resolved path, so `../inputs/input`,
 * `@/components/inputs/input` and `./input` from a sibling all reduce to `inputs`. A rule
 * written against this cannot be fooled by the shape of the specifier that named the file.
 */
export function categoryOf(relativePath, componentsDirectory = "src/components") {
  const normalised = relativePath.split("\\").join("/");
  if (!normalised.startsWith(`${componentsDirectory}/`)) return null;
  const rest = normalised.slice(componentsDirectory.length + 1);
  const slash = rest.indexOf("/");
  return slash === -1 ? null : rest.slice(0, slash);
}

/**
 * Build the internal module graph for `src/`.
 *
 * Every node carries its layer, whether it is a non-TypeScript asset, and its `edges` — each
 * edge keeping both the specifier as written and the file it resolved to. Rules are written
 * against the resolved side; the specifier is kept so a message can quote the line that has to
 * change.
 *
 * Returns the graph plus the diagnostics that matter for coverage: files that no layer claims
 * (`unmapped`), and internal specifiers that resolve to nothing (`unresolved`). External
 * packages are not part of the graph.
 */
export function buildModuleGraph({
  root,
  layerDirectories,
  assetExtensions = ASSET_EXTENSIONS,
  componentsDirectory = "src/components",
}) {
  const extensions = [...SOURCE_EXTENSIONS, ...assetExtensions];
  const files = new Set();
  for (const location of Object.values(layerDirectories)) {
    for (const file of listSourceFiles(root, location, extensions)) files.add(file);
  }
  for (const file of listSourceFiles(root, "src", extensions)) files.add(file);

  const modules = new Map();
  const unmapped = [];
  const unresolved = [];

  for (const file of [...files].sort()) {
    const layer = layerOf(file, layerDirectories);
    if (layer === null) {
      unmapped.push(file);
      continue;
    }

    const asset = isAssetPath(file, assetExtensions);
    const test = isTestPath(file);
    const edges = [];

    // An asset is a sink: nothing in this graph parses CSS or JSON for further dependencies,
    // and claiming otherwise would be a guess. `src/styles/index.css` composes the other
    // stylesheets through CSS `@import`, which this graph does not follow.
    if (!asset) {
      // De-duplicated: `import type { X } from "./m"` alongside `export { Y } from "./m"` is
      // one dependency, and reporting it twice would double every finding about it.
      for (const specifier of [...new Set(readImportSpecifiers(join(root, file)))]) {
        const target = resolveSpecifier(specifier, file, root);
        edges.push({ specifier, target });
        if (target !== null) continue;
        // An alias that resolves nowhere is always a defect. A relative one is too, but test
        // harnesses legitimately reach outside `src/` (a checker script, the built manifest),
        // so only shipped modules are held to it.
        const internal = specifier.startsWith("./") || specifier.startsWith("../");
        if (specifier.startsWith("@/") || (internal && !test)) unresolved.push({ file, specifier });
      }
    }

    modules.set(file, {
      file,
      layer,
      category: categoryOf(file, componentsDirectory),
      asset,
      edges,
      imports: edges.map((edge) => edge.target).filter((target) => target !== null),
      test,
    });
  }

  return { modules, unmapped, unresolved };
}

function explain(from, to, explanations) {
  return (
    explanations[`${from}->${to}`] ??
    `${from} cannot depend on ${to} — see LAYER_ALLOWED_DEPENDENCIES`
  );
}

/**
 * Direct-edge enforcement. Every internal import must land in a layer the source layer is
 * allowed to reach; test files are exempt.
 */
export function findLayerViolations({ modules, allowed, explanations = {} }) {
  const violations = [];

  for (const node of modules.values()) {
    if (node.test) continue;
    const permitted = allowed[node.layer];

    if (permitted === undefined) {
      violations.push({
        file: node.file,
        dependency: null,
        sourceLayer: node.layer,
        targetLayer: null,
        rule: `no dependency rules are declared for the "${node.layer}" layer`,
      });
      continue;
    }

    for (const dependency of node.imports) {
      const target = modules.get(dependency);
      if (!target || target.test) continue;
      // Assets are governed by findAssetDependencyViolations, which is stricter than the
      // module allow-list. One rule per edge kind keeps the message unambiguous.
      if (target.asset) continue;
      if (target.layer === node.layer) continue;
      if (permitted.includes(target.layer)) continue;

      violations.push({
        file: node.file,
        dependency: target.file,
        sourceLayer: node.layer,
        targetLayer: target.layer,
        rule: explain(node.layer, target.layer, explanations),
      });
    }
  }

  return violations;
}

/**
 * Multi-hop reporting: the shortest import chain from a file to a layer its own layer may not
 * depend on.
 *
 * With a coherent rule set (see `findRuleSetProblems`) this can only fire when a direct edge
 * is already illegal — but it names the whole chain, which is what makes a violation buried
 * three files deep actionable instead of mysterious.
 */
export function findDeepLayerViolations({ modules, allowed, limit = 25 }) {
  const found = [];

  for (const start of modules.values()) {
    if (start.test) continue;
    const permitted = allowed[start.layer];
    if (permitted === undefined) continue;

    const seen = new Set([start.file]);
    const queue = [[start.file]];

    while (queue.length > 0 && found.length < limit) {
      const path = queue.shift();
      const node = modules.get(path[path.length - 1]);
      if (!node) continue;

      for (const dependency of node.imports) {
        if (seen.has(dependency)) continue;
        const target = modules.get(dependency);
        if (!target || target.test || target.asset) continue;
        seen.add(dependency);

        const chain = [...path, dependency];
        const legal = target.layer === start.layer || permitted.includes(target.layer);
        if (!legal) {
          // Depth 1 is already reported by findLayerViolations; only chains add information.
          if (chain.length > 2) {
            found.push({
              file: start.file,
              sourceLayer: start.layer,
              targetLayer: target.layer,
              path: chain,
            });
          }
        } else {
          queue.push(chain);
        }
      }
    }
  }

  return found;
}

/**
 * Non-TypeScript production inputs, governed explicitly.
 *
 * `allowedAssets[sourceLayer]` is the complete set of *asset* layers that layer may import a
 * `.css` or `.json` file from. Absent means none — deny by default, exactly as for modules.
 *
 * This is deliberately stricter than `LAYER_ALLOWED_DEPENDENCIES`: `components` may depend on
 * the `tokens` layer (it reads generated TypeScript from it), but importing a raw token JSON
 * from a component bypasses the CSS bridge, ships the whole token file into the bundle, and
 * hides where the component's colours come from. Those are different
 * decisions, so they get different tables.
 */
export function findAssetDependencyViolations({ modules, allowedAssets = {} }) {
  const violations = [];

  for (const node of modules.values()) {
    if (node.test || node.asset) continue;
    const permitted = allowedAssets[node.layer] ?? [];

    for (const { specifier, target } of node.edges ?? []) {
      if (target === null) continue;
      const asset = modules.get(target);
      if (!asset?.asset || asset.test) continue;
      if (permitted.includes(asset.layer)) continue;

      violations.push({
        file: node.file,
        dependency: asset.file,
        specifier,
        sourceLayer: node.layer,
        targetLayer: asset.layer,
        rule:
          `${node.layer} may not import a non-TypeScript input from ${asset.layer} — ` +
          "add the layer to LAYER_ALLOWED_ASSET_DEPENDENCIES if this is intended",
      });
    }
  }

  return violations;
}

/**
 * Relative specifiers that leave their own directory, reported by canonical identity.
 *
 * The house rule is that a module reaches a sibling with `./` and anything else with the `@/`
 * alias. Enforcing it on the *specifier* alone caught only the exact shape somebody thought of
 * (`../../components/<category>/…`) and missed `../<category>/…`, `../../lib/…` and every
 * deeper form. Enforcing it on the resolved path catches all of them, and can say which
 * category or layer the import actually landed in.
 */
export function findRelativeEscapes({ modules }) {
  const violations = [];

  for (const node of modules.values()) {
    if (node.test || node.asset) continue;

    for (const { specifier, target } of node.edges ?? []) {
      if (!specifier.startsWith("../")) continue;
      const resolved = target === null ? null : modules.get(target);
      const crossCategory =
        node.category !== null && resolved?.category != null && resolved.category !== node.category;

      violations.push({
        file: node.file,
        specifier,
        dependency: target,
        fromCategory: node.category,
        toCategory: resolved?.category ?? null,
        targetLayer: resolved?.layer ?? null,
        rule: crossCategory
          ? `reaches category "${resolved.category}" with a relative path — use ` +
            `"@/components/${resolved.category}/…" so the dependency is visible`
          : "relative import leaves its own directory — use the @/ alias",
      });
    }
  }

  return violations;
}

/**
 * Coherence of the rule set itself, independent of any code.
 *
 * Two invariants:
 *   - **acyclic** — layers form a direction of flow, so no cycle may exist between two
 *     different layers (self-edges are how "a component may import a component" is expressed)
 *   - **transitively closed** — if `a` may depend on `b` and `b` on `c`, then `a` must be
 *     allowed to depend on `c`. Without this, a chain of individually legal imports could add
 *     up to a dependency the architecture forbids.
 */
export function findRuleSetProblems(allowed) {
  const problems = [];
  const layers = Object.keys(allowed);

  for (const [layer, targets] of Object.entries(allowed)) {
    for (const target of targets) {
      if (target !== layer && allowed[target]?.includes(layer)) {
        problems.push({
          kind: "cycle",
          message: `${layer} and ${target} may each depend on the other — layers must flow one way`,
        });
      }
    }
  }

  for (const layer of layers) {
    for (const direct of allowed[layer] ?? []) {
      for (const indirect of allowed[direct] ?? []) {
        if (indirect === layer) continue;
        if (!(allowed[layer] ?? []).includes(indirect)) {
          problems.push({
            kind: "not-transitively-closed",
            message:
              `${layer} may depend on ${direct}, and ${direct} on ${indirect}, ` +
              `but ${layer} → ${indirect} is not allowed — close the rule or drop the edge`,
          });
        }
      }
    }
  }

  // A cycle is reported once per direction; collapse to unique messages.
  return [...new Map(problems.map((problem) => [problem.message, problem])).values()];
}
