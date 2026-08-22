---
"@qeetrix/ui": minor
---

**`check:a11y` now requires a test behind every accessibility claim. The reported audit count
falls from 78 components to 17 — no test was deleted and no component got less accessible.**

The gate measured presence. A test *file* with the right name satisfied coverage, so every
assertion inside it could be deleted and the gate stayed green. A dimension said `pass` because
somebody had written `pass`, with nothing connecting that word to an assertion — the "audited"
set turned out to be exactly the set of components *imported* by the accessibility suite,
whatever the suite did with them. And the ratchet was an aggregate ("78 audited, may not go
below 78"), which cannot tell "we audited one more" from "we stopped auditing Dialog and started
auditing Badge".

What it does now:

- **Coverage means an axe assertion**, not a filename. A colocated suite that never calls axe is
  named and does not count.
- **Evidence is computed from the tests.** For every `it` in the audit suites *and* in each
  component's own colocated suite, the analyser reads which components it renders (from the
  file's import bindings, so `Button` is one specific module) and which dimensions it asserts
  (from an assertion vocabulary). A colocated suite is scoped: it may credit its own component
  and nothing else. A `pass` or `partial` with no matching test fails the gate and is named.
  Nothing is annotated: the evidence *is* the test, so deleting the assertion deletes the claim.
- **axe earns `semantic` and nothing else.** It cannot see whether Escape closes a dialog,
  whether focus comes back, or what a screen reader is told. `keyboard: "pass"` now needs a test
  that presses a key.
- **`reducedMotion`, `forcedColors` and `contrast` are proved once, library-wide**, declared in
  `scripts/config/a11y-evidence.json` and verified to resolve to a suite that exists *and*
  asserts, or a check script that exists. Each carries preconditions, because a mechanism only
  covers a component it reaches — the document-wide reduced-motion rule cannot touch a
  `requestAnimationFrame` loop, so a component that drives motion from JavaScript does not
  inherit the claim and needs its own test.
- **The matrix is snapshotted per slug and per dimension** in
  `scripts/config/a11y-audit-snapshot.json`. Any movement, in either direction, fails until
  re-recorded with `node scripts/check/a11y-coverage.mjs --update`.

**The trade-off, stated plainly.** Re-basing on evidence found 100 of 508 `pass`/`partial`
records with nothing asserting them, across 61 components; they are now `not-audited`, and the
headline number went from 78 to 17. That is a lower number describing the same library. 78 was
what the old gate was willing to print. `not-audited` is a backlog entry, not a verdict — and
some of the demoted records were probably wrong in the other direction too (`name` on a Badge is
more likely `not-applicable` than `pass`), which is exactly the kind of question an audit answers
and a default cannot.

`minor`, not `patch`: `component-manifest.json` is published, and 100 of its dimension values
changed. No component's behaviour, props or markup changed.

See `docs/governance/accessibility-evidence.md`.
