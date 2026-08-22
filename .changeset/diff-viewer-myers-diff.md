---
"@qeetrix/ui": minor
---

**DiffViewer built a full LCS matrix on the render path.** `(n+1) x (m+1)` numbers allocated
before a single row was emitted: 25 million cells for a 5 000-line pair, 400 million for a
20 000-line one — enough to freeze the tab or run the page out of memory, on the component whose
stated job is config history and file versions.

- **Replaced with Myers' greedy shortest-edit-script search**, over the inputs minus their common
  prefix and suffix. The cost now tracks how *different* two inputs are rather than how long they
  are: a one-line change in a 1 000-line file reads its input 3 005 times, where the matrix cost
  about two million reads (two per cell), and a 5 000-line pair no longer allocates anything
  proportional to `n x m`.
- **New optional `maxEditDistance` (default 1000)** bounds the one case Myers is bad at — two
  inputs with nothing in common, where the edit distance *is* the input. Past the ceiling the
  divergent region is reported as a wholesale replacement: every line removed, then every line
  added. That is a correct diff, just not a minimal one, and it caps worst-case scratch memory at
  roughly 4 MB instead of leaving it unbounded.
- **Behaviour change, stated plainly:** the rendered alignment is identical to the old one for
  every diff whose minimal alignment is unique. The previous implementation is kept verbatim in
  the test file as the reference oracle, and 24 document-shaped diffs are asserted row-for-row
  against it. Where an input admits *several* equally minimal alignments — which takes many
  repeated lines, such as bare closing braces — the two can choose different ones. The number of
  changed rows is the same either way and is always the LCS minimum, which is asserted over 150
  adversarial two-symbol inputs along with an exact reconstruction of both sides.
- **Not fixed:** the output is still not virtualized — about five elements per line, and split
  mode renders both panes — and the diff is still synchronous on the render path rather than in a
  worker. Both ceilings are now measured numbers in `src/__tests__/performance/baseline.json`
  rather than assumptions, and the component's JSDoc says to paginate upstream.
