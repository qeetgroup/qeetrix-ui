# Accessibility evidence

The manifest records nine accessibility dimensions per component, each `pass`, `partial`,
`exception`, `not-applicable` or `not-audited`. This document is about the rule that makes those
records worth reading: **a `pass` has to be backed by a test that asserts it.**

**How it is held today: by review.** An automated gate used to enforce this rule — an analyser
that read every test's assertions and refused any `pass` without one (`bun run check:a11y`,
`scripts/lib/a11y-evidence.mjs`, the audit suites in `src/__tests__/accessibility/`, a browser
suite and a per-slug snapshot). All of it was removed on 2026-08-23 (01dce7a). What runs now:

- every component's own suite, `src/components/<Family>/__tests__/<slug>.test.tsx`, runs axe —
  all 137 do — as part of `bun run test`;
- the dimensions are declared in
  [`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts), and the
  manifest rolls them up (`accessibilityAudit`: 18 audited, 1 partial, 118 not audited);
- the contrast dimension's library-wide proof is `src/__tests__/token-governance.test.ts`, which
  measures every semantic text/surface pair in both themes.

Nothing connects a registry `pass` to an assertion automatically. A reviewer does, using the rules
below.

---

## The rules

### 1. axe counts for `semantic`, and for nothing else

An axe run cannot see whether Escape closes a dialog, whether focus comes back to the trigger, or
what a screen reader is told. So axe earns `semantic`; `keyboard: "pass"` needs a test that presses
a key, and `focus: "pass"` needs a test that asserts where focus is.

| Dimension | What counts |
| --- | --- |
| `semantic` | axe, `getByRole`, a `role`/`aria-*` attribute assertion, an element-level assertion (`querySelector("dl")`), `tagName` |
| `name` | `toHaveAccessibleName`, `getByRole(…, { name })`, `getByLabelText`, an `aria-label`/`aria-labelledby`/`for` assertion |
| `keyboard` | `userEvent.keyboard`, `userEvent.type`, `fireEvent.keyDown` |
| `focus` | `toHaveFocus`, `document.activeElement`, an `inert`/`tabindex` assertion |
| `screenReader` | `toHaveAccessibleDescription`, an `aria-*` state or relationship assertion, a `status`/`alert`/`log` role assertion |
| `rtl` | a `rtl:`/`ltr:` variant or logical utility asserted in a class, a logical CSS property (`paddingInlineStart`), a `dir`/`data-direction` assertion, or an RTL render **plus** an asserted outcome |

Supplying an attribute is not asserting it: rendering `<Button aria-label="Close">` earns nothing
for `name`. Asserting the computed name does.

### 2. A test is evidence only for the component it is about

A colocated suite proves things about its own component. `data-table.test.tsx` asserting a keyboard
interaction says nothing about the Button inside the table.

### 3. `rtl` takes direction *and* an outcome

A component can be direction-correct by construction (the mirroring is CSS — `rtl:rotate-180`,
`padding-inline-start` — so asserting the direction-aware class is the assertion) or by behaviour
(it reads the resolved direction and mirrors a key mapping or a side, so the test renders in RTL
**and** asserts the mirrored outcome). An RTL render with only `toBeInTheDocument()` is a smoke
test, not evidence. An RTL *locale* such as `ar-EG` counts only when the asserted outcome is one
direction decides; a test about Arabic-Indic digits is not a test about direction.

The general form: **an assertion is evidence for a dimension when it would fail if the component
ignored that dimension.**

### 4. `not-audited` is a backlog entry, not a verdict

When the evidence gate first ran, re-basing the claims found 100 of 508 `pass`/`partial` records
with nothing asserting them; they became `not-audited`, and the audited count fell from 78 to 17.
No test was deleted and no component got less accessible — 78 was what the presence-based gate
before it had been willing to print. Keep that in mind when reading the roll-up: a low number of
honest records beats a high number of unproved ones.

---

## Adding evidence for a dimension

1. In the component's own `__tests__/<slug>.test.tsx`, render it and assert the dimension, using
   the table above. Write the assertion you would want a reviewer to read.
2. Set the dimension in `src/manifests/component-registry.ts`.
3. `bun run build:manifest`, and commit the regenerated `component-manifest.json`.
4. In the pull request, point the reviewer at the assertion: with no gate, the link between the
   record and the test is what review checks.

If step 1 is hard, that is information. A dimension that resists assertion is usually a component
that resists use.

---

## Known limits

- **Nothing checks a `pass` mechanically.** A record can be written without its test, or outlive
  it. Review is the only guard until a gate returns.
- **`not-applicable` needs no evidence.** It is a claim like any other, and unchecked.
- **jsdom cannot observe** `inert` exclusion, sequential focus containment, reflow at 200% zoom,
  pointer hit-testing or media queries. The browser suite that covered them was removed with the
  gate, so those behaviours have no automated test today.
- **`testing.visual` is cross-repo.** Story evidence lives in the sibling `qeetrix-story` checkout.
