---
"@qeetrix/ui": patch
---

**Scale had no numbers attached to it.** No render budget, no observer budget, no input-size
contract, and no benchmark, for components whose whole purpose is showing a lot of rows. Nothing
in the published output changes here; what changes is that a regression now fails CI instead of
arriving at a consumer.

- **A measured baseline for DataTable, TreeView, OrgChart, JSONTree, Feed, ScheduleCalendar and
  DiffViewer** — 18 fixtures, 66 budgets, each recorded next to the fixture that produced it in
  `src/__tests__/performance/baseline.json` and asserted by
  `src/__tests__/performance/scale.test.tsx`.
- **The metrics are counts, not milliseconds**: elements built, `addEventListener` calls beyond
  the ~140 React delegates to every container, `ResizeObserver` constructions, and — through a
  Proxy over the input — how many times a component reads the data it was given. Counts are
  exact and machine-independent, which turns the growth between two fixture sizes into a
  complexity assertion instead of a timing guess. A wall-clock budget on shared CI is a flake
  generator.
- **These are jsdom figures and the file says so.** jsdom does no layout and no paint, so every
  number is JavaScript work and DOM construction. A component that is cheap here can still be
  slow to paint; nothing here should be read as a browser performance measurement.
- **Budgets are a ratchet, not an aspiration**: each is the measured value plus 10% (exact below
  20, where 10% is noise), and `scripts/check/performance.mjs` fails a commit that raises one,
  drops a case, or parks a budget more than 25% above its measurement. A budget nobody can meet
  gets deleted; a ratchet gets kept.
- **What the measurements found:** DataTable's DOM is genuinely independent of dataset size when
  paginated (82 elements for 200 rows and for 2 000) but it reads every row regardless, and it
  constructs its virtualizer's `ResizeObserver` even with `enableVirtualization` off. TreeView
  and JSONTree keep collapsed subtrees out of the DOM; OrgChart and Feed are eager by design.
  ScheduleCalendar re-scans the whole event list once per visible day — linear in events, with a
  ~90x constant on a month grid. None of those are changed here, only measured: the components
  are other findings' territory, and the point of this pass is that the next change to them has
  a number to beat.
