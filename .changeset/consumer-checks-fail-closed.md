---
"@qeetrix/ui": patch
---

**Packaging checks fail closed, and the Next.js pass no longer crashes when it runs (`PKG-001`).**

`check:package` advertised Vite and Next.js consumer verification. In practice both were skipped
with a `console.warn` and a zero exit whenever a sibling repository was absent — which is the CI
topology, since CI checks out this repository only. "Verified" could mean "did not run".

- The **Vite** pass is now hermetic: it uses this repository's own `vite` and `@tailwindcss/vite`
  rather than reaching into a sibling's `node_modules`, so it always runs.
- It now **runs Tailwind**. The fixture had no Tailwind plugin, so `@import "tailwindcss"` was
  inlined unprocessed and a stylesheet that produced nothing would have passed. The consumer CSS
  is now asserted to contain the `--qx-*` tokens and a utility that only the packaged components
  use — measured: removing the `@source` line from the published stylesheet takes that output from
  ~176 KB to ~33 KB, so this is the assertion that a consumer receives component styles at all.
- The **Next.js RSC** pass had a `ReferenceError` waiting in it: the branch that links `csstype`
  and `undici-types` referenced an undefined `REPOSITORY_ROOT`, so on any machine that *did* have
  the sibling installed, the pass would crash rather than build. Fixed.
- Skipping is now **explicit**. A missing Next.js install fails the check unless
  `QEETRIX_SKIP_NEXT_CONSUMER=1` is set, in which case it prints a two-line banner saying server
  components are unverified in this run. CI sets it, visibly, with a comment stating what a human
  must configure to turn it on.

Also asserted, in the same pass: `dist/styles/base.css` survives packing (`index.css` imports it,
so a tarball without it silently drops every host-global rule), all 330 published paths resolve,
22 internal paths are blocked in both ESM resolution and TypeScript, and the flat
`dist/components/` façade contains exactly the allowlist and nothing else.
