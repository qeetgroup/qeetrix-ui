---
"@qeetrix/ui": patch
---

**Every claim about layout, focus and inerting in this package was asserted in jsdom, which does
none of them.** jsdom reports every box as zero-sized, stores `inert` without honouring it, moves
nothing on Tab, and returns nothing for a pseudo-element's computed style. So `inert` exclusion,
focus containment, reflow at 200% zoom, real scroll locking, Embla's visibility window and the
widened resize target were each a comment saying "a browser is needed to verify this" sitting next
to an assertion about an attribute. Nothing in the published output changes here; what changes is
that six of those comments are now tests that can fail.

- **A browser project** — `vitest.browser.config.ts`, Vitest's own browser mode with the
  Playwright provider, Chromium, headless. Six files and fourteen tests in
  `src/__tests__/browser/`, about three seconds. A second instance runs with a Playwright
  context that has `prefers-reduced-motion` and `forced-colors` on, because both are context
  properties that cannot be switched from inside a running page. No new test framework: this repository was already
  on Vitest 4, which declares the browser and coverage providers as optional peers.
- **The entry criterion is that jsdom cannot prove it.** A browser test that re-asserts a
  jsdom-provable fact costs a browser launch and buys no evidence. What is proven now: background
  controls behind a modal Tour genuinely refuse `focus()` and the page genuinely does not scroll
  under a real wheel gesture (`overflow: hidden` still permits programmatic scrolling, so
  `window.scrollTo` was never a proof of the lock); a tall Dialog and Sheet stay inside a 640×512
  viewport — 1280×1024 at 200% zoom — scroll their own content and reach their last control with
  no horizontal page overflow; `FocusTrap` wraps a *native* Tab and Shift+Tab rather than
  `user-event`'s idea of the tab order; with the real Embla and real measurement, content in an
  out-of-view carousel slide cannot be focused at all; the DataTable column resizer is a 12px pointer
  target that `elementFromPoint` lands on while its visible rule stays 1px; and `base.css` really
  collapses a declared 150ms transition under `prefers-reduced-motion` and really remaps the theme
  bridge variables to system colours under `forced-colors`.
- **Each one carries its control case.** "Tab wraps to the first element" is not evidence unless a
  second test shows Tab leaving when the trap is inactive; the reflow tests assert a computed
  `overflow-y` first, because the browser project compiles the real stylesheet and without it
  `overflow-y-auto` would be an inert string that made every geometry assertion pass.
- **Coverage floors, measured rather than aspirational.** `bun run test:coverage` enforces lines
  86%, statements 83%, functions 79%, branches 76% — recorded from a real run at 87.16 / 84.79 /
  81.01 / 77.81 and set a point under it. `scripts/check/coverage.mjs` refuses a lowered floor and
  also refuses a floor left more than five points under what the suite now achieves.
- **Trade-off, stated plainly: this costs a Playwright Chromium download**, roughly 200 MB for the
  headless shell. It is therefore *not* in `bun run verify` — a gate that makes a first `verify`
  download 200 MB is a gate people work around — and is a required CI job instead. Locally it is
  `bunx playwright install chromium` once, then `bun run test:browser`. `verify` gains only
  `check:bundle` and `check:coverage`, which are seconds and need no network.
- **What is still not covered:** Chromium only by default (Firefox and WebKit run via
  `QEETRIX_BROWSERS=chromium,firefox,webkit` but nothing requires them, so an engine-specific
  defect is still missed); no coarse-pointer or touch emulation, so touch targets and gestures
  are still only asserted through synthetic events; and no visual regression baselines —
  screenshots taken on macOS do not match a Linux runner's, so a useful VRT suite needs a pinned
  container. The layout assertions catch the same class of regression deterministically; VRT
  remains open.
