---
"@qeetrix/ui": patch
---

**`styles.css` applies about twenty rules to the host document, and nothing said which.** It
restyles `html`, `body`, every heading, every `button`, `input`, `select`, `textarea` and `label`,
puts defaults on `*`, collapses all motion under `prefers-reduced-motion`, remaps the whole bridge
under `forced-colors`, and brings Tailwind Preflight with it. All of that sat inline in a 470-line
stylesheet where it was effectively undiscoverable.

- **The host-global surface is now `src/styles/base.css`**, a named file with a boundary.
  `index.css` imports it, so the published entry does exactly what it did before — verified by
  compiling both the split entry and an inlined copy with the Tailwind compiler: identical output,
  identical length, with the single difference that the 17 `@font-face` declarations emit after the
  forced-colors block instead of before it. `@font-face` has no cascade interaction with anything
  there.
- **The selector set is enumerated** in `docs/standards/theming.md § What styles.css does to your
  document`, split by whether a rule is layered (a host rule of equal specificity beats it) or
  unlayered (it wins, which for forced colors is intended).
- **It is locked by a test.** Adding a host-global rule now means adding it to the reviewed list in
  `src/__tests__/token-governance.test.ts`, and a bare element selector reappearing in `index.css`
  fails too.
- The same doc now explains the three public CSS entries, including that the
  `qeetrix.css` / `tokens.css` names give no hint which is which — a naming mistake kept for
  compatibility, with a one-line rule for choosing.

**What this deliberately does not do:** scope the stylesheet. Making `styles.css` apply only inside
a Qeetrix subtree, or shipping a `core.css` with the globals removed, changes what an existing
import does — a major-version decision and a visual-regression exercise, not a refactor. This is
the non-breaking half: the blast radius has a name, a boundary and a test, so the decision can be
made against a written list instead of a guess. Consumers who cannot accept that list should say
so; the answer is a version bump, not a flag.
