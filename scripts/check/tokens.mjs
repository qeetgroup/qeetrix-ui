/**
 * tokens.mjs — the design-token architecture gate.
 *
 * Validates the authored token graph under src/tokens/ before Style Dictionary ever sees it.
 * That ordering matters: the build resolves references *quietly*, so a reference to a token
 * that does not exist, or a path used as both a leaf and a group, produces no error and no
 * output — the tokens simply vanish. Three groups were lost that way while this layer was
 * being built.
 *
 * What it enforces (see scripts/lib/tokens.mjs for the rules themselves):
 *   path-collision        a path used as both a token and a group
 *   duplicate-declaration the same path declared twice in one theme
 *   missing-reference     an alias or var() that resolves to nothing
 *   layer                 primitive → primitive · semantic → primitive|semantic ·
 *                         component → semantic|component
 *   cross-component       one component's token reaching into another's
 *   type                  a reference whose type is incompatible (button.background → space.4)
 *   circular              any cycle, reported with the chain
 *   raw-value             a value owned above the primitive layer without a $description
 *   deprecation           an incomplete deprecation record, a replacement that does not exist,
 *                         or a live token still pointing at a deprecated one
 *   naming                non-kebab segments, physical directions, un-namespaced component tokens
 *   theme-parity          a dark token with no base value, or a type that changes across themes
 *
 * It also reports two things without failing, because resolving them is a design decision
 * rather than a correctness one: components whose inline density fallback disagrees with the
 * density tokens, and the size of the raw-dimension backlog.
 *
 *   node scripts/check/tokens.mjs
 *   node scripts/check/tokens.mjs --verbose
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatTokenFinding,
  loadTokenGraph,
  readThemeVariables,
  validateTokenGraph,
} from "../lib/tokens.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const VERBOSE = process.argv.includes("--verbose");

const graph = loadTokenGraph({ root: ROOT });
const themeVariables = readThemeVariables(join(ROOT, "src/styles/index.css"));
const findings = validateTokenGraph({ graph, themeVariables });

const errors = findings.filter((f) => f.severity !== "warning");
const warnings = findings.filter((f) => f.severity === "warning");

for (const warning of warnings) {
  console.warn(`\n${formatTokenFinding(warning).replace("Token Error", "Token Warning")}\n`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`\n${formatTokenFinding(error)}\n`);
  const byRule = new Map();
  for (const finding of errors) byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1);
  console.error(
    `✗ ${errors.length} token violation(s): ` +
      [...byRule].map(([rule, count]) => `${count} ${rule}`).join(", "),
  );
  process.exit(1);
}

// ── advisory: inline density fallbacks that disagree with the density tokens ─────────────
// A control writes var(--qx-density-control-height, <fallback>). When the fallback is not the
// `default` mode value, the same component renders one size on its own and another inside a
// DensityProvider. Reported, not failed: picking the right number is a design call.
const densityDefaults = new Map(
  [...graph.tokens.values()]
    .filter((t) => t.path[0] === "density" && t.path[2] === "default")
    .map((t) => [`--qx-density-${t.path[1]}`, t.value]),
);

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
};

const mismatches = [];
for (const root of ["src/components", "src/blocks"]) {
  const dir = join(ROOT, root);
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/var\((--qx-density-[a-z-]+),\s*([^)]+)\)/g)) {
      const expected = densityDefaults.get(match[1]);
      if (expected !== undefined && match[2].trim() !== expected) {
        mismatches.push({
          file: relative(ROOT, file),
          variable: match[1],
          found: match[2].trim(),
          expected,
        });
      }
    }
  }
}

const total = graph.tokens.size;
const perLayer = ["primitive", "semantic", "component"].map((layer) => {
  const count = [...graph.tokens.values()].filter((t) => t.layer === layer).length;
  return `${count} ${layer}`;
});

console.log(
  `✓ tokens — ${total} tokens valid (${perLayer.join(" · ")}), no cycles, themes in parity.`,
);

if (mismatches.length > 0) {
  const files = new Set(mismatches.map((m) => m.file));
  console.log(
    `  ⚠ ${mismatches.length} inline density fallback(s) in ${files.size} component(s) disagree ` +
      "with the density tokens — the control changes size when a DensityProvider is mounted.",
  );
  if (VERBOSE) {
    for (const m of mismatches) {
      console.log(
        `    ${m.file}: ${m.variable} falls back to ${m.found}, tokens say ${m.expected}`,
      );
    }
  } else {
    console.log("    Run with --verbose to list them.");
  }
}
