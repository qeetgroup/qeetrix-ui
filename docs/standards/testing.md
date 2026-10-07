# Testing

Two environments run today, because they can prove different things — and a third, the browser,
is what the claims they cannot prove would need. Putting a test in the wrong one is how a suite
ends up green and wrong.

---

## The environments

| Environment | Config | What it can prove | What it cannot |
|:--|:--|:--|:--|
| **jsdom** (default) | `vitest.config.ts` | Markup, ARIA, state machines, event handlers, controlled/uncontrolled behaviour, axe rule violations | Anything requiring layout, paint, hit-testing, `inert`, or native Tab |
| **node** | `// @vitest-environment node` at the top of a file | Server rendering: that a component renders with no `document`, and that a portal is deferred | Anything interactive |

**jsdom performs no layout.** `getBoundingClientRect()` is all zeros, `ResizeObserver` never
fires, `inert` is stored but not honoured, `Tab` moves nothing, and `getComputedStyle(el, "::after")`
returns nothing. A test that appears to assert any of those in jsdom is asserting the stub.

When a claim cannot be tested in jsdom, the convention is to **say so in a comment next to the
assertion that stands in for it**. A comment on its own is a to-do, not a test.

---

## What has no automated test

A browser project (`vitest.browser.config.ts`, `src/__tests__/browser/`, `bun run test:browser`,
a required CI job) proved the claims jsdom cannot. It was removed on 2026-08-23 (01dce7a), so
these are **untested today**:

- background controls behind a modal Tour refusing focus, and the page not scrolling under it;
- a tall Dialog and Sheet staying inside a 200%-zoom viewport and reaching their last control;
- `FocusTrap` wrapping a **native** Tab and Shift+Tab;
- content in an out-of-view Carousel slide being unfocusable, with real Embla measurement;
- the DataTable column resizer's 12px hit target behind its 1px rule;
- the host-global section of `styles.css` actually collapsing transitions under
  `prefers-reduced-motion` and remapping colours under `forced-colors`.

If a browser project returns, two rules held for it: **include the control case** (Tab wrapping is
not evidence unless another test shows Tab leaving when the trap is off), and **anchor
non-vacuity** (assert one computed style you depend on, so a broken CSS pipeline fails loudly).
Visual regression baselines were never set up: screenshots differ between macOS and a Linux
runner, so they need a pinned container.

---

## Coverage

No coverage floor runs today. The `test:coverage` and `check:coverage` scripts, the floors file
and `scripts/check/coverage.mjs` were removed in 01dce7a.

---

## What a test should assert

The house rule, and the one `TEST-002` exists to enforce: **assert the outcome, not the render.**

- Not "does not throw" — what did it do?
- Not "the handle is in the document" — did dragging it resize anything?
- Not "the class name contains `overflow-y-auto`" — is the content reachable?

Where the outcome genuinely cannot be observed in the environment, assert the mechanism *and*
name the environment's limitation in a comment.
