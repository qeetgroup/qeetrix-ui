# Testing

Three environments, because they can prove different things. Putting a test in the wrong one is
how a suite ends up green and wrong.

---

## The three environments

| Environment | Config | What it can prove | What it cannot |
|:--|:--|:--|:--|
| **jsdom** (default) | `vitest.config.ts` | Markup, ARIA, state machines, event handlers, controlled/uncontrolled behaviour, axe rule violations | Anything requiring layout, paint, hit-testing, `inert`, or native Tab |
| **node** | `// @vitest-environment node` at the top of a file | Server rendering: that a component renders with no `document`, and that a portal is deferred | Anything interactive |
| **browser** | `vitest.browser.config.ts` | Real geometry, real focus navigation, real `inert`, real scrolling, pseudo-element styles, pointer hit-testing | Nothing cheaply — every test costs a browser |

**jsdom performs no layout.** `getBoundingClientRect()` is all zeros, `ResizeObserver` never
fires, `inert` is stored but not honoured, `Tab` moves nothing, and `getComputedStyle(el, "::after")`
returns nothing. A test that appears to assert any of those in jsdom is asserting the stub.

When a claim cannot be tested in jsdom, the convention is to **say so in a comment next to the
assertion that stands in for it** — and then to write the real one in the browser project. A
comment on its own is a to-do, not a test.

---

## The browser project

```bash
bunx playwright install chromium   # once, ~200 MB — see "The cost" below
bun run test:browser
```

`src/__tests__/browser/**/*.test.tsx`. Six files, fourteen tests, about three seconds.

It is deliberately small. A browser test that re-asserts a jsdom-provable fact costs a browser
launch and buys no evidence, so the entry criterion is strict: **the assertion must be impossible
in jsdom.** What is there now, and the claim each one closes:

| File | Proves | Previously |
|:--|:--|:--|
| `modality.test.tsx` | Background controls behind a modal Tour genuinely refuse focus; the page genuinely does not scroll under a real wheel gesture; both are released on close | `inert` attribute present, `body.style.overflow === "hidden"` |
| `reflow.test.tsx` | A tall Dialog and Sheet stay inside a 640×512 viewport (1280×1024 at 200% zoom), scroll their own content, and reach their last control with no horizontal page overflow | The `max-h-*` and `overflow-y-auto` class names were present |
| `focus-containment.test.tsx` | `FocusTrap` wraps a **native** Tab and Shift+Tab, and lets focus out when inactive | `user-event` computed the next element itself, from its own idea of the tab order |
| `carousel-visibility.test.tsx` | With the real Embla and real measurement, content in an out-of-view slide cannot be focused, and operability moves with the window | `embla-carousel-react` was mocked entirely; the assertions were about a fake visibility report |
| `hit-target.test.tsx` | The DataTable column resizer is a 12px target that hit-testing lands on, while its visible rule stays 1px | The value model only; the geometry was unassertable |
| `media/base-layer-media-queries.test.tsx` | the host-global section of `styles.css` really collapses a declared 150ms transition under `prefers-reduced-motion`, and really remaps the theme bridge variables to system colours under `forced-colors` | The rules were asserted to exist in the stylesheet, which is a different claim from applying |

`media/` runs in a **second browser instance** whose Playwright context has `reducedMotion: "reduce"`
and `forcedColors: "active"` set. Both are properties of the browser context, so they cannot be
switched from inside a running page — a second instance is the only way to observe them, and it is
why those two tests live in their own directory.

Two rules for anything added here:

1. **Include the control case.** "Tab wraps to the first element" is not evidence unless a second
   test shows Tab leaving when the trap is off. Otherwise a browser that never moved focus would
   pass.
2. **Anchor non-vacuity.** The browser project compiles the real stylesheet, because without it
   `overflow-y-auto` is an inert string and every reflow assertion passes on anything. Assert one
   computed style you depend on, so a broken CSS pipeline fails loudly instead of silently
   weakening the file.

### The cost

Real-browser testing is not free, and the cost is a decision a human has to accept:

- **A Playwright Chromium build**, roughly 200 MB for the headless shell, per developer machine
  and per CI run (CI caches it per run, not across runs). This is why the browser project is
  **not** in `bun run verify`: a gate that makes a first `verify` download 200 MB is a gate people
  work around. It is a required CI job instead — `browser` in `.github/workflows/ci.yml`.
- **Chromium only, by default.** Firefox and WebKit are two more downloads. Both are supported —
  `QEETRIX_BROWSERS=chromium,firefox,webkit bun run test:browser` — but nothing requires them, so
  a Firefox-only or WebKit-only defect is still not caught here. That is a known, stated gap.
- **No touch or pointer-type emulation.** `TEST-001` names touch; nothing here emulates a coarse
  pointer, so the touch-target and gesture behaviour of Carousel, Slider and Resizable is still
  only asserted through synthetic events in jsdom.
- **No visual regression baselines.** Screenshots taken on macOS do not match screenshots taken on
  a Linux runner — different font rasterisation, different scrollbars — so a VRT suite that is
  useful in CI has to run in a pinned container, and one that is not pinned produces failures
  nobody can reproduce. The layout assertions above catch the same class of regression
  deterministically. VRT remains open.

---

## Coverage

```bash
bun run test:coverage    # enforces the floors
bun run check:coverage   # governs the floors file; no test run
```

Floors live in [`scripts/config/coverage-baseline.json`](../../scripts/config/coverage-baseline.json)
and are **measured, not aspirational**. They were recorded from a real run, one point under it, and
they may only rise — `scripts/check/coverage.mjs` refuses a lowered floor and also refuses a floor
that has been left more than five points under what the suite now achieves.

Excluded from the measurement: tests, barrels, `src/manifests/**`, and generated files
(`token-values.ts`, `brand/logos/**`). A coverage number over generated code measures the
generator; a coverage number over a re-export-only barrel is 100% by construction and dilutes the
ratio until it stops meaning anything.

The floor is enforced in its own CI job rather than in `verify`, because `verify` already runs the
suite once and running 1,700 tests twice in one local command is a worse trade than one more
parallel job.

---

## What a test should assert

The house rule, and the one `TEST-002` exists to enforce: **assert the outcome, not the render.**

- Not "does not throw" — what did it do?
- Not "the handle is in the document" — did dragging it resize anything?
- Not "the class name contains `overflow-y-auto`" — is the content reachable?

Where the outcome genuinely cannot be observed in the environment, assert the mechanism *and*
name the environment's limitation in a comment, then close it in the browser project.
