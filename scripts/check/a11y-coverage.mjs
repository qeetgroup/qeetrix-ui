/**
 * a11y-coverage.mjs — accessibility coverage, on two levels.
 *
 * **Level 1 — every component has an axe test.** The original ratchet:
 *   (a) a test at src/components/<category>/__tests__/<name>.test.tsx, OR
 *   (b) rendered in the global smoke harness src/__tests__/a11y.test.tsx, OR
 *   (c) listed in src/__tests__/a11y-coverage-exemptions.json (the shrinking backlog).
 *
 * **Level 2 — the audit matrix.** An axe pass is necessary and nowhere near sufficient: axe
 * checks part of the semantic layer and nothing at all about keyboard, focus or announcement
 * behaviour. So the manifest carries a per-dimension audit state per component, and this reports
 * it. `audited` means a test in src/__tests__/accessibility/ covers every applicable dimension —
 * not that somebody looked once.
 *
 * The gate is migration-aware: coverage may improve but not regress, measured against
 * scripts/config/contract-coverage-baseline.json. A `stable` component with a declared
 * accessibility contract cannot silently drop out of the audited set, and an `exception` must
 * carry a reason.
 *
 *   node scripts/check/a11y-coverage.mjs          # validate (CI)
 *   node scripts/check/a11y-coverage.mjs --verbose # list the un-audited components
 *   node scripts/check/a11y-coverage.mjs --init    # (re)seed the axe exemption backlog
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = join(SCRIPT_DIR, "../../src/components");
const GLOBAL_HARNESS = join(SCRIPT_DIR, "../../src/__tests__/a11y.test.tsx");
const EXEMPTIONS_PATH = join(SCRIPT_DIR, "../../src/__tests__/a11y-coverage-exemptions.json");
const INIT = process.argv.includes("--init");
const VERBOSE = process.argv.includes("--verbose");

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
    exempt: uncovered.map((component) => ({
      component,
      rule: "coverage",
      reason: "TODO: replace this with the real reason before committing.",
      revisit: "Add a colocated axe test.",
    })),
  };
  writeFileSync(EXEMPTIONS_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`✔ Seeded ${uncovered.length} exemption(s) → ${EXEMPTIONS_PATH}`);
  process.exit(0);
}

// Validate. Entries are objects — an exemption has to say what, why, and what would end it.
let exemptEntries = [];
if (existsSync(EXEMPTIONS_PATH)) {
  exemptEntries = JSON.parse(readFileSync(EXEMPTIONS_PATH, "utf8")).exempt ?? [];
}

let malformed = 0;
for (const entry of exemptEntries) {
  const missing = ["component", "rule", "reason", "revisit"].filter(
    (field) => typeof entry?.[field] !== "string" || entry[field].trim().length === 0,
  );
  if (missing.length > 0) {
    malformed += 1;
    console.error(
      `✗ a11y exemption ${JSON.stringify(entry)} is missing ${missing.join(", ")} — ` +
        "an exemption without a reason is a defect with a label on it.",
    );
  }
}
if (malformed > 0) process.exit(1);

const exempt = exemptEntries.map((entry) => entry.component);
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

// ── Level 2: the audit matrix ─────────────────────────────────────────────────────────────
const manifest = JSON.parse(
  readFileSync(join(SCRIPT_DIR, "../../component-manifest.json"), "utf8"),
);
const baseline = JSON.parse(
  readFileSync(join(SCRIPT_DIR, "../../scripts/config/contract-coverage-baseline.json"), "utf8"),
);
const components = manifest.components;
const DIMENSIONS = Object.keys(components[0]?.accessibility?.dimensions ?? {});

const byAudit = (state) => components.filter((c) => c.accessibility.audit === state);
const audited = byAudit("audited");
const partial = byAudit("partial");
const exception = byAudit("exception");
const notAudited = byAudit("not-audited");

console.log("\nQeetrix Accessibility Coverage\n");
console.log("Components:");
console.log(`  ${String(components.length).padStart(4)} total`);
console.log(`  ${String(audited.length + partial.length + exception.length).padStart(4)} audited`);
console.log(`  ${String(audited.length).padStart(4)} passing`);
console.log(`  ${String(partial.length).padStart(4)} partial`);
console.log(`  ${String(exception.length).padStart(4)} exceptions`);
console.log(`  ${String(notAudited.length).padStart(4)} not audited`);

console.log("\nBy dimension:");
const width = Math.max(...DIMENSIONS.map((d) => d.length));
for (const dimension of DIMENSIONS) {
  const tally = (state) =>
    components.filter((c) => c.accessibility.dimensions[dimension] === state).length;
  console.log(
    `  ${dimension.padEnd(width)}  ${String(tally("pass")).padStart(3)} pass · ` +
      `${String(tally("partial")).padStart(3)} partial · ` +
      `${String(tally("not-applicable")).padStart(3)} n/a · ` +
      `${String(tally("not-audited")).padStart(3)} not audited`,
  );
}

// Every `exception` must say why. An undocumented exception is a defect wearing a label.
let problems = 0;
for (const component of components) {
  for (const [dimension, state] of Object.entries(component.accessibility.dimensions)) {
    if (state !== "exception" && state !== "partial") continue;
    const reason = component.accessibility.exceptions?.[dimension];
    if (!reason) {
      problems += 1;
      console.error(
        `\n✗ ${component.name}: ${dimension} is "${state}" with no reason in ` +
          "accessibility.exceptions — record why, or fix it.",
      );
    }
  }
}

// The ratchet. Auditing more is always allowed; auditing less is not.
const auditedTotal = audited.length + partial.length + exception.length;
const expected = baseline.auditedComponents ?? 0;
if (auditedTotal < expected) {
  problems += 1;
  console.error(
    `\n✗ accessibility audit coverage regressed — ${auditedTotal} components audited, ` +
      `baseline is ${expected}. Restore the audit, or lower the baseline deliberately in ` +
      "scripts/config/contract-coverage-baseline.json.",
  );
} else if (auditedTotal > expected) {
  console.warn(
    `\n⚠  audit coverage improved to ${auditedTotal} (baseline ${expected}) — raise the baseline` +
      " in scripts/config/contract-coverage-baseline.json.",
  );
}

if (VERBOSE && notAudited.length > 0) {
  console.log(`\nNot audited (${notAudited.length}):`);
  console.log(`  ${notAudited.map((c) => c.slug).join(", ")}`);
}

if (problems > 0) process.exit(1);
console.log(
  `\n✓ accessibility audit — ${auditedTotal}/${components.length} components audited, ` +
    "every partial and exception documented.",
);
