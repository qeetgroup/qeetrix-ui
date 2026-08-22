---
"@qeetrix/ui": major
---

**DataTable told assistive technology the wrong thing about its own rows, and named every row
control the same.** Four new optional props, no renames, no removals.

Fixed:

- **A virtualized DataTable claimed to be a table of ~17 rows.** Virtualization keeps a window of
  rows in the DOM, and everything that counts rows counts `<tr>` elements — so a 500-row table
  announced "row 4 of 18", and the two padding rows that hold the scroll height open announced as
  blank rows. The table now publishes `aria-rowcount` and gives every row in the DOM — header rows
  included — an `aria-rowindex` for its position in the *full* set, and the padding rows are
  hidden from the accessibility tree entirely. The native table role is kept rather than promoted
  to `role="grid"`: there is no cell-level arrow-key navigation here, and `grid` would advertise a
  keyboard model the component does not implement. `aria-rowcount`/`aria-rowindex` are emitted
  only when virtualized, because they exist to describe rows that are missing.
- **A virtualized DataTable server-rendered no rows at all.** The row virtualizer has an empty
  range until it can measure a viewport, which it cannot do on the server — so `renderToString`
  produced a header, no rows, and not even the empty state. It now assumes the viewport implied by
  `maxHeight` until it can measure one.
- **The scrollable body could not be scrolled from the keyboard.** Rows outside the window are
  reachable only by scrolling, and the scroll container answered the pointer only. It is now a
  focusable region, named from `caption`/`label` when one is given.
- **Every row's checkbox was called "Select row" and every expander "Expand row".** In an
  assistive-technology control list that is a column of identical entries. New `getRowLabel` names
  each row's controls after the row ("Select Ada Lovelace"). Without it the generic names stay, so
  nothing changes for existing consumers — but pass it if you can. The expander also exposes
  `aria-expanded`, which it never did.
- **"Select all rows on this page" was wrong when there were no pages.** With pagination off the
  control selects everything, and now says so.
- **The column resize handle exposed no value and was a 4px target.** It was a `<button>`; it is
  now a window splitter — an `<hr>` (role `separator`) carrying `aria-valuenow`/`valuemin`/
  `valuemax` and an `aria-valuetext` in pixels, driven by the arrow keys plus Home and End, on a
  12px pointer target with the same 1px visual line as before. To make those bounds mean
  something, columns now default to `minSize: 40` / `maxSize: 960` instead of TanStack's `20` /
  `Number.MAX_SAFE_INTEGER`; both pointer and keyboard resizing clamp to them, and a column can
  still override either in its own `ColumnDef`.
- **Nothing said a DataTable was loading.** New `busy` sets `aria-busy` on the table and announces
  the wait in a live region that is mounted up front, rather than appearing at the same moment as
  its text.
- **A DataTable had no way to be named.** New `caption` renders a visible `<caption>`, which is
  the table's accessible name; `label` names it without showing the name.

Trade-offs and limits:

- **`maxSize: 960` is a behaviour change for column resizing.** Dragging a column wider than
  960px used to be possible and now stops there. Set `maxSize` on the column to raise it.
- **Rows outside the virtual window are still absent from the accessibility tree.** That is
  inherent to virtualization: `aria-rowcount`/`aria-rowindex` make the position and total honest,
  they do not make an unrendered row readable. A screen reader user reaches the rest by scrolling.
  If a table must be fully browsable, do not virtualize it.
- **Server pagination is unchanged.** A page of 10 out of 500 rows still reports 10, which is the
  conventional reading of a paginated table but is not the same claim as `rowCount`.
- **`renderSubComponent` detail panels are still dropped when virtualized** — pre-existing, and
  the expander now at least reports its state honestly.
- **The widened hit target is not covered by a test.** jsdom computes no geometry, so the 12px
  band is asserted nowhere; only the value model and its bounds are.
- **20 new tests** (58 in the file). The virtualization tests drive the virtualizer by reporting a
  fixed `offsetHeight`, so the window is genuinely smaller than the data and genuinely moves when
  the body scrolls — otherwise jsdom's zero-height viewport would make them unfalsifiable.
