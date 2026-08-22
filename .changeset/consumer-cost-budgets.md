---
"@qeetrix/ui": patch
---

**Seven heavy libraries are runtime dependencies of one package, and nobody had a number for what
that costs.** Whether the root barrel drags Recharts, TipTap, ProseMirror, TanStack, Embla,
react-day-picker and qrcode into a consumer's bundle was an argument about ESM semantics rather
than a measurement. It is measured now, and the measurement is gated: `bun run check:bundle`,
budgets in `scripts/config/bundle-baseline.json`, documented in
`docs/governance/dependency-budgets.md`.

- **Tree-shaking works, and that is now a test.** Importing `Button` through the root barrel costs about
  **100 bytes gzip** more than importing it deeply: 609.3 KiB collapses to 15.1 KiB, and none of the
  seven heavy packages survive. `BUNDLE-001`'s "tree-shaking quality is unknown rather than proven
  bad" resolves to proven good, so there is no case for splitting entry points on bundle grounds.
  The gate asserts both halves — the overhead stays under 256 bytes, and a bundle that renders one
  Button may not contain any of the heavy packages. A module-scope side effect in `src/index.ts`
  now fails CI.
- **Per-feature cost, gzip:** RichTextEditor 155.0 KiB, DataTable 102.0 KiB, Chart 96.8 KiB,
  Calendar 39.0 KiB, Carousel 26.2 KiB, Resizable 22.3 KiB, QRCode 19.7 KiB. Deep imports remain
  supported and remain the right choice for an older bundler; they are no longer *necessary*.
- **Measured from `src/`, not `dist/`** — the same module graph `tsc` emits — so the gate needs no
  build step and cannot silently measure a stale `dist/`. Three seconds, no network, so it joins
  `bun run verify`.
- **Fonts are counted and governed.** 30 files, 2,260.6 KiB. Eleven of them — 598.1 KiB, the five
  `Qeet-*` weights, the five `QeetUIText-*` weights and the `Qeet[wght,GEOM]` variable font — are
  referenced by no `@font-face` and are pure install cost. They are **recorded, not deleted**:
  `./fonts/*` is a published wildcard export, removing a file from it is a consumer-visible change
  nobody can prove is unused from inside this repository, and a browser only downloads what an
  `@font-face` asks for. The gate refuses a *new* unreferenced font and the recorded list can only
  shrink, so the situation cannot get worse quietly. Pruning them stays a decision for a human,
  and the required change is written down.
- **Install cost is stated, not solved.** Tree-shaking removes bytes from a bundle, not from
  `node_modules`: `lucide-react` 45.1 MiB, `date-fns` 26.5 MiB (via react-day-picker), `@base-ui`
  19.2 MiB, `@tiptap` + `prosemirror-*` ~10.5 MiB, `recharts` 9.3 MiB. Deliberately not budgeted —
  package layout on disk varies by registry and platform, so a threshold over it would fail for
  reasons unrelated to this repository. Optional peer dependencies would fix it and would break
  every static import in the components that use them; that remains open.
