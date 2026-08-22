---
"@qeetrix/ui": patch
---

**`check:contract` validates the manifest against a declared field list, re-derives its testing
claims, and requires an axis to be recorded when the component has one.**

The manifest's shape was declared in TypeScript types that are erased at build time, so nothing
compared the artifact to them — `accessibilityAudit` had been emitted for an entire schema version
without appearing in the `ComponentManifest` type. The field list is now data
(`MANIFEST_DOCUMENT_FIELDS`, `MANIFEST_ENTRY_FIELDS`, `MANIFEST_API_FIELDS` in
`src/manifests/component-manifest.ts`) and checked in both directions, so an undeclared field and
a missing one are both errors.

Also now checked:

- **Every tally, three ways** — each recorded count, no missing vocabulary key, and the totals
  adding up to the component count. Only the keys that happened to be present were checked
  before, so a whole audit state could vanish from the summary and read as zero to every
  consumer. `accessibilityAudit` was not checked at all.
- **Every published path** — `import`, `deepImport` and `groupImport` are derived and compared. A
  wrong deep import is a 404 for a consumer and invisible to a type check.
- **`version` against `package.json`, and `generated` as a bare `YYYY-MM-DD`** — anything with a
  time or an offset leaks the generating machine's clock into a tracked file.
- **`testing.*` re-derived from the test sources** and compared. A derived field is only
  trustworthy if something checks it still matches what it was derived from; otherwise it outlives
  the assertion that produced it, which is how a manifest ends up advertising an interaction test
  nobody wrote.
- **Unrecorded variant axes** (`api.axisSources`). `null` in the manifest was doing double duty:
  "this component has no design axis" and "it has one and nobody wrote it down" looked identical.
  The public props settle it — 21 components declare a `variant`, `size`, `kind`, `severity` or
  `orientation` prop, style themselves without `cva`, and reported `null`. `Avatar` has three
  sizes; the manifest said it had none. Each now records where its values come from
  (`data-attribute`, `forwarded`, `class-map`) or that the prop is not an axis at all
  (`measurement`, `layout`, `not-an-axis` — `FileCard.size` is the file's byte size, rendered as
  text).

`api.axisSources` is declared and enforced from the registry; the one-line generator change that
copies it into the published artifact is tracked with the release tooling, so a consumer reading
`component-manifest.json` still sees `null` for these until it lands.

See `docs/governance/variant-axes.md`.
