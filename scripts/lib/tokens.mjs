/**
 * tokens.mjs — the design-token graph, and the rules it has to satisfy.
 *
 * The token source is four layers of DTCG JSON under src/tokens/:
 *
 *     primitive/   raw values           — owns values
 *     semantic/    meaning              — owns meaning
 *     component/   component mapping    — owns the per-component decision
 *     theme/<t>/   the light/dark overlay for the layers that vary by theme
 *
 * Style Dictionary resolves that into CSS, and resolves it *quietly*: a reference to a token
 * that does not exist, or a path used as both a leaf and a group, produces no error and no
 * output. Three token groups were silently dropped while this layer was being built, which is
 * the whole reason this module exists.
 *
 * Everything here is a pure function over plain data, so the rules are unit-testable against
 * synthetic graphs rather than only against a repository that currently happens to be clean.
 * scripts/check/tokens.mjs is the CLI over it.
 *
 * References come in two shapes and both are followed:
 *   {token.path}            — a DTCG alias
 *   var(--qx-token-path)    — the emitted CSS variable, used when a value must resolve per
 *                             theme at runtime (a component token pointing at a semantic colour)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

export const LAYERS = ["primitive", "semantic", "component"];

/** Which layers a layer's tokens may reference. Deny by default, like the module graph. */
export const TOKEN_LAYER_RULES = {
  primitive: ["primitive"],
  semantic: ["primitive", "semantic"],
  component: ["semantic", "component"],
};

const KEBAB_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Physical directions have no place in a token name — RTL mirrors logical properties. */
const PHYSICAL_SEGMENTS = new Set(["left", "right", "ltr-only", "rtl-only"]);

const ALIAS = /\{([^}]+)\}/g;
const CSS_VAR = /var\(\s*(--[a-zA-Z0-9-]+)/g;
/** A bare design value: a literal length, colour or duration that is not a reference. */
const RAW_VALUE =
  /^(?:-?\d*\.?\d+(?:px|rem|em|%|ms|s)|#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla|oklch)\()/;

const walkJsonFiles = (dir) => {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJsonFiles(path));
    else if (entry.name.endsWith(".json")) out.push(path);
  }
  return out;
};

/** The layer + theme a token file belongs to, from its location. */
export function classifyFile(relativePath) {
  const path = relativePath.split("\\").join("/");
  const theme = /src\/tokens\/theme\/([a-z]+)\//.exec(path)?.[1] ?? null;
  if (theme === null) {
    for (const layer of LAYERS) {
      if (path.includes(`src/tokens/${layer}/`)) return { layer, theme: null, bridge: false };
    }
    return { layer: null, theme: null, bridge: false };
  }
  // Inside a theme overlay, the filename names the layer it overlays. `bridge` is the
  // component layer for the shadcn contract — it publishes the unprefixed variables.
  const base = path
    .split("/")
    .pop()
    .replace(/\.json$/, "");
  if (base === "bridge") return { layer: "component", theme, bridge: true };
  if (base === "component") return { layer: "component", theme, bridge: false };
  return { layer: "semantic", theme, bridge: false };
}

/** The CSS variable a token is emitted as. */
export function cssVariableFor(path, bridge) {
  return bridge ? `--${path.join("-")}` : `--qx-${path.join("-")}`;
}

/**
 * The references inside a token value, as `{ aliases, cssVars }`.
 *
 * Composite values (gradient stops, stroke dash arrays) are walked rather than stringified —
 * a JSON blob contains braces of its own, and matching those would report a gradient as a
 * broken reference.
 */
export function readReferences(value) {
  const aliases = [];
  const cssVars = [];

  // `field` is the composite sub-field a reference sits in (a gradient stop's `color`), so the
  // type rule can expect a colour there rather than a gradient.
  const visit = (node, field) => {
    if (typeof node === "string") {
      for (const match of node.matchAll(ALIAS)) aliases.push({ ref: match[1], field });
      for (const match of node.matchAll(CSS_VAR)) cssVars.push({ ref: match[1], field });
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item, field);
      return;
    }
    if (node !== null && typeof node === "object") {
      for (const [key, item] of Object.entries(node)) visit(item, key);
    }
  };

  visit(value, null);
  return { aliases, cssVars };
}

