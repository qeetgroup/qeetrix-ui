---
"@qeetrix/ui": major
---

**Breaking: the export map is now an enumerated allowlist, and two path classes are withdrawn
(`API-001`).**

`./components/*`, `./hooks/*`, `./lib/*`, `./providers/*` and `./blocks/*` were wildcard exports.
A wildcard publishes whatever the build happens to emit into that folder, so paths nobody decided
to support became supported by accident, and moving a file could break a consumer even when the
documented API had not changed.

**Two path classes no longer resolve. Both were undocumented; neither is used by any Qeet Group
consumer (checked across qeetrix-story, qeetrix-docs, qeetrix-cli, qeetrix-mcp, qeetrix-icons).**

| Gone | Use instead |
|:--|:--|
| `@qeetrix/ui/components/<category>/<slug>` — e.g. `.../components/actions/button` | `@qeetrix/ui/components/button` — the flat façade, which is what the docs always described |
| `@qeetrix/ui/components/index` | `@qeetrix/ui` |
| `@qeetrix/ui/hooks/use-controllable-state` | nothing — it is an internal helper for building controlled/uncontrolled triples, not an API |

Everything else a wildcard used to expose is now an **explicit** entry and keeps working:
`./providers/<name>` (3), `./blocks/<name>` (6), `./hooks/use-media-query`, `/use-mobile`,
`/use-motion`, `/use-prefers-reduced-motion`, and `./lib/utils`, `/motion`, `/responsive`,
`/token-values`. The flat `@qeetrix/ui/components/<slug>`, the category group import
`@qeetrix/ui/components/<category>`, and the pre-1.0 `@qeetrix/ui/components/ui/<slug>` are all
unchanged.

The category paths are not merely undeclared now — they are **denied** (`null` targets), so they
fail identically in Node, Bun and TypeScript rather than resolving in an editor and failing at
runtime. `scripts/build/subpath-shims.mjs` generates the flat façade from
`scripts/config/category-map.json` and errors if the compiled output contains a module the
allowlist does not name, which is what makes the remaining `./components/*` pattern equivalent to
a 300-entry enumeration without being one.

`bun run verify:package` proves all 330 published paths resolve in the packed tarball and that 22
internal ones do not, and `src/__tests__/package-contract.test.ts` fails if a wildcard ever comes
back or a new module in `src/hooks`/`src/lib` is left unclassified.

**Trade-off:** this is a major for two paths that were almost certainly unused, which is a real
cost for consumers who pinned to them. The alternative — keeping the wildcards — leaves every
future file in those folders publicly supported the moment it is created, and makes every category
move a potential break. Aliases were kept for everything with a plausible consumer; the two
removals are the ones where an alias would preserve the defect.
