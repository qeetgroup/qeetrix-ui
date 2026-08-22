/**
 * a11y-coverage.mjs — accessibility coverage, on four levels.
 *
 * **Level 1 — every component has a test that runs axe.** Not a test *file*: a test that
 * actually calls axe. The check used to be satisfied by a matching filename, which meant every
 * assertion in a suite could be deleted and the gate stayed green.
 *   (a) a suite at src/components/<category>/__tests__/<name>.test.ts(x) containing an axe
 *       assertion, OR
 *   (b) rendered in the global smoke harness src/__tests__/a11y.test.tsx, OR
 *   (c) listed in src/__tests__/a11y-coverage-exemptions.json (the shrinking backlog).
 *
 * **Level 2 — the audit matrix.** An axe pass is necessary and nowhere near sufficient: axe
 * checks part of the semantic layer and nothing at all about keyboard, focus or announcement
 * behaviour. So the manifest carries a per-dimension audit state per component, and this reports
 * it, and requires a reason for every `partial` and `exception`.
 *
 * **Level 3 — evidence.** Every dimension recorded `pass` or `partial` must be traceable to a
 * test that asserts it, found by reading the tests rather than by trusting the record
 * (scripts/lib/a11y-evidence.mjs). Three corpora: the audit suites, which may credit any component
 * they render; each component's own colocated suite, which may credit only that component; and the
 * *conditional* corpora, which count only while their stated precondition holds — the browser
 * suite proves what jsdom cannot show at all, is deliberately outside `bun run verify`, and is
 * accepted here only because a required CI job runs it. This is the level that makes the numbers
 * above mean something: delete the keyboard assertions from Dialog's audit and the gate now fails,
 * naming the claim that lost its proof. Three dimensions are proved once for the library rather
 * than per component — declared, and verified to resolve to something runnable, in
 * scripts/config/a11y-evidence.json.
 *
 * **Level 4 — the snapshot.** The audit matrix is locked per slug and per dimension in
 * scripts/config/a11y-audit-snapshot.json. An aggregate count cannot tell "we audited one more
 * component" from "we stopped auditing Dialog and started auditing Badge"; the snapshot can, and
 * makes both a reviewed edit.
 *
 *   node scripts/check/a11y-coverage.mjs           # validate (CI)
 *   node scripts/check/a11y-coverage.mjs --verbose # list the un-audited components
 *   node scripts/check/a11y-coverage.mjs --init    # (re)seed the axe exemption backlog
 *   node scripts/check/a11y-coverage.mjs --update  # re-record the audit snapshot, deliberately
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditSnapshot,
  collectA11yEvidence,
  diffAuditSnapshot,
  findUnbackedClaims,
  verifyConditionalCorpus,
  verifyGlobalEvidence,
} from "../lib/a11y-evidence.mjs";
import { hasScriptedMotion, stripComments } from "../lib/component-source.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "../..");
const COMPONENTS_DIR = join(ROOT, "src/components");
const GLOBAL_HARNESS = join(ROOT, "src/__tests__/a11y.test.tsx");
const EXEMPTIONS_PATH = join(ROOT, "src/__tests__/a11y-coverage-exemptions.json");
const EVIDENCE_CONFIG = join(ROOT, "scripts/config/a11y-evidence.json");
const SNAPSHOT_PATH = join(ROOT, "scripts/config/a11y-audit-snapshot.json");
const INIT = process.argv.includes("--init");
const UPDATE = process.argv.includes("--update");
const VERBOSE = process.argv.includes("--verbose");

/** Something in this file calls axe — the assertion, not a file with the right name. */
const RUNS_AXE = /\baxe\s*\(|\bexpectNoA11yViolations\s*\(|toHaveNoViolations/;

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

// (a) per-category suites that actually run axe. A slug may have both a .test.ts and a
// .test.tsx suite; they are one body of tests, and one axe assertion anywhere in it counts.
const colocatedSuites = new Map();
for (const c of categories) {
  const dir = join(COMPONENTS_DIR, c, "__tests__");
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).sort()) {
    if (!/\.test\.tsx?$/.test(file)) continue;
    const slug = file.replace(/\.test\.tsx?$/, "");
    const previous = colocatedSuites.get(slug) ?? "";
    colocatedSuites.set(slug, `${previous}\n${readFileSync(join(dir, file), "utf8")}`);
  }
}
const colocated = new Set(
  [...colocatedSuites.entries()]
    .filter(([, source]) => RUNS_AXE.test(source))
    .map(([slug]) => slug),
);
/** Suites that exist but assert nothing about accessibility — reported, never silently counted. */
const silentSuites = [...colocatedSuites.keys()].filter((slug) => !colocated.has(slug)).sort();

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
  `a11y coverage: ${coveredCount}/${total} components (${pct}%) — ${colocated.size} colocated suites run axe + ${globalCovered.size} via global harness; ${exemptSet.size} exempted (backlog).`,
);
for (const slug of silentSuites) {
  if (globalCovered.has(slug) || exemptSet.has(slug)) continue;
  console.warn(
    `⚠  ${slug} has a colocated suite that never calls axe — the file existing is not coverage`,
  );
}

