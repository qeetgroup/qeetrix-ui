# Accessibility evidence

The manifest records nine accessibility dimensions per component, each `pass`, `partial`,
`exception`, `not-applicable` or `not-audited`. This document is about the rule that makes those
records worth reading: **a `pass` has to be derivable from a test that asserts it.**

Enforced by `bun run check:a11y`. The analysis lives in
[`scripts/lib/a11y-evidence.mjs`](../../scripts/lib/a11y-evidence.mjs), the global-evidence
declarations in [`scripts/config/a11y-evidence.json`](../../scripts/config/a11y-evidence.json),
and the analyser's own tests in
[`src/__tests__/accessibility/evidence.test.ts`](../../src/__tests__/accessibility/evidence.test.ts).

---

## What was wrong

The gate measured presence.

- **Level 1** was satisfied by a *file*: `src/components/actions/__tests__/button.test.tsx`
  existing counted as accessibility coverage. Delete every assertion inside it and the gate stayed
  green.
- **Level 2** was satisfied by a *record*: a dimension said `pass` because somebody had written
  `pass` in the registry. Nothing connected that word to a test, so a record could outlive — or
  precede — the assertion that was supposed to prove it. 78 components were "audited"; the
  audited set turned out to be exactly the set of components *imported* by the accessibility
  suite, whatever the suite did with them.
- The ratchet was an **aggregate**: "78 components audited, may not go below 78". That cannot
  distinguish "we audited one more" from "we stopped auditing Dialog and started auditing Badge".

A green gate that measures file presence is worse than no gate, because it is trusted.

---

## What replaced it

### 1. Coverage means an axe assertion, not a filename

Level 1 now reads the colocated suite and requires it to actually call axe
(`expectNoA11yViolations`, `axe(`, `toHaveNoViolations`). A suite that exists but never runs axe
is reported by name and does not count.

### 2. Evidence is computed from the tests, not declared next to them

Evidence is read from two corpora, and the difference between them is *scope*, not location:

- the audit suites in `src/__tests__/accessibility/`, which may credit any component they render;
- each component's own colocated `__tests__/<slug>.test.tsx`, which may credit **only that
  component**.

Restricting evidence to one directory would have been the same location-coupling this finding is
about. A colocated test that asserts `aria-expanded` on its own component proves exactly as much
as the identical assertion written in the audit suite; what it may not do is credit anything else,
so `data-table.test.tsx` can never vouch for the Button inside it.

For every `it`/`test` in either corpus, the analyser answers two questions independently, from
the AST:

- **Which components does this test render?** From the file's *import bindings*, so `Button`
  resolves to `src/components/actions/button.tsx` and to nothing else. Compound parts
  (`AccordionTrigger`, `DialogContent`) resolve through the same binding. Fixtures declared once
  in a `describe` body, and `describe.each` tables declared at file scope, are attributed to the
  tests that use them — but one sibling test's render never leaks into another's evidence.
- **Which dimensions does it assert?** From an assertion vocabulary per dimension.

A `pass` or `partial` with no matching (component, dimension) pair fails the gate, and the failure
names the claim.

Nothing is annotated. There is no tag to keep in sync, because the evidence *is* the test: delete
the assertion and the evidence goes with it.

### 3. axe counts for `semantic`, and for nothing else

This is the discrimination that makes the rest mean something. An axe run cannot see whether
Escape closes a dialog, whether focus comes back to the trigger, or what a screen reader is told.
So `expectNoA11yViolations` earns `semantic`; a component claiming `keyboard: "pass"` needs a test
that presses a key, and one claiming `focus: "pass"` needs a test that asserts where focus is.

| Dimension | What counts |
| --- | --- |
| `semantic` | axe, `getByRole`, a `role`/`aria-*` attribute assertion, an element-level assertion (`querySelector("dl")`), `tagName` |
| `name` | `expectAccessibleName`, `toHaveAccessibleName`, `getByRole(…, { name })`, `getByLabelText`, an `aria-label`/`aria-labelledby`/`for` assertion |
| `keyboard` | `userEvent.keyboard`, the `press…` helpers, `tabThrough`, `userEvent.type`, `fireEvent.keyDown` |
| `focus` | `toHaveFocus`, `expectFocus`, `expectFocusRestored`, `activeElement`, `tabThrough`, an `inert`/`tabindex` assertion |
| `screenReader` | `toHaveAccessibleDescription`, `expectAriaRelationship`, `expectAriaState`, an `aria-*` assertion, a `status`/`alert`/`log` role assertion |
| `rtl` | a `rtl:`/`ltr:` variant or logical utility asserted in a class, a logical CSS property (`paddingInlineStart`), a `dir`/`data-direction` assertion, or an RTL render **plus** an asserted outcome — see below |

