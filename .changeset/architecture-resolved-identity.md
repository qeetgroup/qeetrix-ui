---
"@qeetrix/ui": patch
---

**`check:architecture` now governs CSS and JSON dependencies, and checks relative imports against
the file they resolve to rather than the shape of the specifier.**

Two ways an illegal dependency could pass the gate:

- **Assets were not in the graph.** The traversal collected `.ts`/`.tsx` and nothing else, so a
  component could `import "@/styles/index.css"` or `import "@/tokens/primitive/color.json"` and
  the checker reported a clean TypeScript tree. `.css` and `.json` files are now nodes with
  layers, governed by `LAYER_ALLOWED_ASSET_DEPENDENCIES` — deny by default, and currently empty.
  It is a separate table from the module allow-list on purpose: `components` may depend on the
  `tokens` layer because it reads generated TypeScript from it, while importing a raw token JSON
  bypasses the CSS bridge and hides the component's colour source from `check:token-usage`.
- **The cross-category rule matched one spelling.** It tested for
  `from "../../components/<category>/`, so `../inputs/input` passed, and so did `../../lib/utils`
  from a component. It now resolves the specifier and compares canonical identity, so every
  relative import that leaves its own directory is the same finding — and the message names where
  it actually landed.

Also fixed while resolving: `resolveSpecifier` did not handle the ESM-style `./thing.js`
specifiers that `src/brand/index.ts` re-exports through, so the **entire brand subtree was absent
from the dependency graph** and no layer rule could see it. It resolves now, and duplicate edges
(a `import type` beside an `export … from` for the same module) are de-duplicated so one
dependency is one finding.

No violations existed in either newly covered class, which is the point of adding them before one
does. 14 new checker tests against synthetic graphs, since the repository is clean and a test
against real code alone would pass whether or not the rules worked.
