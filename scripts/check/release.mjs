/**
 * release.mjs — the publication preflight.
 *
 * `changeset publish` will happily push a tarball to a public registry from any laptop. This is
 * the gate that makes that impossible unless the three things a release needs are actually true:
 *
 *   1. **A coherent publication posture.** A package cannot be `UNLICENSED` *and* published with
 *      `access: "public"`. One of those is wrong, and which one is a business decision — so this
 *      script refuses to guess and refuses to release. Either resolution passes; the contradiction
 *      does not.
 *   2. **Reproducible dependency resolution.** A committed lockfile, one exact Bun version pinned
 *      in `packageManager`, and every workflow using that same version.
 *   3. **A gated path to the registry.** The `release` script and the release workflow both run
 *      the full verification chain, and provenance is only claimed when it can be honoured.
 *
 *   node scripts/check/release.mjs
 *
 * What this cannot check, because it lives outside the repository: branch protection on `main`,
 * the registry credential itself, and who is allowed to approve a deployment environment. Those
 * are listed in docs/governance/release.md.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// An explicit root makes the rules testable against fixture repositories instead of only
// against this one — see src/__tests__/release-preflight.test.ts.
const argument = process.argv.slice(2).find((value) => !value.startsWith("-"));
const ROOT = argument ? resolve(argument) : join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");
const readJson = (path) => JSON.parse(read(path));

const pkg = readJson("package.json");
const changesetConfig = readJson(".changeset/config.json");

const failures = [];
const notes = [];
const fail = (headline, remedy) => failures.push({ headline, remedy });

/* ── 1. publication posture ───────────────────────────────────────────────────────────────── */

const publishable = pkg.private !== true;
const packageAccess = pkg.publishConfig?.access ?? "restricted";
const changesetAccess = changesetConfig.access ?? "restricted";
// "UNLICENSED" is the npm spelling for "no usage grant is given"; a licence *file* is what a
// public consumer actually needs.
const unlicensed = !pkg.license || pkg.license === "UNLICENSED";
const hasLicenseFile = readdirSync(ROOT).some((name) => /^LICEN[CS]E(\..+)?$/i.test(name));

if (publishable) {
  if (packageAccess !== changesetAccess) {
    fail(
      `publishConfig.access is "${packageAccess}" but .changeset/config.json access is "${changesetAccess}"`,
      "make both the same — they are two halves of one decision, and Changesets uses its own.",
    );
  }

  if (unlicensed && (packageAccess === "public" || changesetAccess === "public")) {
    fail(
      `license is "${pkg.license}" but the package is configured for PUBLIC publication`,
      [
        "this contradiction has to be resolved by a person, not by this script. Pick one:",
        '  (a) internal — set "private": true, or publishConfig.access + .changeset/config.json',
        '      access to "restricted" and publishConfig.registry to the Qeet Group registry;',
        "  (b) public — obtain the legal approval, replace UNLICENSED with the granted SPDX",
        "      licence id, and commit the matching LICENSE file.",
      ].join("\n"),
    );
  }

  if (!unlicensed && !hasLicenseFile) {
    fail(
      `license is "${pkg.license}" but no LICENSE file exists in the repository`,
      "commit the licence text; npm publishes it with the tarball and consumers audit for it.",
    );
  }

  if (packageAccess === "restricted" && !pkg.publishConfig?.registry) {
    fail(
      'publishConfig.access is "restricted" but no publishConfig.registry is set',
      "point publishConfig.registry at the Qeet Group registry so a restricted publish cannot " +
        "default to registry.npmjs.org.",
    );
  }

  for (const field of ["repository", "bugs", "homepage", "description"]) {
    if (!pkg[field]) {
      fail(`package.json has no ${field}`, `add ${field} — a published package is attributable.`);
    }
  }

  if (!(pkg.files ?? []).includes("dist")) {
    fail("package.json files[] does not include dist", "the compiled output is the package.");
  }
} else {
  notes.push('package.json declares "private": true — publication is disabled.');
  if (changesetAccess === "public") {
    fail(
      'the package is private but .changeset/config.json still declares access "public"',
      'set it to "restricted" so the intent is stated in one voice.',
    );
  }
}

/* ── 2. reproducible resolution ───────────────────────────────────────────────────────────── */

if (!existsSync(join(ROOT, "bun.lock")) && !existsSync(join(ROOT, "bun.lockb"))) {
  fail(
    "no committed lockfile — bun.lock is absent",
    "run `bun install --lockfile-only --save-text-lockfile` and commit bun.lock. Without it " +
      "`bun install --frozen-lockfile` in CI has nothing to freeze, so CI and a laptop can " +
      "resolve different dependency trees and publish different bytes.",
  );
}

