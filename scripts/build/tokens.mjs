/**
 * Qeetrix token build (folded in from the former @qeetrix/tokens package).
 *
 * Single source (src/tokens/**) → three artifacts under src/styles/ (generated, gitignored):
 *   src/styles/tokens.css      — what the runtime needs: the shadcn / Base-UI bridge
 *                                (UNPREFIXED :root + .dark) plus the semantic and component
 *                                layers (--qx- prefixed) and the density mode selectors.
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
 * Light and dark are built as separate Style Dictionary instances (their token
 * names collide by design), then concatenated.
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

function sdForTheme(theme) {
  const selector = theme === "light" ? ":root" : ".dark";
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
            // light carries the primitives + semantic in :root; dark only the overrides.
            filter: theme === "light" ? notBridge : themeOverride,
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
            filter: theme === "light" ? isConsumable : consumableOverride,
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
for (const theme of ["light", "dark"]) {
  await (await sdForTheme(theme)).buildAllPlatforms();
}

mkdirSync(OUT, { recursive: true });
const header =
  "/**\n * Qeetrix design tokens — GENERATED by scripts/build/tokens.mjs.\n" +
  " * Do not edit by hand. Edit src/tokens/** and rebuild (`bun run build:tokens`).\n */\n";
const read = (f) => readFileSync(join(BUILD, f), "utf8");
const lightTokens = JSON.parse(read("tokens-light.json"));

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

  return [
    `:root {\n${defaults}\n}`,
    `[data-qx-density="comfortable"] {\n${declarations("comfortable")}\n}`,
    `[data-qx-density="compact"] {\n${declarations("compact")}\n}`,
  ].join("\n\n");
}

writeFileSync(
  join(OUT, "tokens.css"),
  `${header}\n${read("bridge-light.css")}\n${read("bridge-dark.css")}\n` +
    `${read("consumable-light.css")}\n${read("consumable-dark.css")}\n` +
    `${densityModeCss(lightTokens)}\n`,
);
writeFileSync(
  join(OUT, "tokens.raw.css"),
  `${header}\n${read("raw-light.css")}\n${read("raw-dark.css")}`,
);
writeFileSync(
  join(OUT, "tokens.json"),
  `${JSON.stringify(
    {
      $description: "Qeetrix design tokens, resolved per theme. Generated — do not edit.",
      light: lightTokens,
      dark: JSON.parse(read("tokens-dark.json")),
    },
    null,
    2,
  )}\n`,
);

// ---- typed foundations ------------------------------------------------------
// The same resolved tokens, as TypeScript. This is the *only* place these values exist in
// code: src/lib/token-values.ts re-exports it, so `@qeetrix/ui/lib/token-values` and the root
// barrel keep working while the numbers stay generated. Editing the .ts by hand is how a
// design system ends up with two truths.

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

const t = lightTokens;
const foundations = [
  "/**",
  " * Qeetrix typed token values — GENERATED by scripts/build/tokens.mjs.",
  " *",
  " * Do not edit by hand: edit src/tokens/** and run `bun run build:tokens`. This module is the",
  " * `foundations` layer — token values, typed, with no React and no dependencies. Components",
  " * reach for it through src/lib/token-values.ts, which re-exports it unchanged.",
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
    "Z_INDEX",
    entries(t.z, (v) => Number(v)),
    "The stacking ladder. Higher wins.",
  ),
  block(
    "STATE_OPACITY",
    entries(t.state.opacity, (v) => Number(v)),
    "Opacity applied to interactive states.",
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
  block(
    "SHADOW",
    entries(Object.fromEntries(Object.entries(t.shadow).filter(([k]) => k !== "ramp")), quote),
    "The elevation ladder, as CSS shadow values.",
  ),
  block(
    "CHART_COLOR",
    [
      ...Array.from({ length: 8 }, (_, i) => `  series${i + 1}: "var(--chart-${i + 1})",`),
      ...["grid", "axis", "reference", "positive", "negative", "warning"].map(
        (role) => `  ${role}: "var(--chart-${role})",`,
      ),
    ].join("\n"),
    "Chart roles as CSS variable references, so a chart re-themes with the document.",
  ),
].join("\n");

mkdirSync(join(PKG, "src/foundations"), { recursive: true });
writeFileSync(join(PKG, "src/foundations/token-values.ts"), foundations);

console.log(
  "✔ Qeetrix tokens built → src/styles/{tokens.css, tokens.raw.css, tokens.json}" +
    " + src/foundations/token-values.ts",
);
