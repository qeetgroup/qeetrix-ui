/**
 * Qeetrix token build (folded in from the former @qeetrix/tokens package).
 *
 * Single source (src/tokens/**) → three artifacts under src/styles/ (generated, gitignored):
 *   src/styles/tokens.css      — what the runtime needs: the shadcn / Base-UI bridge
 *                                (UNPREFIXED :root + .dark) plus the semantic and component
 *                                layers (--qx- prefixed), the theme-derived re-declarations
 *                                that let a nested .dark scope work, and the density mode
 *                                selectors.
 *                                Primitives are deliberately excluded — a component physically
 *                                cannot resolve a palette value.
 *   src/styles/tokens.raw.css  — the complete export including primitives (--qx- prefixed),
 *                                published as @qeetrix/ui/tokens.css for consumers that want
 *                                the ramps.
 *   src/styles/tokens.json     — resolved tokens per theme (cross-platform)
 *
 * src/styles/index.css imports ./tokens.css; postbuild copies src/styles → dist/styles
 * (so the relative import and the ./tokens.* subpath exports resolve from dist).
 *
 * Every theme registered in scripts/config/themes.json is built as its own Style Dictionary
 * instance (their token names collide by design), then concatenated in registry order. The
 * registry — not a literal list in this file — is what makes a new theme directory build,
 * parity-check and contrast-check; an unregistered directory throws.
 *
 * Style Dictionary's per-platform fragments are scratch output: they go to
 * node_modules/.cache/qeetrix/tokens so dist/ stays the only build directory.
 *
 * Run: bun run build:tokens  (also runs at the start of build/dev).
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import StyleDictionary from "style-dictionary";
import { loadThemeRegistry } from "../lib/themes.mjs";
import { densityAwareVariables, loadTokenGraph } from "../lib/tokens.mjs";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "../..");
const TOKENS = join(PKG, "src/tokens");
// Scratch dir for Style Dictionary's per-platform fragments — never shipped, never
// at the repo root: dist/ is the single build output directory.
const BUILD = join(PKG, "node_modules/.cache/qeetrix/tokens");
const OUT = join(PKG, "src/styles");

// ---- composite value serialization ------------------------------------------
// Most tokens have a scalar $value; composite types (gradient, strokeStyle) have
// an object/array $value that would otherwise stringify as "[object Object]".
// buildResolver resolves any residual {alias} refs inside composite fields
// against the already-resolved scalar tokens.

function buildResolver(dictionary) {
  const map = new Map(dictionary.allTokens.map((t) => [t.path.join("."), t.$value]));
  return (s) =>
    typeof s === "string"
      ? s.replace(/\{([^}]+)\}/g, (_, ref) =>
          typeof map.get(ref) === "string" ? map.get(ref) : `{${ref}}`,
        )
      : s;
}

function serializeGradient(v, resolve) {
  const stops = (Array.isArray(v) ? v : v.stops) ?? [];
  const angle = Array.isArray(v) ? "180deg" : (v.angle ?? "180deg");
  const parts = stops.map((s) => `${resolve(s.color)} ${Math.round((s.position ?? 0) * 100)}%`);
  return `linear-gradient(${angle}, ${parts.join(", ")})`;
}

function serializeValue(t, resolve) {
  const v = t.$value;
  if (v == null || typeof v === "string" || typeof v === "number") return v;
  if (t.$type === "gradient") return serializeGradient(v, resolve);
  if (t.$type === "strokeStyle" && typeof v === "object") {
    const arr = v.dashArray ?? [];
    return Array.isArray(arr) ? arr.map(resolve).join(" ") : String(v);
  }
  return JSON.stringify(v);
}

// ---- custom formats ---------------------------------------------------------

StyleDictionary.registerFormat({
  name: "qeetrix/css",
  format: ({ dictionary, options }) => {
    const selector = options.selector ?? ":root";
    const prefix = options.prefix ? `${options.prefix}-` : "";
    const resolve = buildResolver(dictionary);
    const lines = dictionary.allTokens.map(
      (t) => `  --${prefix}${t.path.join("-")}: ${serializeValue(t, resolve)};`,
    );
    return `${selector} {\n${lines.join("\n")}\n}\n`;
  },
});

StyleDictionary.registerFormat({
  name: "qeetrix/json",
  format: ({ dictionary }) => {
    const resolve = buildResolver(dictionary);
    const out = {};
    for (const t of dictionary.allTokens) {
      let node = out;
      t.path.forEach((seg, i) => {
        if (i === t.path.length - 1) node[seg] = serializeValue(t, resolve);
        else node = node[seg] ??= {};
      });
    }
    return `${JSON.stringify(out, null, 2)}\n`;
  },
});

// ---- filters ----------------------------------------------------------------

const isBridge = (t) => t.filePath.includes("bridge");
const notBridge = (t) => !isBridge(t);
const themeOverride = (t) => t.filePath.includes(`${"/theme/"}`) && !isBridge(t);
const isPrimitive = (t) => t.filePath.includes(`${"/primitive/"}`);
// What the runtime that components render in is allowed to see: the semantic and component
// layers, never the primitives. Keeping the palette out of tokens.css is what makes
// "components must not depend on primitive values" a physical fact rather than a convention.
const isConsumable = (t) => !isPrimitive(t) && !isBridge(t);
const consumableOverride = (t) => isConsumable(t) && t.filePath.includes(`${"/theme/"}`);

// ---- per-theme instance -----------------------------------------------------

function sdForTheme(theme, selector, isBase) {
  return new StyleDictionary({
    // The three authored layers, then the theme overlay. Later sources win, which is how
    // a theme re-points a semantic colour without redeclaring the whole layer.
    source: [
      join(TOKENS, "primitive/**/*.json"),
      join(TOKENS, "semantic/**/*.json"),
      join(TOKENS, "component/**/*.json"),
      join(TOKENS, `theme/${theme}/**/*.json`),
    ],
    log: { verbosity: "silent", warnings: "disabled" },
    platforms: {
      bridge: {
        buildPath: `${BUILD}/`,
        transforms: [],
        files: [
          {
            destination: `bridge-${theme}.css`,
            format: "qeetrix/css",
            filter: isBridge,
            options: { selector },
          },
        ],
      },
      raw: {
        buildPath: `${BUILD}/`,
        transforms: [],
        files: [
          {
            destination: `raw-${theme}.css`,
            format: "qeetrix/css",
            // The base theme carries the primitives + semantic; every other theme carries
            // only its own overrides.
            filter: isBase ? notBridge : themeOverride,
            options: { selector, prefix: "qx" },
          },
        ],
      },
      // The semantic + component layers, for the public style entry. src/styles/index.css
      // imports tokens.css, so these are the --qx-* tokens a component or an @theme mapping
      // can actually resolve; primitives are deliberately absent.
      consumable: {
        buildPath: `${BUILD}/`,
        transforms: [],
        files: [
          {
            destination: `consumable-${theme}.css`,
            format: "qeetrix/css",
            filter: isBase ? isConsumable : consumableOverride,
            options: { selector, prefix: "qx" },
          },
        ],
      },
      json: {
        buildPath: `${BUILD}/`,
        transforms: [],
        files: [
          {
            destination: `tokens-${theme}.json`,
            format: "qeetrix/json",
            filter: notBridge,
          },
        ],
      },
    },
  });
}

