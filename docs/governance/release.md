# Release & publication

How `@qeetrix/ui` gets from a merged PR to a registry, what stops it, and what is still an open
decision. Versioning rules (what makes a change major/minor/patch) live in
[versioning.md](./versioning.md); this document is about the *mechanics and the authorisation*.

## The gate

```
bun run check:release   →   bun run verify   →   bun run verify:package   →   changeset publish
```

`bun run release` runs exactly that chain, and so does
[`.github/workflows/release.yml`](../../.github/workflows/release.yml). There is no shorter path:
the `release` script used to be `build && changeset publish`, which meant a laptop with a token
could publish a tarball that no quality gate had ever seen.

| Step | Refuses to release when |
|:--|:--|
| `check:release` | the publication posture is self-contradictory, the lockfile is missing, the toolchain is not pinned, or the publish path is not gated |
| `verify` | types, lint, tests, architecture, the API lock, a11y coverage, tokens or contrast fail |
| `verify:package` | the packed tarball does not resolve every published path, denies every internal one, and compile in real consumers |

`check:release` is reported as its own CI job. Everything it fails on is a decision or a
credential, never a code defect, so it is deliberately not part of `verify`.

## What only a human can do

These four live outside the repository. Until they are done, a release cannot succeed — which is
the intended state, not a bug.

1. **Decide the publication posture** (blocking, see `META-001`). `package.json` currently says
   `"license": "UNLICENSED"` with `"private": false` and `publishConfig.access: "public"`, and
   `.changeset/config.json` says `access: "public"`. That combination cannot be correct. Either:
   - **internal** — set `"private": true`, or set `publishConfig.access` *and*
     `.changeset/config.json` `access` to `"restricted"` and point `publishConfig.registry` at the
     Qeet Group registry; or
   - **public** — obtain the legal approval, replace `UNLICENSED` with the granted SPDX licence id,
     and commit the matching `LICENSE` file.

   `check:release` accepts either and refuses the mixture. Nobody should resolve this by guessing.
2. **Commit the lockfile.** `bun install --lockfile-only --save-text-lockfile`, then commit
   `bun.lock`. CI already runs `bun install --frozen-lockfile`, which has nothing to freeze
   without it.
3. **Create the `npm-publish` environment** in repository settings, with required reviewers and
   the `NPM_TOKEN` secret, and set the `QEETRIX_NPM_REGISTRY` variable if publishing anywhere
   other than `registry.npmjs.org`. The release job declares `environment: npm-publish`, so
   without it the job cannot run at all.
4. **Protect `main`**: no direct pushes, and CI (`verify`, `package`, `changeset`) required. The
   repository cannot enforce its own branch protection, so `check:release` cannot check this one.

Once the package is genuinely public and licensed, also enable provenance — uncomment
`NPM_CONFIG_PROVENANCE` in the release workflow. `check:release` refuses provenance while the
package is not publicly licensed, because npm only attests public packages.

## Reproducibility

- **One pinned toolchain.** `packageManager: "bun@1.3.14"` is the single source of truth;
  `engines.bun` and every workflow's `bun-version` must equal it, and `check:release` compares
  them. A floating `1.3` in CI meant CI could resolve a dependency tree no release ever tested.
- **Generated artifacts are reproducible.** `component-manifest.json` and the brand logo
  components are tracked, so CI regenerates them and fails on any diff
  (`bun run check:generated`, plus `git diff --exit-code` after `bun run build`). The manifest
  carries no wall-clock stamp: `generated` is the date the catalog last *changed*, and
  `QEETRIX_MANIFEST_DATE` pins it for hermetic builds. Story coverage comes from the sibling
  `qeetrix-story` checkout when present and is carried forward from the tracked manifest when not,
  so the file no longer depends on which repositories a machine happens to have.

## What a release still does not prove

- **Server components.** The Next.js RSC consumer pass needs `qeetrix-docs` installed next to
  this repo. CI and the release workflow set `QEETRIX_SKIP_NEXT_CONSUMER=1` and print a loud
  warning; enabling it needs a cross-repository checkout and token.
- **The correct changeset *level*.** CI enforces that a changeset exists
  (`changeset status --since=<base>`), and `check:exports` fails on any surface or signature
  change, so a breaking change cannot land silently — but nothing machine-verifies that a
  `major` was not filed as a `minor`. That is a review responsibility.
- **Dependency vulnerability and licence status.** No audit runs in this repository yet; a
  lockfile is the precondition for one.
