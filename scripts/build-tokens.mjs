/**
 * Qeetrix token build (folded in from the former @qeetrix/tokens package).
 *
 * Single source (tokens/**) → three artifacts under src/styles/ (generated, gitignored):
 *   src/styles/tokens.css      — shadcn / Base-UI bridge (:root + .dark, UNPREFIXED vars)
 *   src/styles/tokens.raw.css  — full raw token export (--qx- prefixed)
 *   src/styles/tokens.json     — resolved tokens per theme (cross-platform)
 *
 * index.css imports ./styles/tokens.css; postbuild copies src/styles → dist/styles
 * (so the relative import and the ./tokens.* subpath exports resolve from dist).
 *
 * Light and dark are built as separate Style Dictionary instances (their token
 * names collide by design), then concatenated.
 *
 * Run: bun run --filter @qeetrix/ui build-tokens  (also runs at the start of build/dev).
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import StyleDictionary from "style-dictionary";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS = join(PKG, "tokens");
const BUILD = join(PKG, "build");
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

// ---- per-theme instance -----------------------------------------------------

function sdForTheme(theme) {
  const selector = theme === "light" ? ":root" : ".dark";
  return new StyleDictionary({
    source: [join(TOKENS, "primitive/**/*.json"), join(TOKENS, `theme/${theme}/**/*.json`)],
    log: { verbosity: "silent", warnings: "disabled" },
    platforms: {
      bridge: {
        buildPath: "build/",
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
        buildPath: "build/",
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
      json: {
        buildPath: "build/",
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
  "/**\n * Qeetrix design tokens — GENERATED by packages/qeetrix-ui/scripts/build-tokens.mjs.\n" +
  " * Do not edit by hand. Edit packages/qeetrix-ui/tokens/** and rebuild (`bun run --filter @qeetrix/ui build-tokens`).\n */\n";
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

  return [
    `[data-qx-density="comfortable"] {\n${declarations("comfortable")}\n}`,
    `[data-qx-density="compact"] {\n${declarations("compact")}\n}`,
  ].join("\n\n");
}

function focusCss(tokens) {
  return [
    ":root {",
    `  --qx-focus-ring-width: ${tokens.focus["ring-width"]};`,
    `  --qx-focus-outline-width: ${tokens.focus["outline-width"]};`,
    `  --qx-focus-offset: ${tokens.focus.offset};`,
    "}",
  ].join("\n");
}

writeFileSync(
  join(OUT, "tokens.css"),
  `${header}\n${read("bridge-light.css")}\n${read("bridge-dark.css")}\n${focusCss(lightTokens)}\n\n${densityModeCss(lightTokens)}\n`,
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

console.log("✔ Qeetrix tokens built → src/styles/{tokens.css, tokens.raw.css, tokens.json}");

console.log("✔ Qeetrix tokens built → src/styles/{tokens.css, tokens.raw.css, tokens.json}");