// ---- run --------------------------------------------------------------------

rmSync(BUILD, { recursive: true, force: true });
// The registry, not a literal list: every registered theme is built, and an unregistered
// src/tokens/theme/* directory throws here rather than being skipped in silence.
const registry = loadThemeRegistry();
const [baseTheme] = registry;
for (const { name, selector } of registry) {
  await (await sdForTheme(name, selector, name === baseTheme.name)).buildAllPlatforms();
}

mkdirSync(OUT, { recursive: true });
const header =
  "/**\n * Qeetrix design tokens — GENERATED by scripts/build/tokens.mjs.\n" +
  " * Do not edit by hand. Edit src/tokens/** and rebuild (`bun run build:tokens`).\n */\n";
const read = (f) => readFileSync(join(BUILD, f), "utf8");
const baseTokens = JSON.parse(read(`tokens-${baseTheme.name}.json`));
/** `[name, value]` for every custom-property declaration in a generated fragment. */
const declarationsOf = (css) =>
  [...css.matchAll(/^\s*(--[a-z0-9-]+):\s*(.+);\s*$/gm)].map(([, name, value]) => [name, value]);

function densityModeCss(tokens) {
  const density = tokens.density;
  const declarations = (mode) =>
    [
      ["control-height", density["control-height"][mode]],
      ["row-height", density["row-height"][mode]],
      ["cell-padding-y", density["cell-padding-y"][mode]],
      ["field-gap", density["field-gap"][mode]],
    ]
      .map(([name, value]) => `  --qx-density-${name}: ${value};`)
      .join("\n");

  // `default` is published under its own name rather than on :root, so a component can spell
  // its fallback as a token — var(--qx-density-control-height, var(--qx-density-control-height-default))
  // — without :root silently overriding the density a provider set.
  const defaults = [
    ["control-height", density["control-height"].default],
    ["row-height", density["row-height"].default],
    ["cell-padding-y", density["cell-padding-y"].default],
    ["field-gap", density["field-gap"].default],
  ]
    .map(([name, value]) => `  --qx-density-${name}-default: ${value};`)
    .join("\n");

  // A custom property's var() references are substituted where it is *declared*, and descendants
  // inherit the substituted value. `--qx-control-height: var(--qx-density-control-height, …)` is
  // declared on :root, so a nested `[data-qx-density]` would change --qx-density-* and nothing
  // derived from it. Re-declaring every density-derived variable inside each density scope makes
  // it re-resolve there — which is what lets DensityProvider's subtree scope actually work.
  const derived = densityDerivedDeclarations();
  const scope = (body) => [body, derived].filter(Boolean).join("\n");
  // `default` resets an inherited density by un-setting the mode variables, so their
  // `-default` fallbacks apply again inside a compact or comfortable ancestor.
  const reset = Object.keys(density)
    .filter((name) => typeof density[name] === "object" && "default" in density[name])
    .map((name) => `  --qx-density-${name}: initial;`)
    .join("\n");

  return [
    `:root {\n${defaults}\n}`,
    `[data-qx-density="default"] {\n${scope(reset)}\n}`,
    `[data-qx-density="comfortable"] {\n${scope(declarations("comfortable"))}\n}`,
    `[data-qx-density="compact"] {\n${scope(declarations("compact"))}\n}`,
  ].join("\n\n");
}

