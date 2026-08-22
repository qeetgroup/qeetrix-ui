---
"@qeetrix/ui": major
---

**Fixed: two dense selection grids did not expose the relationships they draw (`A11Y-007`).**

**`AvailabilityGrid` is now an APG selection grid.** It was a flat field of buttons: a real week of
half-hour slots is well over a hundred controls, and one tab stop each makes the widget something a
keyboard user has to cross rather than use.

- One tab stop for the whole grid. Arrow keys move, <kbd>Home</kbd>/<kbd>End</kbd> go to the row
  ends, <kbd>Ctrl</kbd> with them goes to the grid corners, <kbd>PageUp</kbd>/<kbd>PageDown</kbd> to
  the column ends, <kbd>Space</kbd>/<kbd>Enter</kbd> toggles. The tab stop follows focus from any
  source, so returning to the widget lands where you left it, and it is clamped on read so shrinking
  `days`/`times` cannot strand it on a cell that no longer exists.
- Real `grid` / `row` / `columnheader` / `rowheader` / `gridcell` semantics, with `aria-rowcount`
  and `aria-colcount`. Rows use `display: contents` so one CSS grid still lays out every cell.
  Each slot *also* names both of its axes ("Tue 09:30"): a slot's only visible content is a colour,
  so there is nothing for it to be named from. Selection is `aria-selected` on the cell.
- **Unavailable slots use `aria-disabled`, not `disabled`.** They stay focusable, so arrowing across
  the grid no longer skips silently over a hole the user cannot perceive. They still refuse to
  toggle, from the pointer and from the keyboard.
- New `aria-label` (default `"Availability"`), `aria-labelledby` and `timeColumnHeader` props.

**Migration:** an availability slot is `role="gridcell"`, not `role="button"`. A test or stylesheet
selecting `getByRole("button")` inside this component needs `getByRole("gridcell")`; the accessible
names are unchanged. `disabled` is no longer set on unavailable slots — check `aria-disabled`.

**`NotificationPreferenceMatrix` gained its table relationships.** It had no caption or label, so it
announced as an anonymous table, and the category column was `<td>` — data, not a header — so
table-navigation mode read an unlabelled row. There is now a `<caption>` (visually hidden by default,
so nothing moves; `captionVisible` shows it), `scope="col"` on the channel headers, and
`<th scope="row">` per category. New `caption`, `captionVisible` and `categoryHeader` props. Each
switch still names both axes, which is what ordinary reading mode gets.

31 tests. Chosen over per-cell naming alone because position *is* the meaning here; both are
provided, since headers are only announced in table-navigation mode.