/**
 * The type a reference must have when it sits inside a composite value. DTCG composites carry
 * sub-fields with their own types — a gradient stop is a colour, not a gradient.
 */
export const COMPOSITE_FIELD_TYPES = {
  gradient: { color: "color" },
  strokeStyle: { dashArray: "dimension" },
};

/**
 * Load every authored token into one flat graph.
 *
 * Collisions are recorded rather than resolved: a path that is both a leaf and a group is the
 * failure mode the build hides, so it has to survive loading in order to be reported.
 */
export function loadTokenGraph({ root }) {
  const tokensDir = join(root, "src/tokens");
  const files = new Map();
  for (const file of walkJsonFiles(tokensDir).sort()) {
    files.set(relative(root, file).split("\\").join("/"), JSON.parse(readFileSync(file, "utf8")));
  }
  return buildTokenGraph({ files });
}

/**
 * Build the graph from already-parsed files, keyed by their repo-relative path.
 *
 * Kept separate from disk access so the rules can be exercised against a three-token fixture
 * instead of only against a 742-token repository that currently happens to be clean.
 *
 * @param {{ files: Map<string, object> | Record<string, object> }} input
 */
export function buildTokenGraph({ files }) {
  const tokens = new Map();
  const collisions = [];
  const groups = new Map();
  const documented = new Set();

  for (const [rel, json] of files instanceof Map ? files : Object.entries(files)) {
    const { layer, theme, bridge } = classifyFile(rel);

    const visit = (node, path) => {
      if (node === null || typeof node !== "object" || Array.isArray(node)) return;
      const isToken = Object.hasOwn(node, "$value");
      const key = path.join(".");

      if (isToken) {
        if (groups.has(key)) {
          collisions.push({ path: key, leaf: rel, group: groups.get(key) });
        }
        const existing = tokens.get(key);
        // The same path in two themes is the point of a theme overlay; in one theme it is a
        // duplicate declaration.
        if (existing && existing.theme === theme) {
          collisions.push({ path: key, leaf: rel, group: existing.file, duplicate: true });
        }
        tokens.set(`${key}${theme ? `@${theme}` : ""}`, {
          path,
          key,
          layer,
          theme,
          bridge,
          file: rel,
          type: node.$type ?? null,
          value: node.$value,
          description: node.$description ?? null,
          deprecated: node.$extensions?.["qeetrix.deprecated"] ?? null,
          // A token owns its value legitimately only if it, or a group above it, says why.
          documented:
            (node.$description ?? null) !== null ||
            path.some((_, i) => documented.has(path.slice(0, i + 1).join("."))),
          variable: cssVariableFor(path, bridge),
          ...readReferences(node.$value),
        });
        return;
      }

      if (path.length > 0) {
        groups.set(key, rel);
        if (typeof node.$description === "string") documented.add(key);
        for (const [, token] of tokens) {
          if (token.key === key) collisions.push({ path: key, leaf: token.file, group: rel });
        }
      }
      for (const [name, child] of Object.entries(node)) {
        if (name.startsWith("$")) continue;
        visit(child, [...path, name]);
      }
    };

    visit(json, []);
  }

  return { tokens, collisions, groups };
}

/** Reverse index: emitted CSS variable → the token keys that emit it. */
export function indexByVariable(tokens) {
  const index = new Map();
  for (const token of tokens.values()) {
    if (!index.has(token.variable)) index.set(token.variable, []);
    index.get(token.variable).push(token);
  }
  return index;
}

/**
 * The emitted CSS variables that resolve — directly or through other tokens — to a density
 * variable.
 *
 * A component that reads `--qx-component-button-height` is density-aware even though the word
 * "density" never appears in its source. The manifest's capability derivation follows this set
 * so migrating a component to a component token cannot silently downgrade what the manifest
 * reports about it.
 */