/** Every emitted runtime variable whose value reaches a density variable through var(). */
function densityDerivedDeclarations() {
  const aware = densityAwareVariables(loadTokenGraph({ root: PKG }));
  // A theme-varying variable cannot be re-declared here without overriding its theme value
  // (a density scope and `.dark` have equal specificity), so one would be a build error.
  const themeVarying = new Set(
    registry
      .slice(1)
      .flatMap(({ name }) => declarationsOf(read(`consumable-${name}.css`)).map(([n]) => n)),
  );
  const lines = [];
  for (const [name, value] of declarationsOf(read(`consumable-${registry[0].name}.css`))) {
    if (!aware.has(name) || !value.includes("var(")) continue;
    if (themeVarying.has(name)) {
      throw new Error(
        `${name} is density-derived and theme-varying; it cannot be re-declared per density scope.`,
      );
    }
    lines.push(`  ${name}: ${value};`);
  }
  return lines.join("\n");
}

/**
 * The same substitution rule, for themes. A component token that follows a theme does so through
 * the semantic variable — `--qx-component-card-background: var(--qx-color-surface-elevated)` —
 * and is declared once, on :root. On <html> that is enough: :root and `.dark` are one element, so
 * the reference substitutes the dark value. But a `.dark` scope *below* <html> — a preview, a
 * specimen, a themed panel — would change the semantic colours and nothing derived from them; the
 * subtree would inherit :root's light substitution. Re-declaring, inside each non-base theme's
 * selector, every base variable that reaches a theme-varying variable through var() (and is not
 * theme-varying itself) makes those re-resolve in the scope too. Same expression, so it changes
 * nothing where the theme sits on <html>.
 */