Supplying an attribute is not asserting it: rendering `<Button aria-label="Close">` earns nothing
for `name`. Asserting the computed name does.

`rtl` is the one row that is not a flat list, because a component can be direction-correct in two
different ways and neither shape is evidence for the other.

- **By construction** — the mirroring is CSS: `rtl:rotate-180`, `padding-inline-start`,
  `data-[side=inline-end]:slide-in-from-start-2`. jsdom does no layout, so asserting the
  direction-aware token *is* the assertion, and it fails the moment the value goes back to a
  physical one.
- **By behaviour** — the component reads the resolved direction and mirrors a key mapping or a
  physical `side`. That takes the render being in RTL **and** the outcome being asserted. Either
  half alone is worthless: an RTL render with only a `toBeInTheDocument()` is a smoke test in an
  RTL costume, and an outcome assertion with no RTL render is just a test.

An RTL *locale* (`<DirectionProvider locale="ar-EG">`) counts as an RTL render, but only when the
asserted outcome is one direction actually decides — an arrow key or a resolved side. A locale has
more than one job: `ar-EG` also selects Arabic-Indic digits, and a test about digits is not a test
about direction. The locale list is checked against `directionForLocale` in `src/lib/direction.ts`,
so the analyser and the components cannot disagree about which tags are RTL.

The first version of this row was wrong in both directions, and both mistakes are worth recording.
It matched the bare word `DirectionProvider`, so two CurrencyInput tests that use the provider to
pick a *locale* and assert nothing about direction were counted; and it did not know what a `rtl:`
variant was, so Pagination's "mirrors every directional chevron" — three `rtl:rotate-180`
assertions, and the only assertion available — was not. A legitimate claim (`dropdown-menu.rtl`)
was refused on that second count. The rule that came out of it: **an assertion is evidence for a
dimension when it would fail if the component ignored that dimension.**

### 3b. A corpus may be conditional, and then the condition is checked

`src/__tests__/browser/` is the only place `inert` exclusion, sequential focus containment, reflow
at 200% zoom, pointer hit-testing and the two host-global media blocks are actually observed —
jsdom implements none of them. It is also, deliberately, not part of `bun run verify`: it needs a
Playwright Chromium build (~200 MB, an optional peer), and a gate that makes a first-time `verify`
download 200 MB is a gate developers work around.

That was the reason it was left out of the evidence corpus, and it was a good reason: a link into a
directory the gate never runs cites a test that may not pass. But `bun run verify` is not the only
gate. The browser suite is a **required CI job on every push**, which is a real guarantee — a
different one, so it is named rather than assumed:

```json
"conditional": [
  {
    "directories": ["src/__tests__/browser"],
    "requires": {
      "kind": "ci-job",
      "workflow": ".github/workflows/ci.yml",
      "job": "browser",
      "script": "bun run test:browser"
    }
  }
]
```

`check:a11y` verifies the workflow, the job and the script, prints which corpus it accepted and on
what condition, and **refuses the corpus if the condition stops holding** — at which point every
claim that rested on it fails by name. The honest caveat stays: a local `bun run verify` can pass
while citing tests it did not run. What it cannot do is cite tests nothing runs.

### 4. Three dimensions are proved once, for the library

`reducedMotion`, `forcedColors` and `contrast` are properties of the token graph and the base
stylesheet, not of a component, and two of them cannot be observed in jsdom at all. They are
declared in `scripts/config/a11y-evidence.json`, and the gate verifies each declaration resolves
to something runnable — a suite that exists *and* asserts, or a check script that exists. A dead
reference fails.

Each global record carries preconditions, because a mechanism only covers a component the
mechanism reaches. The document-wide `prefers-reduced-motion` rule collapses CSS transitions; it
cannot touch a `requestAnimationFrame` loop, a smooth `scrollIntoView` or a carousel autoplay
plugin. So:

