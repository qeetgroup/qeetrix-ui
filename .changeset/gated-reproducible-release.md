---
"@qeetrix/ui": patch
---

**The release path is gated, pinned, and refuses a contradictory publication posture
(`REL-001`, `META-001`).**

`bun run release` was `build && changeset publish`: any machine with a token could publish a
tarball that no quality gate had seen. There was no release workflow at all, though the README
claimed publication was automatic; no committed lockfile, though CI ran
`bun install --frozen-lockfile`; and CI installed a floating Bun `1.3` while `packageManager`
pinned `1.3.14`.

- **New `bun run check:release`** — the publication preflight. It refuses to release when the
  posture is self-contradictory, when `bun.lock` is missing, when `engines.bun` or a workflow's
  `bun-version` disagrees with `packageManager`, when the `release` script skips `verify` or
  `verify:package`, when the release workflow has no protected environment, or when provenance is
  claimed for a package npm cannot attest.
- **`release` is now** `check:release && verify && verify:package && changeset publish`.
- **New `.github/workflows/release.yml`** — the only intended publication path: the full gate, then
  the Changesets action, in a `npm-publish` deployment environment where required reviewers and the
  registry credential live.
- **CI** pins Bun to the exact `packageManager` version, adds a `changeset status` job so a PR
  cannot change the published surface without a changeset, proves the tracked generated artifacts
  survive a clean rebuild, and reports the release gate as its own job — separately from `verify`,
  because everything it fails on is a decision or a credential rather than a code defect.
- **`repository`, `bugs` and `homepage`** are declared; a published package is attributable.

**`check:release` fails today, deliberately.** `license: "UNLICENSED"` sits next to
`"private": false`, `publishConfig.access: "public"` and Changesets' `access: "public"`. That
combination cannot be correct, and which half is wrong is a business decision — so the preflight
refuses to guess and refuses to publish. Either resolution passes it: make the package private and
restricted with an internal registry, or obtain the licence approval, replace `UNLICENSED` with the
granted SPDX id and commit a `LICENSE`. Until then no release can succeed, which is a considerable
improvement on a release that can.

`docs/governance/release.md` lists the four things a human must still do: the licence decision, the
committed lockfile, the `npm-publish` environment, and branch protection on `main`.