export function densityAwareVariables(graph) {
  const { tokens } = graph;
  const byVariable = indexByVariable(tokens);
  const aware = new Set();

  const reachesDensity = (token, seen) => {
    if (token.path[0] === "density") return true;
    if (seen.has(token.key)) return false;
    seen.add(token.key);

    for (const { ref } of token.cssVars) {
      if (/^--qx-density-/.test(ref)) return true;
      for (const target of byVariable.get(ref) ?? []) {
        if (reachesDensity(target, seen)) return true;
      }
    }
    for (const { ref } of token.aliases) {
      for (const target of tokens.values()) {
        if (target.key === ref && reachesDensity(target, seen)) return true;
      }
    }
    return false;
  };

  for (const token of tokens.values()) {
    if (reachesDensity(token, new Set())) aware.add(token.variable);
  }
  return aware;
}

/** Variables declared in the `@theme` block of the CSS entry — legitimate external targets. */
export function readThemeVariables(indexCssPath) {
  if (!existsSync(indexCssPath)) return new Set();
  const css = readFileSync(indexCssPath, "utf8");
  const start = css.indexOf("@theme");
  if (start === -1) return new Set();
  const declared = new Set();
  for (const match of css.slice(start).matchAll(/^\s*(--[a-zA-Z0-9-]+):/gm)) {
    declared.add(match[1]);
  }
  return declared;
}

const sameLayerOwner = (a, b) =>
  a.layer === "component" && b.layer === "component" && a.path[1] === b.path[1];

/**
 * Resolve one token's references to other tokens, honouring the theme it was declared in.
 *
 * Preference order: a definition in the same theme, then the theme-agnostic one, then any
 * theme at all. The last step matters for a theme-agnostic token that aliases a theme-varying
 * one — the reference is real, and theme parity guarantees the variants share a type.
 */
function resolve(key, theme, tokens) {
  const direct = (theme && tokens.get(`${key}@${theme}`)) || tokens.get(key);
  if (direct) return direct;
  for (const token of tokens.values()) {
    if (token.key === key) return token;
  }
  return null;
}

/**
 * Every rule, in one pass. Returns findings tagged with a `rule` so the CLI can group them and
 * tests can assert on one rule at a time.
 */