function themeDerivedCss(platforms) {
  const blocks = [];
  for (const { name, selector } of registry.slice(1)) {
    const themeVarying = new Set(
      platforms.flatMap((platform) =>
        declarationsOf(read(`${platform}-${name}.css`)).map(([n]) => n),
      ),
    );
    const base = platforms
      .flatMap((platform) => declarationsOf(read(`${platform}-${registry[0].name}.css`)))
      .filter(([variable, value]) => !themeVarying.has(variable) && value.includes("var("));
    // Fixed point: a variable is derived if it references a theme-varying or derived variable.
    const derived = new Map();
    for (let grew = true; grew; ) {
      grew = false;
      for (const [variable, value] of base) {
        if (derived.has(variable)) continue;
        const refs = [...value.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map(([, ref]) => ref);
        if (refs.some((ref) => themeVarying.has(ref) || derived.has(ref))) {
          derived.set(variable, value);
          grew = true;
        }
      }
    }
    if (derived.size === 0) continue;
    const lines = [...derived].map(([variable, value]) => `  ${variable}: ${value};`).join("\n");
    blocks.push(
      `/* Derived from ${name}'s colours: re-declared so a nested ${selector} scope re-resolves them. */\n${selector} {\n${lines}\n}\n`,
    );
  }
  return blocks.join("\n");
}

const concat = (platform) => registry.map(({ name }) => read(`${platform}-${name}.css`)).join("\n");

writeFileSync(
  join(OUT, "tokens.css"),
  `${header}\n${concat("bridge")}\n${concat("consumable")}\n${themeDerivedCss(["bridge", "consumable"])}\n${densityModeCss(baseTokens)}\n`,
);
writeFileSync(
  join(OUT, "tokens.raw.css"),
  `${header}\n${concat("raw")}\n${themeDerivedCss(["raw"])}`,
);
writeFileSync(
  join(OUT, "tokens.json"),
  `${JSON.stringify(
    {
      $description: "Qeetrix design tokens, resolved per theme. Generated — do not edit.",
      ...Object.fromEntries(
        registry.map(({ name }) => [name, JSON.parse(read(`tokens-${name}.json`))]),
      ),
    },
    null,
    2,
  )}\n`,
);

// ---- typed token values -----------------------------------------------------
// The resolved tokens JavaScript has to read as values — an icon's pixel size, a duration in
// milliseconds, a width the Tour positions with — as TypeScript, in src/lib/token-values.ts
// (published as `@qeetrix/ui/lib/token-values`). Only what code reads is generated; everything
// else is a CSS variable. Editing the .ts by hand is how a design system ends up with two truths.

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const ms = (v) => Number.parseInt(v, 10);
const px = (v) => Number.parseFloat(v);
const entries = (obj, mapValue) =>
  Object.entries(obj)
    .filter(([key]) => !key.startsWith("$"))
    .map(([key, value]) => `  ${camel(key)}: ${mapValue(value)},`)
    .join("\n");

const quote = (v) => `"${v}"`;
const block = (name, body, doc) =>
  `${doc ? `/** ${doc} */\n` : ""}export const ${name} = {\n${body}\n} as const;\n`;

const t = baseTokens;
const tokenValues = [
  "/**",
  " * Qeetrix typed token values — GENERATED by scripts/build/tokens.mjs.",
  " *",
  " * Do not edit by hand: edit src/tokens/** and run `bun run build:tokens`. Only the values",
  " * JavaScript has to read are here; everything else is a `--qx-*` CSS variable.",
  " */",
  "",
  block(
    "DURATION",
    entries(t.duration, (v) => ms(v)),
    "Motion durations, in milliseconds.",
  ),
  block("EASING", entries(t.easing, quote), "Motion easing curves."),
  block(
    "ICON_SIZE",
    entries(t.icon.size, (v) => px(v)),
    "Icon box sizes, in pixels.",
  ),
  block(
    "ICON_STROKE",
    entries(t.icon.stroke, (v) => Number(v)),
    "Icon stroke widths.",
  ),
  block(
    "COMPONENT",
    [
      "  sidebar: {",
      "    width: {",
      entries(t.component.sidebar.width, quote)
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n"),
      "    },",
      "  },",
      "  tour: {",
      entries(
        { "card-width": t.component.tour["card-width"], offset: t.component.tour.offset },
        quote,
      )
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n"),
      "  },",
    ].join("\n"),
    "Component geometry that has to be readable from JavaScript.",
  ),
].join("\n");

writeFileSync(join(PKG, "src/lib/token-values.ts"), tokenValues);

console.log(
  "✔ Qeetrix tokens built → src/styles/{tokens.css, tokens.raw.css, tokens.json}" +
    " + src/lib/token-values.ts",
);