- a component whose `capabilities.reducedMotion` is not `supported` does not inherit the global
  claim; and
- neither does a component that **drives motion from JavaScript** (`excludeScriptedMotion`),
  whatever its capability says — `capabilities.reducedMotion: "supported"` is true both of "the
  CSS rule covers it" and of "it handles the media query itself in JS", and only the first is
  what the global test proves.

Either way, that component needs its own `reducedMotion` test.

### 5. The matrix is snapshotted per slug and per dimension

[`scripts/config/a11y-audit-snapshot.json`](../../scripts/config/a11y-audit-snapshot.json) records
every component's every dimension. Any movement — improvement or regression — fails the gate until
it is re-recorded with:

```
node scripts/check/a11y-coverage.mjs --update
```

That is deliberate friction. It makes an audit change a reviewed line in a diff instead of a
number that drifted, and it catches the swap the aggregate could not see.

---

## What it cost

Re-basing the claims on evidence found **100 of 508** `pass`/`partial` records with nothing
asserting them, across **61 components**. Those records are now `not-audited`, and the headline
number fell from **78 components audited to 17**.

Nothing was un-audited. No test was deleted, no component got less accessible. 78 was the number
the old gate was willing to print. Reading the two numbers side by side is the whole point of the
exercise.

Where the demotions landed, by dimension: `screenReader` 41, `name` 23, `focus` 20, `keyboard` 12,
`semantic` 2, `rtl` 2.

`not-audited` is a backlog entry, not a verdict. Most of these components are probably fine; some
of the records were probably wrong in the other direction too — `name` on a Badge is more likely
`not-applicable` than `pass`, since a Badge has no control to name. Deciding which is an audit, and
an audit is work, and pretending otherwise is what got the number to 78.

---

## Adding evidence for a dimension

1. Render the component — in one of the audit suites listed in
   `scripts/config/a11y-evidence.json`, or in its own colocated `__tests__/<slug>.test.tsx`.
2. Assert the dimension — see the table above for what the analyser recognises. Write the
   assertion you would want a reviewer to read; the vocabulary follows the house helpers rather
   than the reverse.
3. Set the dimension in `src/manifests/component-registry.ts`.
4. `node scripts/build/manifest.mjs`
5. `node scripts/check/a11y-coverage.mjs --update`
6. Raise `auditedComponents` in `scripts/config/contract-coverage-baseline.json` if the roll-up
   moved.

If step 2 is hard, that is information. A dimension that resists assertion is usually a component
that resists use.

---

## Known limits

- **Attribution is per test, and a test can render more than one component.** A Dialog test that
  presses Escape credits `keyboard` to the Button inside it too. That is a real interaction, so
  the credit is defensible, but it is more generous than a hand audit would be.
- **`not-applicable` needs no evidence.** 188 records say a dimension cannot apply. That is a
  claim, and it is currently unchecked — the presentational suite's "contains nothing focusable"
  test is real evidence for `keyboard`/`focus` being inapplicable, but the gate does not require
  it. Tightening this is the obvious next step.
- **The vocabulary is a heuristic over assertion *shapes*.** It cannot tell a good keyboard test
  from a shallow one. It can only tell one from none — which was the gap.
- **The `rtl` conjunction still cannot read intent.** A test that declares `dir="rtl"` and asserts
  an outcome about something entirely unrelated to direction counts. That is a smaller hole than
  the one it replaced (the provider's mere presence), and closing it would mean deciding which
  outcomes are "direction-dependent" for a component the analyser knows nothing about.
- **A conditional corpus is only as good as its condition.** The browser suite's condition is a CI
  job, so a local `bun run verify` can pass while citing tests it did not run. The alternative was
  refusing six claims that are genuinely proved, in real Chromium, on every push.
- **`testing.visual` is still cross-repo.** Story evidence lives in the sibling `qeetrix-story`
  checkout, so it is not re-derived here.
- **Colocated suites are edited far more often than the audit suites**, so widening the corpus to
  include them means routine component work can move the snapshot. That is the correct trade —
  the alternative is refusing to count a real assertion because of where it lives — but expect
  `--update` to be part of normal accessibility work rather than a rare event.
