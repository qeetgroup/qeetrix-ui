---
"@qeetrix/ui": major
---

**Migration guide for 2.0.** This release resolves 35 of the 50 findings in the enterprise gap
analysis. Most of it is additive. Six things are not, and this is the complete list — each is
justified in its own changeset; this one exists so you only have to read one file before upgrading.

## 1. Undocumented deep import paths are gone (`API-001`)

**No exported symbol was removed** — the public API was diffed symbol-by-symbol and 672 of 672
survive. What is gone are paths that were never documented and became importable by accident:

```diff
- import { useControllableState } from "@qeetrix/ui/hooks/use-controllable-state";
- import { Button } from "@qeetrix/ui/components/actions/button";
- import * as everything from "@qeetrix/ui/components/index";
+ import { Button } from "@qeetrix/ui";              // or "@qeetrix/ui/components/button"
```

`./hooks/*`, `./lib/*`, the ten nested category directories and `./components/index` now resolve to
nothing, deliberately. Every sibling consumer in the workspace was surveyed first: 389 imports of the
root, 148 of the flat `components/<slug>` façade, and **zero** of any withdrawn path. If you have one
outside the workspace, the symbol still exists — import it from the root or the flat façade.

## 2. `AvailabilityGrid` slots are `role="gridcell"`, not `role="button"` (`A11Y-007`)

The grid was 140+ independent tab stops with no row or column semantics. It is now a real
`role="grid"` with one roving tab stop and a full keyboard model.

```diff
- screen.getByRole("button", { name: "Monday 09:00" })
+ screen.getByRole("gridcell", { name: "Monday 09:00" })
```

Unavailable slots also moved from `disabled` to `aria-disabled`, so arrowing no longer skips a hole.

## 3. `DataTable` columns stop at 960px (`A11Y-008`)

`defaultColumn` now sets `minSize: 40` / `maxSize: 960` instead of TanStack's `20` /
`MAX_SAFE_INTEGER`. Dragging a column wider than 960px used to work and now stops there. This is
required so the new resize separator's `aria-valuemax` is *enforced* rather than merely announced —
a screen reader that reads a maximum should not be lying. Raise it per column:

```diff
- columnHelper.accessor("description", { header: "Description" })
+ columnHelper.accessor("description", { header: "Description", maxSize: 2000 })
```

## 4. `ScheduleCalendar` emits different dates when you pass `timezone` (`I18N-001`)

Previously a day cell took its visible number from the host zone and its accessible name from the
requested zone — so a button could read "11" and announce "Saturday, July 10". Fixing that changes
what the component emits:

- `onDateChange` / `onRangeSelect` now give midnight **in the requested zone**, not host midnight.
- `onRangeSelect`'s `end` is the following midnight minus 1ms in that zone.
- Agenda section ids changed from `agenda-<ISO instant>` to `agenda-<YYYY-MM-DD>`.

If you persisted those values or selected on those ids, they will move. If you never passed
`timezone`, nothing changes.

## 5. Component metadata now reports what can be proven (`A11Y-001`, `GOV-001`)

Nothing about runtime behaviour changed here, but if you read `manifest.json` these numbers moved
sharply **down**, and the old ones were not real:

| | Before | After |
|---|---:|---:|
| Component families with an accessibility audit | 78 | **17** |
| Families labelled `stable` | 144 | **76** |
| Families labelled `beta` | 0 | **68** |
| Families labelled `deprecated` | 1 | 1 |

The old accessibility gate counted components *imported* by the audit suites regardless of what those
suites asserted; 100 of 508 dimension claims had nothing asserting them, across 62 components. Component status was
inherited from a default, so not one of the 145 labels was a decision anyone recorded. A `pass` now
requires a test that asserts that dimension, and `stable` must be earned. **56 of the 68 newly-`beta`
components declare `accessibility.required: true`** — they claim an APG contract that was never
audited. Nothing was un-audited and no component got worse.

## 6. The built-in localization layer is gone

`@qeetrix/ui/i18n` was removed — see `remove-i18n-entry-point`. This predates the remediation work.

## 7. Composite controls take their accessible name from the `Field` label (`API-003`)

DatePicker, ColorPicker, OTPInput, Rating, RichTextEditor and FileUpload now associate with `Field`
the way a native input does. That is the point of the change, and it moves accessible names:

```diff
- screen.getByRole("textbox", { name: "One-time code" })   // the hard-coded fallback
+ screen.getByRole("textbox", { name: "Verification code" }) // your Field's label
```

`OTPInput` previously hard-coded `aria-label="One-time code"`, so a `Field` label could never win.
Any query relying on the old fallback name will need updating. Composites also now serialise into
`FormData` under `name`, which means a form that previously submitted nothing for them now submits a
value.

`ColorPicker`'s hex field gained a native `pattern`, so **a form containing an unparseable hex now
fails `checkValidity()` where it previously submitted.**

## 8. Server-rendered text is locale-stable, not ambient (`SSR-002`)

`TimeSince` and `DatePicker` used ambient locale and time zone during render, so server and browser
disagreed. They now render a fixed `en-US` on the first pass and switch to ambient after mount.

- If you snapshot SSR HTML, **the bytes changed.**
- Pass `locale` (and `timeZone` on `TimeSince`) to make both passes identical.

`useTheme()` now reports `defaultTheme` for one render on the client before storage is consulted —
the price of a first render that matches the server. `DataTable` resets its persisted slots when
`persistKey` changes, and no longer stores a density the user never chose.

## 9. Inline arrow keys mirror in RTL (`RTL-001`)

`Rating` and `OTPInput` respected `ArrowRight` as "forward" regardless of direction, so under
`dir="rtl"` the key pointing at the next star *lowered* the rating. Inline arrow keys now mirror,
per the APG. `ArrowUp`/`ArrowDown` are unchanged — the block axis never mirrors. Only RTL behaviour
changes.

## Not breaking, but worth knowing

- **`DiffViewer`** now uses a bounded Myers diff instead of an O(n·m) matrix. Where an input admits
  several equally minimal alignments, *which* identical line is marked can differ. The edit count
  never changes and both sides always reconstruct exactly.
- **A new `./base.css` export** holds the host-global rules that were inline in `styles.css`. If you
  import `styles.css` you get them exactly as before — verified by compiling both and diffing the
  output. There is still no way to opt out; that needs another major.
- **`CodeBlock`'s confirmation tick** moved one palette step, from a raw colour to a semantic token.
- **`BUNDLE-001` inverted on measurement.** Importing through the root barrel costs about 100 bytes
  gzip more than a deep import, not megabytes, and none of the heavy dependencies survive
  tree-shaking. There is no bundle-size reason to change your import style.
- **New gates you will meet in CI**: bundle budgets, coverage floors, documentation truth, and a
  performance ratchet. Real-browser tests exist but are **not** required — running them locally needs
  a ~200 MB Playwright download.
- **No token values changed.** Four real WCAG 1.4.11 contrast gaps remain, registered with measured
  candidate replacements, because the token involved is a border in 25 components and a fill in 28
  more. That is a design decision, not an oversight.
