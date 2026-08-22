// @vitest-environment node
/**
 * The publication preflight, exercised against fixture repositories.
 *
 * It has to be tested this way round: this repository currently *fails* the preflight on purpose
 * (`license: "UNLICENSED"` with public publication settings is an unresolved decision, META-001),
 * so a test that only ran it here could not tell "correctly refuses to publish" apart from
 * "broken". Each fixture is a minimal repository with one thing wrong, or nothing wrong.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SCRIPT = join(ROOT, "scripts/check/release.mjs");
const roots: string[] = [];

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

type Overrides = {
  pkg?: Record<string, unknown>;
  changeset?: Record<string, unknown>;
  lockfile?: boolean;
  license?: boolean;
  release?: string;
};

/** A repository that passes every rule, so each test can break exactly one thing. */
function fixture({ pkg, changeset, lockfile = true, license, release }: Overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "qeetrix-release-preflight-"));
  roots.push(root);
  mkdirSync(join(root, ".changeset"), { recursive: true });
  mkdirSync(join(root, ".github/workflows"), { recursive: true });

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "@qeetrix/ui",
      version: "1.0.3",
      private: true,
      license: "UNLICENSED",
      description: "fixture",
      packageManager: "bun@1.3.14",
      engines: { node: ">=20", bun: ">=1.3.14" },
      files: ["dist"],
      scripts: {
        release: "bun run check:release && bun run verify && bun run verify:package && publish",
      },
      publishConfig: { access: "restricted", registry: "https://registry.example.com" },
      ...pkg,
    }),
  );
  writeFileSync(
    join(root, ".changeset/config.json"),
    JSON.stringify({ access: "restricted", ...changeset }),
  );
  if (lockfile) writeFileSync(join(root, "bun.lock"), "{}\n");
  if (license) writeFileSync(join(root, "LICENSE"), "MIT\n");
  writeFileSync(
    join(root, ".github/workflows/ci.yml"),
    'jobs:\n  a:\n    steps:\n      - uses: oven-sh/setup-bun@v2\n        with:\n          bun-version: "1.3.14"\n',
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    release ??
      "jobs:\n  release:\n    environment: npm-publish\n    steps:\n" +
        "      - uses: oven-sh/setup-bun@v2\n        with:\n          bun-version: 1.3.14\n" +
        "      - run: bun run check:release\n      - run: bun run verify\n" +
        "      - run: bun run verify:package\n",
  );
  return root;
}

function preflight(root: string) {
  const result = spawnSync(process.execPath, [SCRIPT, root], { encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
}

describe("a coherent posture passes", () => {
  it("accepts a private, restricted package", () => {
    const { status, output } = preflight(fixture());
    expect(output).toContain("release preflight");
    expect(status).toBe(0);
  });

  it("accepts a public package with a real licence and a licence file", () => {
    const { status, output } = preflight(
      fixture({
        pkg: {
          private: false,
          license: "MIT",
          publishConfig: { access: "public" },
          repository: { type: "git", url: "git+https://example.com/x.git" },
          bugs: { url: "https://example.com/issues" },
          homepage: "https://example.com",
        },
        changeset: { access: "public" },
        license: true,
      }),
    );
    expect(output, output).not.toContain("blocker");
    expect(status).toBe(0);
  });
});

describe("the UNLICENSED/public contradiction cannot be published through", () => {
  it("refuses a public publish of an UNLICENSED package", () => {
    const { status, output } = preflight(
      fixture({
        pkg: { private: false, publishConfig: { access: "public" } },
        changeset: { access: "public" },
      }),
    );
    expect(status).toBe(1);
    expect(output).toContain("configured for PUBLIC publication");
    // It must not pick a side for us.
    expect(output).toContain("resolved by a person");
  });

  it("refuses when package.json and Changesets disagree about access", () => {
    const { status, output } = preflight(
      fixture({ pkg: { private: false }, changeset: { access: "public" } }),
    );
    expect(status).toBe(1);
    expect(output).toContain("two halves of one decision");
  });

  it("refuses a real licence with no LICENSE file", () => {
    const { status, output } = preflight(
      fixture({
        pkg: {
          private: false,
          license: "MIT",
          publishConfig: { access: "public" },
          repository: { type: "git", url: "git+https://example.com/x.git" },
          bugs: { url: "https://example.com/issues" },
          homepage: "https://example.com",
        },
        changeset: { access: "public" },
        license: false,
      }),
    );
    expect(status).toBe(1);
    expect(output).toContain("no LICENSE file");
  });

  it("refuses provenance while the package is not publicly licensed", () => {
    const { status, output } = preflight(
      fixture({
        release:
          "jobs:\n  release:\n    environment: npm-publish\n    steps:\n" +
          "      - run: bun run check:release\n      - run: bun run verify\n" +
          "      - run: bun run verify:package\n" +
          '        env:\n          NPM_CONFIG_PROVENANCE: "true"\n',
      }),
    );
    expect(status).toBe(1);
    expect(output).toContain("provenance is enabled");
  });
});

describe("reproducibility and gating", () => {
  it("refuses to release without a committed lockfile", () => {
    const { status, output } = preflight(fixture({ lockfile: false }));
    expect(status).toBe(1);
    expect(output).toContain("no committed lockfile");
  });

  it("refuses a floating bun version in a workflow", () => {
    const root = fixture();
    writeFileSync(
      join(root, ".github/workflows/ci.yml"),
      'jobs:\n  a:\n    steps:\n      - uses: oven-sh/setup-bun@v2\n        with:\n          bun-version: "1.3"\n',
    );
    const { status, output } = preflight(root);
    expect(status).toBe(1);
    expect(output).toContain("installs bun 1.3 but packageManager pins 1.3.14");
  });

  it("refuses a release script that skips the quality gate", () => {
    const { status, output } = preflight(fixture({ pkg: { scripts: { release: "publish" } } }));
    expect(status).toBe(1);
    expect(output).toContain("does not run verify");
  });

  it("refuses a release workflow with no protected environment", () => {
    const { status, output } = preflight(
      fixture({
        release:
          "jobs:\n  release:\n    steps:\n      - run: bun run check:release\n" +
          "      - run: bun run verify\n      - run: bun run verify:package\n",
      }),
    );
    expect(status).toBe(1);
    expect(output).toContain("no deployment environment");
  });
});
