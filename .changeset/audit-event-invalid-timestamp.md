---
"@qeetrix/ui": patch
---

**Fixed: one malformed `AuditEvent` timestamp crashed the surrounding subtree (`DATE-001`).**
`timestamp.toISOString()` ran before the validity check, and `toISOString()` throws a `RangeError`
on an invalid `Date`. Audit rows come from logs, exports and other systems, so `new Date("n/a")`
reaches this component in practice — and it took the whole `AuditLog` with it, which is the worst
possible failure mode for a security surface: the page that should show what happened shows
nothing.

- **Validity is established first**; nothing formats the date until it has passed. That covers the
  `Intl.DateTimeFormat.format` call as well, which throws on the same input.
- **An unparseable timestamp renders in a `<span data-slot="audit-event-invalid-timestamp">` with
  no `datetime` attribute.** It used to render inside `<time>` with the raw value as `datetime`,
  which is invalid HTML twice over — a `<time>` element's content or attribute has to be a valid
  date string. The value is shown as given, so a bad field is visible rather than swallowed.
- **A valid timestamp is unchanged.** `Date` inputs are still normalised to ISO 8601; string inputs
  are still passed through verbatim, so a date-only `"2026-08-18"` stays date-only instead of
  acquiring a UTC midnight it never claimed. The element now carries
  `data-slot="audit-event-timestamp"`.

No new props: the fallback text for a `Date` is whatever `String(date)` gives, which the language
specifies as `"Invalid Date"`. A consumer wanting different wording should validate before
rendering.

8 tests, including a sibling event that stays rendered while its neighbour's timestamp is
unparseable.