for (const n of staleCovered)
  console.warn(
    `⚠  stale exemption (now covered): remove "${n}" from a11y-coverage-exemptions.json`,
  );
for (const n of staleGone) console.warn(`⚠  stale exemption (no such component): remove "${n}"`);

if (missing.length) {
  console.error(
    `\n✗ ${missing.length} component(s) have no a11y coverage and are not exempted:\n  ${missing.join(", ")}\n` +
      "Add an axe assertion to src/components/<category>/__tests__/<name>.test.tsx, or " +
      "(temporarily) list it in src/__tests__/a11y-coverage-exemptions.json.",
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

// ── Level 3: evidence ─────────────────────────────────────────────────────────────────────
// A `pass` is a claim of conformance. This is where it has to be cashed in: something in the
// accessibility suite must assert that dimension for that component, or the mechanism that
// proves it library-wide must actually reach it.
const evidenceConfig = JSON.parse(readFileSync(EVIDENCE_CONFIG, "utf8"));

const globalProblems = Object.entries(evidenceConfig.global)
  .map(([dimension, record]) => verifyGlobalEvidence({ root: ROOT, dimension, record }))
  .filter((message) => message !== null);
for (const message of globalProblems) {
  problems += 1;
  console.error(`\n✗ ${message}`);
}

// Each component's own colocated suite is evidence for that component and nothing else. The
// audit suites may credit anything they render; a colocated suite is scoped to its slug, so
// `data-table.test.tsx` can never vouch for the Button inside it.
const scoped = [];
for (const category of categories) {
  const dir = join(COMPONENTS_DIR, category, "__tests__");
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).sort()) {
    if (!/\.test\.tsx?$/.test(file)) continue;
    scoped.push({
      file: `src/components/${category}/__tests__/${file}`,
      slug: file.replace(/\.test\.tsx?$/, ""),
    });
  }
}

// Motion the document-wide CSS rule cannot reach, so its component cannot inherit the global
// `reducedMotion` claim.
const scriptedMotion = new Set();
for (const component of components) {
  const path = join(COMPONENTS_DIR, component.category, `${component.slug}.tsx`);
  if (!existsSync(path)) continue;
  if (hasScriptedMotion(stripComments(readFileSync(path, "utf8")))) {
    scriptedMotion.add(component.slug);
  }
}

// A conditional corpus counts only while its own precondition holds. The browser suite is the
// case: it proves things jsdom cannot show, it is not run by `bun run verify`, and it *is* run by
// a required CI job — so the guarantee is real but different, and has to be checked rather than
// assumed. A refusal is printed with its reason; it is never silently skipped.
const conditionalFiles = [];
for (const record of evidenceConfig.conditional ?? []) {
  const outcome = verifyConditionalCorpus({ root: ROOT, record });
  const named = (record.directories ?? []).join(", ");
  if (outcome.accepted) {
    conditionalFiles.push(...outcome.files);
    console.log(
      `\nConditional corpus: ${named} counts as evidence (${outcome.files.length} files) — ` +
        `the \`${record.requires.job}\` job in ${record.requires.workflow} runs ` +
        `\`${record.requires.script}\`. Not run by \`bun run verify\`.`,
    );
  } else {
    console.warn(
      `\n⚠  Conditional corpus refused: ${named} does not count as evidence — ${outcome.reason}.` +
        "\n   Any claim that rested on it will be reported below as unbacked, which is correct.",
    );
  }
}

