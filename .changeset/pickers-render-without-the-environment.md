---
"@qeetrix/ui": minor
---

**Fixed: the last two pickers built their trigger text out of the environment (`SSR-002`
residual).** `hydration-determinism.md` closed four components and named these two as still open.
Both are closed now, and one of them was a different and harder defect than the locale case it was
grouped with.

**`DateTimePicker` formatted the trigger in the ambient locale.** `Intl.DateTimeFormat(undefined,
…)` resolves the host's locale, so a server on `en-US` sent `Jan 1, 2026, 8:00 PM` to a browser on
`de-DE` that rendered `01.01.2026, 20:00` for the same `Date` prop. That is visible text, so React
discards the server's subtree and reports a recoverable error. The formatter sat inside a `useMemo`,
which is worth saying because it looks like the fix: memoising an environment read only keeps one
wrong answer per render pass. The first render is now `en-US` and switches to the browser's own
locale after mount, exactly as `DatePicker` and `TimeSince` do; a new optional `locale` prop removes
the switch. Formatters are cached per locale *and* per precision — keyed on the locale alone,
`withSeconds` would have been served the short-time formatter out of the cache and silently dropped
the seconds.

**`TimeRangePicker` read the clock while rendering.** Its default value was
`{ preset: "24h", ...presetRange(864e5) }` built inside a `useState` initializer, so the server and
the browser did not merely format an instant differently — they computed two different instants, and
no amount of matching configuration makes those agree. It produced no visible mismatch, which is why
it survived a hydration audit: a preset's label is the constant string "Last 24 hours" and its
instants are never rendered. The window is now computed where a clock read belongs, in the event
handler that commits it, and the initial internal value is `null` with the default preset a
constant. `TimeRangePicker` also had the module-scope ambient formatter — one frozen locale for the
whole process — and now takes the same optional `locale` prop for a custom range's dates.

Neither picker takes a `timeZone`, and that is a decision rather than an omission. It is the same
one `DatePicker` records: the dates in play are *local calendar days* — `DateTimePicker`'s footer
reads the local wall clock through `getHours()`, and a custom range's ends arrive from the Calendar
as local midnights — so a display zone that disagreed would state a day or a time the control
beneath it does not. A zone here has to be one decision covering display and value together, and
that is the injectable locale/zone contract, not this fix.

**Behaviour that is deliberately different.** Both triggers render `en-US` text on the server rather
than the rendering host's locale, so a consumer snapshot-testing server HTML will see different
bytes; passing `locale` is the fix and is now the recommended way to render either picker under SSR.
`TimeRangePicker`'s internal default no longer holds a pre-computed window, so a preset's `from`/`to`
are anchored at the click rather than at the mount — a difference only observable if the component
sat unmounted-but-rendered for a long time before the first selection.

**Tests: 11 new, 7 of which fail against the previous implementation** — each fix was reverted to
check. The clock test is the interesting one: because the old defect produced no visible mismatch,
the assertion is the purity itself, instrumented rather than inferred. A `Date` proxy counts
zero-argument constructions (which is what a clock read is) across a server render and a browser
render, and the same instrument is then shown registering the read that happens inside the commit
handler — so the two zero counts are anchored rather than vacuous. The `en-US` first-render tests
are honest about their own limit: they only fail on a host whose ambient locale is not `en-US`.
