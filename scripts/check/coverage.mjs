/**
 * coverage.mjs — the coverage ratchet's bookkeeping half.
 *
 * `TEST-001` recorded that no coverage threshold was configured at all. There is one now, in
 * scripts/config/coverage-baseline.json, and vitest enforces it during `bun run test:coverage`.
 * This script exists because that enforcement is only as good as the file it reads: a floor is a
 * promise that can be quietly lowered in a one-line diff, and the first regression that trips it
 * is the moment somebody is tempted to.
 *
 *   1. **shape** — four metrics, each an integer floor and a measurement it does not exceed
 *   2. **tightness** — a floor more than 5 points under its measurement is slack, not a floor
 *   3. **the ratchet** — floors are compared against the copy at git HEAD. A floor may rise;
 *      lowering one, or deleting a metric, fails. Lowering a floor is a legitimate thing to want
 *      (a large refactor, a component removed) and an illegitimate thing to do quietly, so it
 *      has to be argued for in a changeset rather than committed as a number
 *
 * It does not run the suite: measuring coverage means executing 1 700 tests, and a gate that
 * costs 90 seconds gets skipped. `bun run test:coverage` is where the floors actually bite, and
 * CI runs it as its own job.
 *
 *   node scripts/check/coverage.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "../..");
const BASELINE_REPO_PATH = "scripts/config/coverage-baseline.json";
const BASELINE_PATH = join(ROOT, BASELINE_REPO_PATH);

const METRICS = ["lines", "statements", "functions", "branches"];
/** Points a floor may sit below its measurement before it stops being a floor. */
const MAX_SLACK = 5;

const problems = [];

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
} catch (error) {
  console.error(`\n✗ ${BASELINE_REPO_PATH} could not be read: ${error.message}`);
  process.exit(1);
}

/* ── 1. shape ─────────────────────────────────────────────────────────────────────────────*/

for (const field of ["environment", "metrics", "policy", "recorded", "measured", "thresholds"]) {
  if (!baseline[field]) problems.push(`${BASELINE_REPO_PATH} is missing "${field}"`);
}

for (const metric of METRICS) {
  const floor = baseline.thresholds?.[metric];
  const measured = baseline.measured?.[metric];
  if (!Number.isInteger(floor) || floor < 0 || floor > 100) {
    problems.push(`thresholds.${metric}: must be an integer percentage`);
    continue;
  }
  if (typeof measured !== "number" || measured < 0 || measured > 100) {
    problems.push(`measured.${metric}: must be the percentage the suite reported`);
    continue;
  }
  /* ── 2. tightness ──*/
  if (floor > measured) {
    problems.push(
      `thresholds.${metric}: floor ${floor} is above the measured ${measured} — the suite ` +
        "cannot pass; re-measure before raising it",
    );
  } else if (measured - floor > MAX_SLACK) {
    problems.push(
      `thresholds.${metric}: floor ${floor} is ${(measured - floor).toFixed(2)} points under the ` +
        `measured ${measured}, over the ${MAX_SLACK} allowed. Raise it — coverage that has been ` +
        "earned and not recorded is coverage that can be lost without anything failing",
    );
  }
  if (!baseline.metrics?.[metric]) {
    problems.push(`metrics.${metric}: no description — a percentage of what?`);
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
  // No committed predecessor (the commit that adds the baseline, or no git). Rules above apply.
}

for (const [metric, before] of Object.entries(previous?.thresholds ?? {})) {
  const after = baseline.thresholds?.[metric];
  if (after === undefined) {
    problems.push(`thresholds.${metric}: enforced at HEAD and no longer recorded`);
    continue;
  }
  if (after < before) {
    problems.push(
      `thresholds.${metric}: floor lowered ${before} → ${after}. Floors only rise. If the drop ` +
        "is deliberate, it is a reviewed decision — write it in the changeset, not just here",
    );
  }
}

/* ── report ───────────────────────────────────────────────────────────────────────────────*/

if (problems.length > 0) {
  console.error("\n✗ coverage baseline:\n");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    `\n  ${BASELINE_REPO_PATH} holds the floors vitest enforces.` +
      "\n  Re-measure with `bun run test:coverage` and update `measured` and `thresholds` " +
      "together.\n",
  );
  process.exit(1);
}

const floors = METRICS.map((metric) => `${metric} ${baseline.thresholds[metric]}%`).join(", ");
console.log(
  `\n✓ coverage baseline — ${floors}; ` +
    `${previous ? "none lowered against HEAD" : "no predecessor at HEAD to ratchet against"}. ` +
    "Enforced by `bun run test:coverage`.",
);
