# Dependency and bundle budgets

`@qeetrix/ui` is one package with seven heavy feature libraries in its runtime dependencies. This
document is the answer to "what does that cost a consumer", with numbers, and the policy that
keeps the numbers honest.

```bash
bun run check:bundle                      # gate: measure and compare to the baseline
node scripts/check/bundle.mjs --record    # re-measure and re-record, then read the diff
```

Measurements live in
[`scripts/config/bundle-baseline.json`](../../scripts/config/bundle-baseline.json). They are taken
with Vite/Rolldown in production mode, minified, `react` and `react-dom` external, bundling from
`src/` — the same module graph `tsc` emits into `dist/`, so the gate needs no build and cannot
measure a stale one.

---

## What a consumer actually pays

Recorded 2026-08-22. `gzip` is the number that matters to a consumer's users.

| Entry | minified | gzip |
|:--|--:|--:|
| The whole root barrel | 2,359.5 KiB | 609.3 KiB |
| `import { Button } from "@qeetrix/ui"`, one Button rendered | 55.3 KiB | 15.1 KiB |
| The same Button imported deeply | 55.1 KiB | 15.0 KiB |
| RichTextEditor (TipTap + ProseMirror) | 563.1 KiB | 155.0 KiB |
| DataTable (TanStack Table + Virtual) | 384.5 KiB | 102.0 KiB |
| Chart (Recharts, d3, redux-toolkit) | 377.6 KiB | 96.8 KiB |
| Calendar (react-day-picker, date-fns) | 156.2 KiB | 39.0 KiB |
| Carousel (Embla) | 89.5 KiB | 26.2 KiB |
| Resizable (react-resizable-panels) | 81.9 KiB | 22.3 KiB |
| QRCode (qrcode, dijkstrajs) | 71.1 KiB | 19.7 KiB |
| Every block | 98.8 KiB | 26.6 KiB |

### Tree-shaking works, and that is now a test

The two Button rows are the interesting ones. Importing `Button` through the root barrel — which
statically re-exports Recharts, TipTap, ProseMirror, TanStack, Embla, react-day-picker and qrcode —
costs about **100 bytes gzip more** than importing it directly. 609 KiB collapses to 15 KiB.

So `BUNDLE-001`'s "tree-shaking quality is unknown rather than proven bad" resolves to **proven
good**, and there is no case for splitting entry points on bundle grounds. `check:bundle` asserts
both halves of that: the overhead stays under 256 bytes, and none of the seven heavy packages may
appear in a bundle that renders one Button. If someone adds a module-scope side effect to
`src/index.ts`, that is the test that fails.

**Deep imports are still supported** (`@qeetrix/ui/components/data-display/chart`) and remain the
right choice for a consumer whose bundler is older or whose `sideEffects` handling is unknown. They
are no longer *necessary* for tree-shaking with a modern bundler.

---

## Install cost, which is a different problem

Tree-shaking removes bytes from a consumer's bundle. It does not remove them from `node_modules`:
installing `@qeetrix/ui` installs every feature library whether or not the feature is used.

| Package | on disk |
|:--|--:|
| `lucide-react` | 45.1 MiB |
| `date-fns` (via react-day-picker) | 26.5 MiB |
| `@base-ui` | 19.2 MiB |
| `recharts` | 9.3 MiB |
| `@tiptap/*` + `prosemirror-*` | ~10.5 MiB |
| `react-day-picker` | 5.0 MiB |
| `@tanstack/*` | 4.8 MiB |

Measured on macOS with bun 1.3.14, and **not** budgeted: package layout on disk varies with
registry, platform and package manager, so a hard threshold over it would fail for reasons that
have nothing to do with this repository.

Moving the heavy libraries to optional peer dependencies would fix install cost and break every
static `import` in the component that uses them, so it is not a small change. It is the open
question `DEP-001` leaves behind: **install cost is measured and stated, not solved.**

---

## Fonts

The package ships 30 font files, 2,260.6 KiB, published through the `./fonts/*` wildcard export
and copied wholesale into `dist/` by `scripts/build/postbuild.mjs`.

- **18 files, 1,658.2 KiB** are referenced by an `@font-face` in `src/styles/index.css` — Qeet
  Display, Qeet Text, Qeet UI (five weights each) and Fira Code (three).
- **11 files, 598.1 KiB** are referenced by nothing: `Qeet-{Light,Regular,Medium,SemiBold,Bold}`,
  `QeetUIText-{Light,Regular,Medium,SemiBold,Bold}`, and the `Qeet[wght,GEOM]` variable font.

Those 11 are **recorded, not deleted.** `./fonts/*` is a published wildcard export, so removing a
file from it is a consumer-visible change that nobody can verify is unused from inside this
repository — and a font file costs install space, not download bandwidth, since a browser fetches
only what an `@font-face` asks for. The gate is shaped accordingly:

- The total payload is on a shrink-only budget.
- A **new** unreferenced font file fails the gate. The recorded list can only shrink.
- The referenced list is parsed from the stylesheet, not hard-coded, so adding an `@font-face`
  automatically permits its file.

Pruning them is a one-line change to `postbuild.mjs` (copy the parsed referenced set plus `*.txt`
licences instead of the whole tree) and a major-version note. It needs somebody to accept the
`./fonts/*` contract change.

---

## Policy

Budgets are a **ratchet, not a target**. Each is the measurement plus 10%, rounded up to whole KiB —
the same shape as the scale baseline `check:performance` governs.
Budgets may only shrink. `scripts/check/bundle.mjs` fails a commit that:

- exceeds a budget,
- raises a budget relative to git `HEAD`,
- drops an entry, or
- leaves a budget more than 25% above what the entry now measures.

These numbers are deterministic: the only legitimate drift is a dependency release or a real
change to the source. When one moves them, `--record` and let the reviewer see the diff. A budget
that goes up without a sentence explaining why is the thing this gate exists to prevent.
