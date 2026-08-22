---
"@qeetrix/ui": minor
---

**Architecture and governance foundation.** No change to the published component API — the same
680 exports across the same three entry points — but the library now describes and enforces its
own structure.

- **Component contract.** `src/contracts/` declares the types and closed vocabularies that
  govern a component: status, capabilities, interaction states, variant surface, ARIA pattern,
  and the architecture layer table. Every vocabulary is one `as const` array with its union type
  derived from it, so the runtime list and the compile-time type cannot disagree — and `tsc` is
  the first gate: an invalid status or ARIA pattern is a compile error.
- **Governance registry.** `src/manifests/component-registry.ts` holds the facts that cannot be
  derived from source — status, ARIA pattern, deprecations, reviewed capability overrides.
  Everything else is observed rather than declared.
- **Manifest schema v2.** `@qeetrix/ui/manifest.json` now carries each component's `status`,
  `capabilities`, `states`, `api` (variants/sizes read from `cva`), `accessibility`, `testing`
  and `deprecation`, alongside `schemaVersion` and per-status tallies. **Every schema-v1 field is
  emitted unchanged**, so existing consumers need no updates. Facts the library cannot yet prove
  are `"unknown"`/`null` rather than `false`.
- **Layer boundaries enforced.** `check:architecture` now resolves the real module graph with
  TypeScript's dependency scanner and holds it to a deny-by-default allow-list —
  `tokens → components`, `components → blocks`, `primitives → blocks` and `runtime → components`
  are impossible, including for the reserved `foundations`/`runtime`/`primitives` layers. The
  rule set is itself checked for cycles and transitive closure. Its `"use client"` rule is now
  parsed rather than string-matched.
- **New gate: `check:contract`.** Validates the generated manifest against the contract and
  cross-checks it against `category-map.json`, with diagnostics that name the component, the
  issue, the expectation and the file.
- **Public API governance.** `check:exports` keeps the snapshot lock and adds three
  intentionality rules: every component module must reach the published surface, a
  `@barrel-exclude` module must not leak its own names, and no two barrel-exported modules may
  export the same name.
- **Docs.** `docs/architecture/` (overview, layers, dependency rules), `docs/standards/`
  (API guidelines, manifest schema), `docs/governance/` (status model, deprecation policy,
  versioning policy).
- **Scripts.** Named `check:*` and `build:*` aliases, so the commands the docs already referenced
  exist.

No new runtime dependencies.
