---
"@qeetrix/ui": patch
---

TreeView, AvailabilityGrid, Carousel, MasterDetail and Pagination now behave correctly under
`dir="rtl"`.

- **TreeView** mapped `ArrowRight` to expand and `ArrowLeft` to collapse unconditionally. The
  WAI-ARIA tree pattern puts expand/collapse on the *inline* axis, so an Arabic user pressing the
  key that points into a branch was walking out of it to the parent. Both keys now mirror, and
  the chevron mirrors only while closed — open, it points down in both directions, so the RTL flip
  must not compose with the 90° turn and leave it pointing up.
- **AvailabilityGrid** moved `ArrowRight` to the next column. A CSS grid lays its columns along
  the inline axis, so under `dir="rtl"` the first day is on the right and the keys now follow it.
  `Home`/`End` and `PageUp`/`PageDown` are unchanged — they address the first and last column,
  which is the same cell in either direction.
- **Carousel** no longer reads `[dir]` for itself; it consumes the shared contract, so a
  `DirectionProvider` now reaches it during render instead of one commit late, and a nested
  provider can hold an LTR carousel inside an RTL page. `opts.direction` still wins, because that
  is Embla's own option.
- **MasterDetail**'s mobile detail sheet was pinned to `side="right"`, so in RTL it slid in over
  the list it was opened from. It now resolves the inline end.
- **Pagination**'s three chevrons had no `rtl:rotate-180`, so the "Next" arrow pointed back
  toward the first page in RTL. It also takes a `locale` prop and inherits one from
  `DirectionProvider`, so row counts group as `12,34,567` for `en-IN` rather than always following
  the browser.

Also fixed: **DropdownMenu's submenu had no entry animation in either direction.** Its `side`
defaults to the logical `"inline-end"`, so Base UI reports `data-side="inline-end"`, and the
popup's animation was written against the physical `data-[side=right]` — a value that never
appeared. The logical variants are now present, and they are themselves direction-aware.

Nothing here changes a public prop type. The visible change is that RTL layouts stop behaving
like mirrored LTR ones.
