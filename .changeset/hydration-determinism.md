---
"@qeetrix/ui": minor
---

**Fixed: server markup depended on the environment that produced it (`SSR-002`).** Four components
rendered attributes or text the browser could not reproduce, each for a different reason, and React
reports the two kinds of mismatch differently — text and structure raise a recoverable error, while
an attribute mismatch is a console warning that says "this won't be patched up" and *keeps the
server's value*. The second kind is silent in production and invisible to `onRecoverableError`,
which is why three of these had survived.

**`Sidebar` drew its skeleton width from `Math.random()`.** Twenty server renders of one
`SidebarMenuSkeleton` produced fourteen different widths; the browser then drew a fifteenth and
React kept the server's, so the bar rendered one width while the component believed another for as
long as it lived. The width now comes from hashing the component's own `useId` — the one
per-instance value React guarantees is identical in both renders. The variety survives, because two
ids hash to unrelated widths; the randomness does not.

**`ThemeProvider` read `localStorage` while initializing state.** The server has no access to it, so
a browser with a stored `dark` produced a hydration render that said `dark` against server markup
that said `system` — a text mismatch for every consumer branching on `theme` or `resolvedTheme`: a
toggle's `aria-pressed`, an icon, an image asset. `resolvedTheme` had the same problem one layer
down, resolving `system` through `matchMedia`, which only the browser has.

Both now report `defaultTheme` on the first render in both environments, and the stored preference
and the OS preference arrive together in the commit after hydration. That is a two-pass render, and
its cost is the flash of the wrong theme — but only in appearance, not in fact: the effect that
writes the class to `<html>` has always run after the first paint, so nothing about *when* the theme
becomes visible has changed. The only cure for that flash is a blocking script in `<head>`, and the
provider is now built to cooperate with one rather than fight it: **it writes no class at all until
it has consulted storage**, so a script's pre-paint answer survives hydration instead of being
replaced by a guess and then corrected. The snippet is in the `ThemeProvider` JSDoc.

**`TimeSince` formatted absolute dates in the ambient locale and zone.** `Intl.DateTimeFormat` with
no explicit locale resolves the host's, so a container on UTC sent `title="Jan 1, 2026, 8:00 PM"` to
a browser in Asia/Kolkata, which rendered the same instant as `Jan 2, 2026, 1:30 AM` — the `title`
differed on **every** `TimeSince`, and the visible text differed for any value near a date boundary
or older than `absoluteAfterDays`. The first render is now formatted in fixed settings (`en-US`,
`UTC`) and switches to the browser's own in the same commit that turns the date into "5 minutes
ago". New optional `locale` and `timeZone` props remove the switch entirely, which is what an
SSR application should pass.

**`DataTable`'s `persistKey` trusted three things it does not own.** None of them were hydration
problems — the load has always run in an effect — but all three were ways for a saved view to break
a working table:

- **The key could change while mounted.** The load ran once per mount, not once per key, so
  switching from one saved view to another kept showing the old one *and* wrote the old one's sort
  over the new key. Loading is keyed now, every slot the key owns is replaced rather than merged,
  and no write happens until the state in hand belongs to the key it would be written under.
- **The write could be refused.** `QuotaExceededError` on a full origin, `SecurityError` where
  storage is disabled, and Safari's private mode historically for the first byte. It threw from
  inside an effect, which unmounts the tree: a table stopped rendering because it could not save a
  column width.
- **The bytes are consumer-writable.** `{"sorting":"name"}` parses cleanly and then threw
  `sorting.find is not a function` from inside TanStack, during render. Every field is now checked
  against the shape it must have, with partial credit — a payload with a valid sort and a corrupt
  sizing map keeps the sort.

Found while testing that: the saved view recorded the **effective** density, so a table that never
touched the toggle wrote down the density it happened to inherit as though the user had chosen it —
and went on restoring `comfortable` after the application switched its ambient density to compact.
Only a local override is persisted now.

**New: `src/runtime/storage.ts`**, an internal failure-safe adapter. Every `localStorage` access in
the package goes through it, including the `window.localStorage` property read itself, which is what
throws when storage is disabled. Failures are returned as `false`/`undefined` rather than raised,
because both callers keep the same value in React state: losing persistence costs a preference, not
a working UI.

**Behaviour that is deliberately different.**

- `TimeSince` server output is now `en-US`/`UTC` rather than the rendering host's settings. A
  consumer snapshot-testing server HTML will see different text; passing `locale` and `timeZone` is
  the fix, and is now the recommended way to render it.
- `useTheme().theme` and `.resolvedTheme` report `defaultTheme` for one render on the client, not
  the stored value. Code that reads them during the first render — rather than after mount — sees
  the default where it used to see the preference.
- `DataTable` resets sort, visibility, sizing, pinning and density when `persistKey` changes,
  instead of carrying them across. Persisted fields of an unrecognised type are dropped rather than
  passed through, and a saved view no longer contains a `density` the user did not choose — an
  existing entry that has one still loads as an override.
- `SidebarMenuSkeleton` widths differ from the ones it drew before. They were random, so no
  particular value can have been depended on, but a pixel-comparing visual test will notice.

**Tests: 44 new, 15 of which fail against the previous implementation** — each fix was reverted to
check, rather than assumed.
`src/__tests__/hydration.test.tsx` now collects console complaints as well as recoverable errors —
without that, the attribute-mismatch class this finding is mostly made of cannot be asserted at all
(and, found while writing it: `mockRestore` clears a spy's recorded calls, so reading them after
restoring reports nothing and every such assertion passes vacuously). `src/__tests__/ssr.test.tsx`
adds a byte-identity test for the skeleton, a four-zone test for `TimeSince` that re-imports the
module per zone, and two static guards for the bug class: no `Math.random` in production source, and
no `localStorage` outside the adapter, both matching code with comments stripped so the package can
document its own hazards.

**Not covered.** `date-picker.tsx`, `date-time-picker.tsx` and `time-range-picker.tsx` still format
or construct dates from ambient settings during render; `DatePicker`'s trigger text has the same
locale defect `TimeSince` had. The wider injectable locale/zone contract is `RTL-001`. Nothing here
addresses `--qx-z-dropdown`, and no accessibility dimension changed.
