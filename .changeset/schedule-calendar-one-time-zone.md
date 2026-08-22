---
"@qeetrix/ui": major
---

**Fixed: `ScheduleCalendar` ran one grid on two time-zone models (`I18N-001`).** Day boundaries,
event bucketing, "today" and navigation were computed with the host's `Date` accessors, while
labels and event times were formatted in the `timezone` prop's zone. The tell was internal: a day
cell's **visible number** came from the host zone and its **accessible name** came from the
requested zone, so the same button could read "11" and announce "Saturday, July 10". Anything
downstream — which cell an event sits in, which cell is highlighted as today, what `onRangeSelect`
hands back — was the host's answer wearing the requested zone's label.

- **One zone decides everything now**: bucketing, day boundaries, "today", navigation steps and
  formatting. `timezone` still defaults to the host zone, so a calendar that never passed it
  behaves exactly as before.
- **Days are carried as civil dates** — a year/month/day triple with no instant attached, which is
  what a grid is actually made of — and converted to instants only where instants are unavoidable:
  comparing against `ScheduleEvent.start`/`.end`, and handing a `Date` back to the consumer. The
  civil ↔ instant bridge is built from `Intl.DateTimeFormat.formatToParts`, the only IANA database
  available without a dependency. No new dependency, no Temporal polyfill.
- **DST is handled, not sidestepped.** Day starts resolve through the offset actually in force at
  that instant, so in `America/New_York` the 23-hour local day of 8 March 2026 begins at 05:00Z and
  the next begins at 04:00Z. A day whose local midnight does not exist begins at the instant the
  clock jumps to instead; that limit is documented in the source.
- **`locale` and `weekStartsOn` are now props.** Labels used to inherit whatever locale the render
  happened to be in and the week was hard-coded Sunday-first. Both defaults are the previous
  behaviour: host locale, `weekStartsOn: 0`. `ScheduleWeekday` is exported for the latter.
- **An unrecognised `timezone` falls back to the host zone instead of throwing.** `timezone` is
  usually a tenant setting read from a database, and `Intl` throws a `RangeError` on a name it does
  not know — previously during render.

**Behaviour that is deliberately different.** With `timezone` set, `onDateChange` and
`onRangeSelect` now emit midnight in that zone rather than host midnight, and `onRangeSelect`'s
`end` is the following midnight minus 1ms in that zone. That is the point of the fix, but it is a
different `Date` than before for any consumer that passed `timezone` and persisted these values.
The agenda section ids also changed shape, from `agenda-<ISO instant>` to `agenda-<YYYY-MM-DD>`;
consumer CSS or tests selecting on those ids need updating.

**Not covered.** `ScheduleEvent.allDay` is still bucketed from its `start`/`end` instants like any
other event, so a true floating all-day event has to be supplied as instants in the display zone.
Server rendering still resolves the host zone when `timezone` is omitted, which means a server and
a browser in different zones can disagree — now documented on the prop rather than silent. And
`timezone` remains the only zone contract in the package; the wider injectable locale/zone
contract is `RTL-001`.

18 new tests, 11 of which fail against the previous implementation: the number-versus-name
invariant across three zones, one instant bucketing onto two different days, zone-correct "today"
under a fixed clock, midnight-to-midnight range selection, the DST transition, navigation, the
invalid-zone fallback, and a case with the host zone forced 25 hours away from the requested one.
