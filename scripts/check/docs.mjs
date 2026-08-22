#!/usr/bin/env node
/**
 * docs.mjs — the documentation-truth gate.
 *
 * `DOC-001` was not "the docs are wrong today". It was that every fact in them is hand-maintained
 * while the thing it describes is generated, so any number that is right is right by coincidence
 * and only until the next change. Correcting the numbers without adding a check would have closed
 * the finding for about an hour: this remediation *created* fresh drift in the same files it was
 * fixing, which is the proof.
 *
 * So this checks classes of claim that can be derived from an artifact, and nothing else. It does
 * not attempt to validate prose. Four rules:
 *
 *   1. **Counts.** "145 components", "10 categories", and any manifest status tally quoted in a doc
 *      must match `component-manifest.json`.
 *   2. **Layer population.** A doc may not describe a layer as empty or unpopulated while files
 *      exist in it. This is the class that produced "runtime — declared, not yet populated" three
 *      hours after five modules landed there.
 *   3. **Tooling names.** A doc may not name a tool this package does not use. `eslint` earned its
 *      place on the list by surviving in the README's quality table long after Biome replaced it.
 *   4. **Links.** Every relative link in a Markdown doc must resolve, and a `#Lnn-Lnn` range must
 *      point inside a file that has that many lines.
 *
 * Deliberately not checked: test and export counts. Both change on almost every commit, and a gate
 * that fails for a legitimate reason a dozen times a day gets removed. Where a doc wants one, it
 * should say "see `bun run verify`" rather than quote a number.
 *
 *   node scripts/check/docs.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(readFileSync(join(ROOT, "component-manifest.json"), "utf8"));

/** Docs this gate governs. The gap analysis is a point-in-time report and is exempt. */
const EXEMPT = new Set(["docs/ENTERPRISE-GAP-ANALYSIS.md"]);

const markdownFiles = (() => {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && !entry.name.startsWith(".")) walk(path);
      } else if (entry.name.endsWith(".md")) {
        const rel = relative(ROOT, path).split("\\").join("/");
        if (!EXEMPT.has(rel)) out.push(rel);
      }
    }
  };
  walk(join(ROOT, "docs"));
  for (const top of ["README.md", "CONTRIBUTING.md"]) {
    if (existsSync(join(ROOT, top))) out.push(top);
  }
  return out;
})();

/* ── truth, derived ─────────────────────────────────────────────────────────────────────────── */

const componentCount = Array.isArray(manifest.components)
  ? manifest.components.length
  : Object.keys(manifest.components ?? {}).length;

const categoryCount = (() => {
  const map = JSON.parse(readFileSync(join(ROOT, "scripts/config/category-map.json"), "utf8"));
  return Object.keys(map).length;
})();

const statusCounts = (() => {
  const tally = {};
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") {
      if (typeof node.status === "string") tally[node.status] = (tally[node.status] ?? 0) + 1;
      Object.values(node).forEach(walk);
    }
  };
  walk(manifest.components ?? manifest);
  return tally;
})();

/** A layer is populated when it holds at least one non-test source file. */
const populatedLayers = (() => {
  const layers = JSON.parse(
    readFileSync(join(ROOT, "scripts/config/category-map.json"), "utf8"),
  ) && ["runtime", "primitives", "foundations", "hooks", "lib", "providers", "manifests"];
  const populated = new Set();
  for (const layer of layers) {
    const dir = join(ROOT, "src", layer);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir, { withFileTypes: true }).filter(
      (e) => e.isFile() && /\.tsx?$/.test(e.name),
    );
    if (files.length > 0) populated.add(layer);
  }
  return populated;
})();

const FORBIDDEN_TOOLS = ["eslint", "prettier", "jest", "pnpm", "yarn"];

/* ── rules ──────────────────────────────────────────────────────────────────────────────────── */

const problems = [];
const add = (file, line, message) => problems.push({ file, line, message });

