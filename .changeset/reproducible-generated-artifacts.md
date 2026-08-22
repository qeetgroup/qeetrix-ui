---
"@qeetrix/ui": patch
---

**Generated artifacts are reproducible and checkable, and the postbuild CSS rewrite is asserted
(`GEN-001`, `PORT-001`).**

`component-manifest.json` and the brand logo components are tracked files produced by scripts, and
nothing proved the committed bytes were what the scripts produce.

- **The manifest no longer depends on the day or the machine.** `generated` was a wall-clock stamp,
  so regenerating on an unchanged tree produced a different file tomorrow; it is now the date the
  catalog last *changed* (`QEETRIX_MANIFEST_DATE` pins it outright). Story coverage came from the
  sibling `qeetrix-story` checkout and silently flipped `story`/`testing.visual` to `false` for all
  145 components when that repository was absent — it is now carried forward from the committed
  manifest instead, and the index's source is printed. Component order no longer goes through
  locale-sensitive `localeCompare`, and the test-file scan is sorted.
- **`node scripts/build/manifest.mjs --check`** regenerates in memory and names what differs,
  without writing. **`bun run build:logos -- --check`** does the same for the brand components.
  Both are wired into `bun run check:generated`, and CI additionally diffs the tree after a clean
  build.
- **The logo generator now emits lint-clean output.** Its template omitted the wrapped `extends`
  clause and the `biome-ignore` for `dangerouslySetInnerHTML`, so every run had to be hand-patched
  afterwards — which is exactly how the committed components came to credit
  `scripts/generate-logos.mjs`, a file this repository no longer contains. Regeneration is now
  idempotent, and `bun run build:logos` is a real script rather than a comment referring to one.
- **postbuild asserts every rewrite and copy.** The dist stylesheet's `@source` rewrite is an exact
  string replacement: if `src/styles/index.css` were reworded, the replacement would silently
  no-op and the published entry would claim to scan `.tsx` files the tarball does not contain. It
  now fails instead, and `check:package` re-asserts it on the packed bytes.
- **`bun run clean` no longer needs a POSIX shell.** It was `rm -rf`; it is now
  `scripts/build/clean.mjs` using Node's filesystem APIs. macOS and Linux are documented as the
  supported development environments — CI runs Linux only, so Windows is unverified rather than
  claimed.
