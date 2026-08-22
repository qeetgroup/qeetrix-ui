#!/usr/bin/env node
/**
 * Enforces token-backed styling in production Qeetrix components and blocks.
 *
 * Two mechanisms, because the two problems are different:
 *
 *   - **Raw colours, z-indexes and shadows** are never acceptable in component source. Domain
 *     values and third-party selector shims need a narrow, reasoned exemption in
 *     scripts/config/raw-value-exemptions.json. "Raw colour" includes the *named Tailwind
 *     palette* (`text-sky-700`, `fill-amber-400`): it looks token-backed because it is a class
 *     name, but the palette is not published to the runtime stylesheet, so a brand theme and the
 *     contrast gate cannot reach it. Only the semantic namespaces are governed.
 *   - **Raw lengths in arbitrary values** (`text-[11px]`, `rounded-[2px]`, `w-[32px]`) are a
 *     pre-existing backlog, not a new mistake. They run on a ratchet:
 *     scripts/config/raw-dimension-baseline.json records what exists today, the gate fails on
 *     anything new, and the list may only shrink. Expressions — calc(), min(), var() — are not
 *     flagged: those are layout arithmetic, not design decisions.
 *
 *   node scripts/check/token-usage.mjs
 *   node scripts/check/token-usage.mjs --init   # reseed the raw-dimension baseline
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIG_PATH = join(PACKAGE_ROOT, "scripts/config/raw-value-exemptions.json");
const BASELINE_PATH = join(PACKAGE_ROOT, "scripts/config/raw-dimension-baseline.json");
const JSON_OUTPUT = process.argv.includes("--json");
const INIT = process.argv.includes("--init");
const SOURCE_ROOTS = [
  join(PACKAGE_ROOT, "src/components"),
  join(PACKAGE_ROOT, "src/blocks"),
  join(PACKAGE_ROOT, "src/providers"),
];
const CODE_FILE = /\.(?:ts|tsx)$/;
const EXCLUDED_FILE = /\.(?:test|stories)\.(?:ts|tsx)$/;

const RULES = [
  {
    id: "raw-color",
    message:
      "Use a semantic/primitive token; literal colors are allowed only as documented domain data.",
    pattern: /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\([^\n)]*\)/g,
  },
  {
    id: "palette-utility",
    message:
      "Use a semantic role utility (bg-muted, text-success, text-syntax-key, …) — a named " +
      "Tailwind palette class is a colour decision the component owns, so brand themes, " +
      "forced-colors and the contrast gate cannot reach it.",
    // Named palette utilities: `text-sky-700`, `dark:fill-amber-400`, `bg-rose-500/20`. The
    // ramp name is what makes this unambiguous — `duration-300` and `z-50` do not match, and
    // neither do the semantic namespaces (`bg-muted`, `text-primary`) or Qeetrix's own
    // `--chart-*`/`--syntax-*` roles. Deliberately includes `neutral`: the palette is not
    // published to the runtime stylesheet, so `bg-neutral-100` is still an unthemed decision.
    pattern:
      /\b(?:bg|text|border|fill|stroke|ring|outline|decoration|divide|accent|caret|placeholder|from|via|to|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(?:50|[1-9]\d{2})\b(?:\/\d{1,3})?/g,
  },
  {
    id: "arbitrary-z-index",
    message: "Use a semantic --qx-z-* token instead of an arbitrary z-index utility.",
    pattern: /\bz-\[[^\]\n]+\]/g,
  },
  {
    id: "arbitrary-shadow-color",
    message: "Use a --qx-shadow-* token instead of an arbitrary colored shadow utility.",
    pattern: /\bshadow-\[[^\]\n]*(?:#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla|oklch)\()[^\]\n]*\]/g,
  },
  {
    id: "legacy-disabled-opacity",
    message: "Use opacity-disabled so disabled styling resolves from state.opacity.disabled.",
    pattern: /\bopacity-50\b/g,
  },
  {
    id: "raw-dimension",
    message:
      "Use a token or the Tailwind scale — a bare length in an arbitrary value is an " +
      "undocumented design decision. If the component genuinely owns it, give it a component " +
      "token with a $description.",
    // Only bare literals. calc(), min(), var() and friends are arithmetic, not design values.
    pattern: /\b[a-z-]+-\[-?\d*\.?\d+(?:px|rem|em)\]/g,
    ratchet: true,
  },
];

// The raw-dimension ratchet: file → the literals that already existed. May only shrink.
let baseline = { allowed: {} };
if (existsSync(BASELINE_PATH)) baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
const baselineAllowed = baseline.allowed ?? {};
const baselineHits = new Set();
const seeded = {};

function isBaselined(file, rule, match) {
  if (rule !== "raw-dimension") return false;
  const allowed = baselineAllowed[file] ?? [];
  if (allowed.includes(match)) {
    baselineHits.add(`${file}::${match}`);
    return true;
  }
  return false;
}

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (CODE_FILE.test(entry.name) && !EXCLUDED_FILE.test(entry.name)) yield path;
  }
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const exemptions = config.exemptions ?? [];
const usedExemptions = new Set();

function isExempt(file, rule, match) {
  return exemptions.some((entry, index) => {
    const matches =
      entry.file === file &&
      entry.rule === rule &&
      Array.isArray(entry.matches) &&
      (entry.matches.includes("*") || entry.matches.includes(match));
    if (matches) usedExemptions.add(index);
    return matches;
  });
}

const violations = [];
exemptions.forEach((entry, index) => {
  if (
    typeof entry.file !== "string" ||
    typeof entry.rule !== "string" ||
    !Array.isArray(entry.matches) ||
    !entry.matches.length ||
    typeof entry.reason !== "string" ||
    !entry.reason.trim()
  ) {
    violations.push({
      file: relative(PACKAGE_ROOT, CONFIG_PATH).replaceAll("\\", "/"),
      line: index + 1,
      column: 1,
      rule: "invalid-exemption",
      match: JSON.stringify(entry),
      message: "Every exemption requires file, rule, matches, and a non-empty reason.",
    });
  }
});
let scannedFiles = 0;
for (const root of SOURCE_ROOTS) {
  if (!existsSync(root)) continue;
  for (const path of walk(root)) {
    scannedFiles++;
    const file = relative(PACKAGE_ROOT, path).replaceAll("\\", "/");
    const lines = readFileSync(path, "utf8").split("\n");
    lines.forEach((line, lineIndex) => {
      for (const rule of RULES) {
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
        for (const result of line.matchAll(pattern)) {
          const match = result[0];
          if (isExempt(file, rule.id, match)) continue;
          if (rule.ratchet) {
            if (INIT) {
              seeded[file] ??= new Set();
              seeded[file].add(match);
              continue;
            }
            if (isBaselined(file, rule.id, match)) continue;
          }
          violations.push({
            file,
            line: lineIndex + 1,
            column: (result.index ?? 0) + 1,
            rule: rule.id,
            match,
            message: rule.message,
          });
        }
      }
    });
  }
}

if (INIT) {
  const allowed = Object.fromEntries(
    Object.entries(seeded)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, matches]) => [file, [...matches].sort()]),
  );
  const count = Object.values(allowed).reduce((n, list) => n + list.length, 0);
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify(
      {
        $comment:
          "Raw lengths in arbitrary Tailwind values that predate the token architecture. This list may ONLY shrink: replace the literal with a token or a scale step, then delete the entry. `node scripts/check/token-usage.mjs` fails on any literal that is not listed here.",
        allowed,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `✔ Seeded ${count} raw-dimension baseline entr(y|ies) → ${relative(PACKAGE_ROOT, BASELINE_PATH)}`,
  );
  process.exit(0);
}

// Stale baseline entries: the literal is gone, so the allowance should go too.
for (const [file, matches] of Object.entries(baselineAllowed)) {
  for (const match of matches) {
    if (!baselineHits.has(`${file}::${match}`)) {
      console.warn(
        `⚠  stale raw-dimension baseline: "${match}" is no longer in ${file} — remove it from ${relative(PACKAGE_ROOT, BASELINE_PATH)}`,
      );
    }
  }
}

exemptions.forEach((entry, index) => {
  if (!usedExemptions.has(index)) {
    violations.push({
      file: relative(PACKAGE_ROOT, CONFIG_PATH).replaceAll("\\", "/"),
      line: index + 1,
      column: 1,
      rule: "stale-exemption",
      match: `${entry.file} [${entry.rule}]`,
      message: "Remove exemptions that no longer match production source.",
    });
  }
});

if (JSON_OUTPUT) {
  console.log(JSON.stringify({ scannedFiles, violations }, null, 2));
} else if (violations.length) {
  console.error(`Token usage scan failed: ${violations.length} violation(s).`);
  for (const violation of violations) {
    console.error(
      `  ${violation.file}:${violation.line}:${violation.column} [${violation.rule}] ${violation.match}`,
    );
    console.error(`    ${violation.message}`);
  }
} else {
  const baselined = Object.values(baselineAllowed).reduce((n, list) => n + list.length, 0);
  console.log(
    `Token usage scan passed: ${scannedFiles} production source files, ${usedExemptions.size} documented exemptions, ` +
      `${baselined} raw-dimension backlog entr${baselined === 1 ? "y" : "ies"}, 0 violations.`,
  );
}

if (violations.length) process.exit(1);
