/**
 * performance.mjs — the scale ratchet.
 *
 * `PERF-002` was not "these components are slow", it was "nobody knows": no render budget, no
 * observer budget, no input-size contract, no benchmark. src/__tests__/performance/scale.test.tsx
 * now measures the components the finding names and asserts every number in
 * src/__tests__/performance/baseline.json. This script governs that file, because a budget with
 * nothing watching it drifts upward one commit at a time until it means nothing:
 *
 *   1. **shape** — every case names its fixture, and every metric has an integer measurement and
 *      an integer budget at or above it
 *   2. **tightness** — a budget more than 25% above its measurement is rejected. Headroom is for
 *      noise, not for a regression somebody decided to accommodate
 *   3. **the ratchet** — budgets are compared against the copy at git HEAD. A budget may shrink;
 *      raising one, or dropping a case or a metric, fails. That is the whole point: the only way
 *      to record a bigger number is to change it in a diff a human reads
 *   4. **coverage** — every component the finding names has at least one case
 *   5. **liveness** — the case names in the baseline and the ones the suite asserts are the same
 *      set, so a stale entry cannot sit there looking like a guarantee
 *
 * These are jsdom measurements — JavaScript work and DOM construction, not paint or layout. The
 * baseline says so in its own `environment` field; this script only checks the bookkeeping.
 *
 *   node scripts/check/performance.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "../..");
const BASELINE_REPO_PATH = "src/__tests__/performance/baseline.json";
const BASELINE_PATH = join(ROOT, BASELINE_REPO_PATH);
const SUITE_PATH = join(ROOT, "src/__tests__/performance/scale.test.tsx");

/** Components PERF-001 and PERF-002 name, as case-name prefixes. */
const REQUIRED_PREFIXES = [
  "diff-viewer",
  "data-table",
  "tree-view",
  "org-chart",
  "json-tree",
  "feed",
  "schedule-calendar",
];
const REQUIRED_METADATA = ["environment", "metrics", "policy", "recorded", "cases"];
/** Headroom allowed between a measurement and its budget. */
const MAX_HEADROOM = 1.25;

const problems = [];

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
} catch (error) {
  console.error(`\n✗ ${BASELINE_REPO_PATH} could not be read: ${error.message}`);
  process.exit(1);
}

/* ── 1. shape ─────────────────────────────────────────────────────────────────────────────*/

for (const field of REQUIRED_METADATA) {
  if (!baseline[field]) problems.push(`${BASELINE_REPO_PATH} is missing "${field}"`);
}

const cases = baseline.cases ?? {};
if (Object.keys(cases).length === 0) problems.push("no cases recorded");

for (const [name, entry] of Object.entries(cases)) {
  if (typeof entry.fixture !== "string" || entry.fixture.trim() === "") {
    problems.push(`${name}: no fixture description — a number without its input means nothing`);
  }
  const metrics = Object.entries(entry.metrics ?? {});
  if (metrics.length === 0) problems.push(`${name}: no metrics recorded`);

  for (const [metric, record] of metrics) {
    const { measured, budget } = record ?? {};
    if (!Number.isInteger(measured) || measured < 0) {
      problems.push(`${name}.${metric}: "measured" must be a non-negative integer`);
      continue;
    }
    if (!Number.isInteger(budget) || budget < 0) {
      problems.push(`${name}.${metric}: "budget" must be a non-negative integer`);
      continue;
    }
    /* ── 2. tightness ──*/
    if (budget < measured) {
      problems.push(
        `${name}.${metric}: budget ${budget} is below the measurement ${measured} — the suite ` +
          "cannot pass; re-measure",
      );
    } else if (budget > Math.ceil(measured * MAX_HEADROOM)) {
      problems.push(
        `${name}.${metric}: budget ${budget} is more than ${Math.round(
          (MAX_HEADROOM - 1) * 100,
        )}% above the measurement ${measured} — tighten it to what the code actually costs`,
      );
    }
  }
}

/* ── 3. the ratchet ───────────────────────────────────────────────────────────────────────*/

let previous = null;
try {
  previous = JSON.parse(
    execFileSync("git", ["show", `HEAD:${BASELINE_REPO_PATH}`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
} catch {
  // No committed predecessor (first commit that adds the baseline, or no git). Nothing to
  // ratchet against yet; the shape and coverage rules above still apply.
}

if (previous?.cases) {
  for (const [name, entry] of Object.entries(previous.cases)) {
    const current = cases[name];
    if (!current) {
      problems.push(
        `${name}: recorded at HEAD and gone now — deleting a case removes a guarantee; ` +
          "say so in the changeset and remove it from the suite in the same commit",
      );
      continue;
    }
    for (const [metric, record] of Object.entries(entry.metrics ?? {})) {
      const now = current.metrics?.[metric];
      if (!now) {
        problems.push(`${name}.${metric}: measured at HEAD and no longer recorded`);
        continue;
      }
      if (now.budget > record.budget) {
        problems.push(
          `${name}.${metric}: budget raised ${record.budget} → ${now.budget}. Budgets only ` +
            "shrink. If the regression is deliberate, that is a reviewed decision — write it " +
            "in the changeset, not just here",
        );
      }
    }
  }
}

/* ── 4. coverage ──────────────────────────────────────────────────────────────────────────*/

const names = Object.keys(cases);
for (const prefix of REQUIRED_PREFIXES) {
  if (!names.some((name) => name.startsWith(`${prefix}/`))) {
    problems.push(`no case covers ${prefix} — every component the findings name needs one`);
  }
}

/* ── 5. liveness ──────────────────────────────────────────────────────────────────────────*/

let suite = "";
try {
  suite = readFileSync(SUITE_PATH, "utf8");
} catch {
  problems.push(
    "src/__tests__/performance/scale.test.tsx is missing — nothing asserts the budgets",
  );
}
if (suite) {
  const asserted = new Set(
    [...suite.matchAll(/assertBudget\(\s*"([^"]+)"/g)].map((match) => match[1]),
  );
  for (const name of names) {
    if (!asserted.has(name)) problems.push(`${name}: recorded but never asserted by the suite`);
  }
  for (const name of asserted) {
    if (!cases[name]) problems.push(`${name}: asserted by the suite but not recorded`);
  }
}

/* ── report ───────────────────────────────────────────────────────────────────────────────*/

if (problems.length > 0) {
  console.error("\n✗ performance baseline:\n");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    `\n  ${BASELINE_REPO_PATH} records what the components measured on the day it was written. ` +
      "\n  Re-measure with `bunx vitest run src/__tests__/performance/scale.test.tsx`.\n",
  );
  process.exit(1);
}

const metricCount = Object.values(cases).reduce(
  (total, entry) => total + Object.keys(entry.metrics).length,
  0,
);
console.log(
  `\n✓ performance baseline — ${names.length} cases, ${metricCount} budgets, ` +
    `${previous ? "none raised against HEAD" : "no predecessor at HEAD to ratchet against"}, ` +
    "every case asserted by the suite.",
);