const evidence = collectA11yEvidence({
  root: ROOT,
  files: [...evidenceConfig.files, ...conditionalFiles],
  scoped,
});
const unbacked = findUnbackedClaims({
  components,
  evidence,
  globalDimensions: evidenceConfig.global,
  scriptedMotion,
});

const backedClaims = components.reduce(
  (n, component) =>
    n +
    Object.values(component.accessibility.dimensions).filter(
      (state) => state === "pass" || state === "partial",
    ).length,
  0,
);
console.log(
  `\nEvidence: ${backedClaims - unbacked.length}/${backedClaims} pass/partial claims are ` +
    `backed by a named test (${evidence.size} components have asserted evidence; ` +
    `${Object.keys(evidenceConfig.global).length} dimensions proved library-wide, ` +
    `${scriptedMotion.size} components excluded from the reduced-motion one for driving motion ` +
    "from JavaScript).",
);

if (unbacked.length > 0) {
  problems += unbacked.length;
  const byComponent = new Map();
  for (const claim of unbacked) {
    byComponent.set(claim.slug, [...(byComponent.get(claim.slug) ?? []), claim]);
  }
  console.error(
    `\n✗ ${unbacked.length} accessibility claim(s) across ${byComponent.size} component(s) have ` +
      "no test behind them:\n",
  );
  for (const [slug, claims] of [...byComponent.entries()].sort()) {
    console.error(`  ${slug}: ${claims.map((c) => `${c.dimension}="${c.state}"`).join(", ")}`);
  }
  console.error(
    "\n  Either add an assertion for the dimension to src/__tests__/accessibility/, or record " +
      '\n  the dimension as "not-audited" in src/manifests/component-registry.ts and regenerate' +
      "\n  the manifest. A claim nothing tests is the defect this level exists to find." +
      "\n  What counts as an assertion for each dimension: scripts/lib/a11y-evidence.mjs.",
  );
}

// ── Level 4: the per-slug/per-dimension snapshot ──────────────────────────────────────────
const snapshot = auditSnapshot(components);

if (UPDATE) {
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`\n✔ re-recorded the audit snapshot (${Object.keys(snapshot).length} components)`);
  process.exit(problems > 0 ? 1 : 0);
}

if (!existsSync(SNAPSHOT_PATH)) {
  problems += 1;
  console.error(
    `\n✗ ${SNAPSHOT_PATH} is missing — run \`node scripts/check/a11y-coverage.mjs --update\` ` +
      "to record the audit matrix.",
  );
} else {
  const differences = diffAuditSnapshot(snapshot, JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8")));
  if (differences.length > 0) {
    problems += differences.length;
    console.error("\n✗ the audit matrix moved without the snapshot being updated:\n");
    for (const difference of differences) {
      console.error(
        difference.dimension === null
          ? `  ${difference.slug}: ${difference.from ?? "(absent)"} → ${difference.to ?? "(absent)"}`
          : `  ${difference.slug}.${difference.dimension}: ${difference.from} → ${difference.to}`,
      );
    }
    console.error(
      "\n  Improving the audit is always welcome — record it with " +
        "`node scripts/check/a11y-coverage.mjs --update`\n  so the change is a reviewed line in " +
        "the diff rather than a number that drifted.",
    );
  }
}

if (problems > 0) process.exit(1);
console.log(
  `\n✓ accessibility audit — ${auditedTotal}/${components.length} components audited, ` +
    "every partial and exception documented, every claim backed by a test, matrix matches the snapshot.",
);
