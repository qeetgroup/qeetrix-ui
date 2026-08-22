---
"@qeetrix/ui": minor
---

**Three defects found while remediating other findings, and not covered by any of them.** Each was
discovered by an agent working on an adjacent problem, verified, and left unfixed because the file
belonged to someone else. Fixed now.

- **`CurrencyInput` was controlled-only without saying so.** With no `value` prop, the
  reflect-external-value effect compared the parsed text against an `undefined` `value`, found them
  different, and reset the text — so the field cleared itself after every keystroke. The effect is
  now guarded on controlled mode. An uncontrolled `CurrencyInput` works for the first time.

- **`Pagination`'s "Prev" button called `onFirst`** — the same handler as the "First" button beside
  it — while announcing itself as "Previous page". There was no `onPrev` prop at all, so the
  accessible name described behaviour the component could not perform. New **`onPrev`**, falling back
  to `onFirst` when omitted, so cursor-based consumers that relied on the old behaviour are
  unchanged.

- **The `Sidebar` rail handle did not mirror in RTL.** Its class carried
  `ltr:-translate-x-1/2 rtl:-translate-x-1/2` — the same value under both variants, so the `rtl:` one
  was a no-op and the handle sat on the wrong side of the edge. Now `rtl:translate-x-1/2`.

Each fix has a regression test **verified to fail against the previous code**. The sidebar assertion
is on the emitted variants rather than computed geometry, because jsdom performs no layout; the real
offset needs a browser.