const pinned = /^bun@(\d+\.\d+\.\d+)$/.exec(pkg.packageManager ?? "");
if (!pinned) {
  fail(
    `packageManager is ${JSON.stringify(pkg.packageManager)} — not an exact bun version`,
    'pin it as "bun@x.y.z".',
  );
} else {
  const version = pinned[1];
  if (pkg.engines?.bun !== `>=${version}`) {
    fail(
      `engines.bun is ${JSON.stringify(pkg.engines?.bun)} but packageManager pins ${version}`,
      `set engines.bun to ">=${version}" so the declared floor is the version we build with.`,
    );
  }
  const workflowDir = join(ROOT, ".github/workflows");
  const workflows = existsSync(workflowDir)
    ? readdirSync(workflowDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    : [];
  if (workflows.length === 0) {
    fail("no GitHub Actions workflows found", "CI and release must exist in .github/workflows.");
  }
  for (const workflow of workflows) {
    const body = read(`.github/workflows/${workflow}`);
    if (!body.includes("oven-sh/setup-bun")) continue;
    // A workflow may pin inline or through its own `env.BUN_VERSION`; resolve the indirection
    // rather than accepting an unread expression as if it were a version.
    const workflowEnv = /^\s*BUN_VERSION:\s*"?([^"\s#]+)"?/m.exec(body)?.[1];
    for (const [, raw] of body.matchAll(/bun-version:\s*"?([^"\n]+?)"?\s*$/gm)) {
      const declared = raw.includes("env.BUN_VERSION") ? workflowEnv : raw;
      if (declared !== version) {
        fail(
          `${workflow} installs bun ${declared} but packageManager pins ${version}`,
          "a floating minor means CI can resolve dependencies a release never tested.",
        );
      }
    }
  }
}

/* ── 3. a gated path to the registry ──────────────────────────────────────────────────────── */

const releaseScript = pkg.scripts?.release ?? "";
for (const required of ["verify", "verify:package", "check:release"]) {
  if (!releaseScript.includes(`bun run ${required}`)) {
    fail(
      `the release script does not run ${required}`,
      `\`bun run release\` must not be able to publish something \`${required}\` rejects.`,
    );
  }
}

const releaseWorkflow = join(ROOT, ".github/workflows/release.yml");
if (!existsSync(releaseWorkflow)) {
  fail(
    "no .github/workflows/release.yml",
    "publication has to run in one reviewable place, not from a laptop.",
  );
} else {
  const body = read(".github/workflows/release.yml");
  for (const required of ["check:release", "bun run verify", "verify:package"]) {
    if (!body.includes(required)) {
      fail(`release.yml never runs ${required}`, "the publish job must be gated on it.");
    }
  }
  if (!body.includes("environment:")) {
    fail(
      "release.yml declares no deployment environment",
      "an environment is where required reviewers and the registry secret live; without one, " +
        "any workflow run can publish.",
    );
  }
  // Provenance is a cryptographic claim about a public artifact. npm rejects it for a private
  // package, so enabling it while the posture is unresolved would fail at the worst moment.
  const active = body
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
  const claimsProvenance =
    /NPM_CONFIG_PROVENANCE:\s*"?true"?/i.test(active) ||
    /--provenance\b/.test(active) ||
    pkg.publishConfig?.provenance === true;
  if (claimsProvenance && (unlicensed || packageAccess !== "public")) {
    fail(
      "provenance is enabled but the package is not publicly licensed",
      "npm only attests public packages — resolve the licence question first.",
    );
  }
  if (!claimsProvenance) {
    notes.push(
      "provenance is not enabled — it requires a public, licensed package (see META-001).",
    );
  }
}

/* ── report ───────────────────────────────────────────────────────────────────────────────── */

for (const note of notes) console.log(`· ${note}`);

if (failures.length === 0) {
  console.log(
    "✓ release preflight — publication posture, lockfile and pinned toolchain agree, and the " +
      "publish path runs the full gate.",
  );
  process.exit(0);
}

console.error(`\n✗ release preflight: ${failures.length} blocker(s)\n`);
for (const [index, { headline, remedy }] of failures.entries()) {
  console.error(`${index + 1}. ${headline}`);
  for (const line of remedy.split("\n")) console.error(`   ${line}`);
  console.error("");
}
console.error(
  "This is a release gate, not a build gate: everything above is a decision or a credential, " +
    "not a code defect. See docs/governance/release.md.",
);
process.exit(1);