for (const file of markdownFiles) {
  const source = readFileSync(join(ROOT, file), "utf8");
  const lines = source.split("\n");

  lines.forEach((text, index) => {
    const lineNo = index + 1;

    // 1. counts. Only phrasings that can *only* mean the whole set — a doc must stay free to
    // discuss a subset ("78 components were audited", "61 components lost a claim") without this
    // gate treating every number near the word "components" as a total. An over-eager rule here
    // produces false positives on legitimate prose, and a gate that cries wolf gets deleted.
    for (const [, n] of text.matchAll(
      /\b(?:all|the)\s+(\d{2,4})\s+components?\b|\b(\d{2,4})\s+components?\s+(?:across|in total)\b/g,
    )) {
      const claimed = Number(n);
      if (claimed !== componentCount) {
        add(
          file,
          lineNo,
          `claims ${claimed} components in total; the manifest has ${componentCount}`,
        );
      }
    }
    for (const [, n] of text.matchAll(/\b(\d{1,3})\s+categor(?:y|ies)\b/g)) {
      if (Number(n) !== categoryCount) {
        add(file, lineNo, `claims ${n} categories; category-map.json has ${categoryCount}`);
      }
    }
    for (const status of ["experimental", "beta", "stable", "deprecated"]) {
      for (const [, n] of text.matchAll(new RegExp(`"?${status}"?\\s*[:=]\\s*(\\d{1,4})`, "g"))) {
        const actual = statusCounts[status] ?? 0;
        if (Number(n) !== actual) {
          add(file, lineNo, `claims ${status} = ${n}; the manifest has ${actual}`);
        }
      }
      for (const [, n] of text.matchAll(new RegExp(`\\b(\\d{1,4})\\s+${status}\\b`, "g"))) {
        const actual = statusCounts[status] ?? 0;
        if (Number(n) !== actual) {
          add(file, lineNo, `claims ${n} ${status}; the manifest has ${actual}`);
        }
      }
    }

    // 2. layer population
    for (const layer of populatedLayers) {
      const mentionsLayer = new RegExp(`src/${layer}\\b|\`${layer}\``).test(text);
      const claimsEmpty =
        /not yet populated|declared,? (?:but )?empty|currently empty|and empty/i.test(text);
      if (mentionsLayer && claimsEmpty) {
        add(file, lineNo, `describes the populated \`${layer}\` layer as empty`);
      }
    }

    // 3. tooling names
    for (const tool of FORBIDDEN_TOOLS) {
      if (new RegExp(`\\b${tool}\\b`, "i").test(text)) {
        add(file, lineNo, `names \`${tool}\`, which this package does not use`);
      }
    }

    // 4. relative links
    for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(?:https?:|mailto:|#)/.test(target)) continue;
      const [path, fragment] = target.split("#");
      if (!path) continue;
      const abs = resolve(join(ROOT, dirname(file)), path);
      if (!existsSync(abs)) {
        add(file, lineNo, `link target does not exist: ${path}`);
        continue;
      }
      const range = fragment && /^L(\d+)(?:-L(\d+))?$/.exec(fragment);
      if (range && statSync(abs).isFile()) {
        const last = Number(range[2] ?? range[1]);
        const count = readFileSync(abs, "utf8").split("\n").length;
        if (last > count) {
          add(file, lineNo, `link points at line ${last} of ${path}, which has ${count}`);
        }
      }
    }
  });
}

/* ── report ─────────────────────────────────────────────────────────────────────────────────── */

if (problems.length > 0) {
  console.error(`\n✗ documentation drift — ${problems.length} claim(s) no longer true\n`);
  for (const { file, line, message } of problems) {
    console.error(`  ${file}:${line}  ${message}`);
  }
  console.error(
    "\nEvery item above is derivable from an artifact, so it is drift rather than opinion.\n" +
      "Fix the documentation, not this gate — and land the fix in the same changeset as the\n" +
      "contract change that caused it.\n",
  );
  process.exit(1);
}

console.log(
  `✓ documentation — ${markdownFiles.length} files: ${componentCount} components, ` +
    `${categoryCount} categories, statuses ${JSON.stringify(statusCounts)}, ` +
    `${populatedLayers.size} populated layers, all relative links resolve.`,
);