export function validateTokenGraph({
  graph,
  themeVariables = new Set(),
  themes = ["light", "dark"],
}) {
  const { tokens, collisions } = graph;
  const byVariable = indexByVariable(tokens);
  // scripts/build/tokens.mjs collapses density.<metric>.<mode> into one runtime variable per
  // metric, switched by [data-qx-density]. Those names are derived here from the same tokens
  // rather than allow-listed, so a renamed metric cannot leave a stale exception behind.
  const synthesized = new Set(
    [...tokens.values()]
      .filter((token) => token.path[0] === "density" && token.path.length === 3)
      .map((token) => `--qx-density-${token.path[1]}`),
  );
  const knownVariable = (name) => themeVariables.has(name) || synthesized.has(name);
  const findings = [];
  const add = (rule, token, message, extra = {}) =>
    findings.push({
      rule,
      token: typeof token === "string" ? token : token.key,
      theme: typeof token === "string" ? null : token.theme,
      file: typeof token === "string" ? null : token.file,
      message,
      ...extra,
    });

  // ── a path cannot be both a leaf and a group (the build drops one, silently) ──────────
  for (const collision of collisions) {
    add(
      collision.duplicate ? "duplicate-declaration" : "path-collision",
      collision.path,
      collision.duplicate
        ? `declared twice in the same theme (${collision.group} and ${collision.leaf})`
        : `used as a token in ${collision.leaf} and as a group in ${collision.group} — the build resolves this by dropping one, without an error`,
    );
  }

  // ── naming ───────────────────────────────────────────────────────────────────────────
  for (const token of tokens.values()) {
    for (const segment of token.path) {
      if (!KEBAB_SEGMENT.test(segment)) {
        add("naming", token, `path segment "${segment}" is not kebab-case`);
      }
      if (PHYSICAL_SEGMENTS.has(segment)) {
        add(
          "naming",
          token,
          `path segment "${segment}" names a physical direction — use a logical concept (start/end/inline/block) so RTL mirrors`,
        );
      }
    }
    if (token.layer === "component" && !token.bridge && token.path[0] !== "component") {
      add(
        "naming",
        token,
        'component tokens live under the "component.*" namespace — the bridge already publishes leaves such as `input` and `card`, and a path cannot be both',
      );
    }
  }

  // ── references: existence, layer, type, cross-component coupling ─────────────────────
  for (const token of tokens.values()) {
    const targets = [];

    for (const { ref, field } of token.aliases) {
      const target = resolve(ref, token.theme, tokens);
      if (target === null) {
        add("missing-reference", token, `references {${ref}}, which is not a token`);
        continue;
      }
      targets.push({ target, via: `{${ref}}`, field });
    }

    for (const { ref, field } of token.cssVars) {
      const candidates = byVariable.get(ref) ?? [];
      const target =
        candidates.find((c) => c.theme === token.theme) ??
        candidates.find((c) => !c.theme) ??
        candidates[0];
      if (target === undefined) {
        if (!knownVariable(ref)) {
          add(
            "missing-reference",
            token,
            `references var(${ref}), which is neither a token nor declared in the @theme block`,
          );
        }
        continue;
      }
      targets.push({ target, via: `var(${ref})`, field });
    }

    for (const { target, via, field } of targets) {
      const allowed = TOKEN_LAYER_RULES[token.layer] ?? [];
      if (!allowed.includes(target.layer)) {
        add(
          "layer",
          token,
          `${token.layer} → ${target.layer} is not allowed: ${via} resolves to ${target.key}`,
          { expected: `one of ${allowed.join(", ")}` },
        );
      }
      if (
        token.layer === "component" &&
        target.layer === "component" &&
        !target.bridge &&
        !token.bridge &&
        !sameLayerOwner(token, target)
      ) {
        add(
          "cross-component",
          token,
          `${via} couples this to ${target.key} — components share meaning through a semantic token, not through each other`,
        );
      }
      // Inside a composite, the expected type is the sub-field's, not the token's.
      const composite = COMPOSITE_FIELD_TYPES[token.type];
      const expected = composite ? (field === null ? null : composite[field]) : token.type;
      if (expected && target.type && expected !== target.type) {
        add(
          "type",
          token,
          `expects a ${expected} but ${via} resolves to ${target.key}, a ${target.type}`,
          {
            expected,
          },
        );
      }
    }
  }

  // ── raw values outside the primitive layer ───────────────────────────────────────────
  for (const token of tokens.values()) {
    if (token.layer === "primitive") continue;
    if (typeof token.value !== "string") continue;
    if (!RAW_VALUE.test(token.value.trim())) continue;
    // Owning a value above the primitive layer is allowed — a z-index ladder, a density metric
    // and a control's cap have no meaningful primitive to alias — but it has to be justified.
    // An undocumented literal is indistinguishable from an author who skipped the token.
    if (!token.documented) {
      add(
        "raw-value",
        token,
        `holds the literal "${token.value}" without referencing a lower layer. Either alias a ` +
          `${token.layer === "component" ? "semantic" : "primitive"} token, or add a $description ` +
          "saying why this layer owns the value.",
      );
    }
  }

  // ── deprecation ─────────────────────────────────────────────────────────────────────
  // A renamed token keeps working; what changes is that nothing new may point at it. The record
  // has to be complete, the replacement has to exist, and the replacement must not itself be on
  // the way out — otherwise a migration path leads nowhere.
  for (const token of tokens.values()) {
    const record = token.deprecated;
    if (record === null) continue;

    for (const field of ["since", "reason"]) {
      if (typeof record[field] !== "string" || record[field].length === 0) {
        add("deprecation", token, `is deprecated but ${field} is missing`);
      }
    }
    if (!Object.hasOwn(record, "replacement")) {
      add(
        "deprecation",
        token,
        "is deprecated without a `replacement` field — use null to state that there is no successor",
      );
      continue;
    }
    if (record.replacement === null) continue;

    const replacement = resolve(record.replacement, token.theme, tokens);
    if (replacement === null) {
      add(
        "deprecation",
        token,
        `names ${record.replacement} as its replacement, which is not a token`,
      );
    } else if (replacement.deprecated !== null) {
      add("deprecation", token, `is replaced by ${replacement.key}, which is also deprecated`);
    }
  }

  for (const token of tokens.values()) {
    if (token.deprecated !== null) continue;
    for (const { ref } of token.aliases) {
      const target = resolve(ref, token.theme, tokens);
      if (target?.deprecated) {
        add(
          "deprecation",
          token,
          `references the deprecated token ${target.key} — point it at ${
            target.deprecated.replacement ?? "a current token"
          }`,
        );
      }
    }
  }

  // ── circular references ─────────────────────────────────────────────────────────────
  for (const theme of themes) {
    const seen = new Map();
    const visit = (token, stack) => {
      const id = token.key;
      if (stack.includes(id)) {
        add("circular", token, `circular reference: ${[...stack, id].join("\n  → ")}`, {
          chain: [...stack, id],
        });
        return;
      }
      if (seen.get(id) === theme) return;
      seen.set(id, theme);

      for (const { ref } of token.aliases) {
        const target = resolve(ref, theme, tokens);
        if (target) visit(target, [...stack, id]);
      }
      for (const { ref } of token.cssVars) {
        const candidates = byVariable.get(ref) ?? [];
        const target =
          candidates.find((c) => c.theme === theme) ?? candidates.find((c) => !c.theme);
        if (target) visit(target, [...stack, id]);
      }
    };
    for (const token of tokens.values()) {
      if (token.theme === null || token.theme === theme) visit(token, []);
    }
  }

  // ── theme parity ────────────────────────────────────────────────────────────────────
  const perTheme = new Map(themes.map((t) => [t, new Map()]));
  for (const token of tokens.values()) {
    if (token.theme && perTheme.has(token.theme)) perTheme.get(token.theme).set(token.key, token);
  }
  const [base, ...others] = themes;
  for (const theme of others) {
    for (const [key, token] of perTheme.get(theme)) {
      if (!perTheme.get(base).has(key)) {
        add("theme-parity", token, `defined in ${theme} but not in ${base} — it has no base value`);
      }
    }
  }
  for (const [key, token] of perTheme.get(base)) {
    for (const theme of others) {
      const counterpart = perTheme.get(theme).get(key);
      if (counterpart === undefined) {
        // Only colour is theme-varying by nature; anything else is legitimately declared once.
        if (token.type === "color") {
          add(
            "theme-parity",
            token,
            `is a colour defined in ${base} but not in ${theme} — dark mode inherits the ${base} value`,
            { severity: "warning" },
          );
        }
        continue;
      }
      if (token.type !== counterpart.type) {
        add(
          "theme-parity",
          token,
          `is a ${token.type} in ${base} but a ${counterpart.type} in ${theme}`,
        );
      }
    }
  }

  return findings;
}

/** Render a finding the way a developer can act on without opening anything else. */
export function formatTokenFinding(finding) {
  const lines = ["Token Error", "", "Token:", `  ${finding.token}`];
  if (finding.theme) lines.push("", "Theme:", `  ${finding.theme}`);
  lines.push("", "Issue:", `  ${finding.message}`);
  if (finding.expected) lines.push("", "Expected:", `  ${finding.expected}`);
  if (finding.file) lines.push("", "Location:", `  ${finding.file}`);
  return lines.join("\n");
}
