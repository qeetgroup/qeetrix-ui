/**
 * check-a11y-coverage.mjs — the accessibility-coverage ratchet (Gap 3/12).
 *
 * Every component in src/components/<category>/ must have automated a11y coverage:
 *   (a) a test at src/components/<category>/__tests__/<name>.test.tsx, OR
 *   (b) be rendered in the global smoke harness src/__tests__/a11y.test.tsx, OR
 *   (c) be listed in src/__tests__/a11y-coverage-exemptions.json (the shrinking backlog).
 *
 * A component that is none of these fails the gate (exit 1). The exemption list may
 * only shrink: add a test, then remove the name here. Stale exemptions (now covered,
 * or no longer a component) are reported as warnings.
 *
 *   node scripts/check/a11y-coverage.mjs          # validate (CI)
 *   node scripts/check/a11y-coverage.mjs --init    # (re)seed exemptions with the
 *                                                     current uncovered set
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = join(SCRIPT_DIR, "../../src/components");
const GLOBAL_HARNESS = join(SCRIPT_DIR, "../../src/__tests__/a11y.test.tsx");
const EXEMPTIONS_PATH = join(SCRIPT_DIR, "../../src/__tests__/a11y-coverage-exemptions.json");
const INIT = process.argv.includes("--init");

const isComponent = (f) => /\.tsx$/.test(f) && !/\.(test|stories)\.tsx$/.test(f);

// Category folders under src/components/ (actions, inputs, …).
const categories = readdirSync(COMPONENTS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

// Component universe (base names) across every category.
const universe = categories
  .flatMap((c) =>
    readdirSync(join(COMPONENTS_DIR, c))
      .filter(isComponent)
      .map((f) => f.replace(/\.tsx$/, "")),
  )
  .sort();

// (a) per-category tests: src/components/<category>/__tests__/<name>.test.tsx
const colocated = new Set(
  categories.flatMap((c) => {
    const dir = join(COMPONENTS_DIR, c, "__tests__");
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => /\.test\.tsx?$/.test(f))
      .map((f) => f.replace(/\.test\.tsx?$/, ""));
  }),
);

// (b) components imported by the global smoke harness (@/components/<category>/<name>).
const globalCovered = new Set();
if (existsSync(GLOBAL_HARNESS)) {
  const src = readFileSync(GLOBAL_HARNESS, "utf8");
  const re = /@\/components\/[a-z-]+\/([a-z0-9-]+)/g;
  let m = re.exec(src);
  while (m !== null) {
    globalCovered.add(m[1]);
    m = re.exec(src);
  }
}

const covered = (name) => colocated.has(name) || globalCovered.has(name);
const uncovered = universe.filter((n) => !covered(n));

// --init: (re)write the exemptions file with the current uncovered set.
if (INIT) {
  const payload = {
    $comment:
      "Components without automated a11y coverage yet (Gap 3/12 ratchet). This list may ONLY shrink: add a colocated <name>.test.tsx (or render it in src/__tests__/a11y.test.tsx), then remove it here. `bun run --filter @qeetrix/ui test:a11y-coverage` fails if a component is neither covered nor listed.",
    exempt: uncovered,
  };
  writeFileSync(EXEMPTIONS_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`✔ Seeded ${uncovered.length} exemption(s) → ${EXEMPTIONS_PATH}`);
  process.exit(0);
}

// Validate.
let exempt = [];
if (existsSync(EXEMPTIONS_PATH)) {
  exempt = JSON.parse(readFileSync(EXEMPTIONS_PATH, "utf8")).exempt ?? [];
}
const exemptSet = new Set(exempt);

const missing = uncovered.filter((n) => !exemptSet.has(n));
const staleCovered = exempt.filter((n) => covered(n));
const staleGone = exempt.filter((n) => !universe.includes(n));

const total = universe.length;
const coveredCount = total - uncovered.length;
const pct = ((coveredCount / total) * 100).toFixed(1);

console.log(
  `a11y coverage: ${coveredCount}/${total} components (${pct}%) — ${colocated.size} in __tests__ + ${globalCovered.size} via global harness; ${exemptSet.size} exempted (backlog).`,
);

for (const n of staleCovered)
  console.warn(
    `⚠  stale exemption (now covered): remove "${n}" from a11y-coverage-exemptions.json`,
  );
for (const n of staleGone) console.warn(`⚠  stale exemption (no such component): remove "${n}"`);

if (missing.length) {
  console.error(
    `\n✗ ${missing.length} component(s) have no a11y coverage and are not exempted:\n  ${missing.join(", ")}\n` +
      "Add src/components/<category>/__tests__/<name>.test.tsx, or (temporarily) list it in src/__tests__/a11y-coverage-exemptions.json.",
  );
  process.exit(1);
}
console.log("✓ Every component is covered or exempted.");
