/**
 * layers.mjs — the architecture layer model, as enforceable functions.
 *
 * The rules themselves live in src/contracts/layers.ts (read statically via
 * scripts/lib/ts-literals.mjs); this module turns them into three things:
 *
 *   1. a real module graph for `src/` — every internal import resolved to a file, via the
 *      TypeScript pre-processor rather than a regex, so re-exports, type-only imports and
 *      dynamic `import()` are all seen and nothing is matched by substring
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

/** Every `.ts`/`.tsx` file under a directory, as package-relative paths. */
export function listSourceFiles(root, directory) {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];

  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
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
 * relative paths — and probes the same candidates the bundler would.
 */
export function resolveSpecifier(specifier, fromRelativePath, root) {
  let base;
  if (specifier.startsWith("@/")) base = join(root, "src", specifier.slice(2));
  else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = resolve(join(root, dirname(fromRelativePath)), specifier);
  } else return null;

  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = `${base}${suffix}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) return relative(root, candidate);
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
 * Build the internal module graph for `src/`.
 *
 * Returns the graph plus the two diagnostics that matter for coverage: files that no layer
 * claims (`unmapped`), and `@/`-alias specifiers that resolve to nothing (`unresolved`).
 * External packages are not part of the graph.
 */
export function buildModuleGraph({ root, layerDirectories }) {
  const files = new Set();
  for (const location of Object.values(layerDirectories)) {
    for (const file of listSourceFiles(root, location)) files.add(file);
  }
  for (const file of listSourceFiles(root, "src")) files.add(file);

  const modules = new Map();
  const unmapped = [];
  const unresolved = [];

  for (const file of [...files].sort()) {
    const layer = layerOf(file, layerDirectories);
    if (layer === null) {
      unmapped.push(file);
      continue;
    }

    const imports = [];
    for (const specifier of readImportSpecifiers(join(root, file))) {
      const target = resolveSpecifier(specifier, file, root);
      if (target !== null) imports.push(target);
      else if (specifier.startsWith("@/")) unresolved.push({ file, specifier });
    }

    modules.set(file, { file, layer, imports, test: isTestPath(file) });
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
        if (!target || target.test) continue;
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
