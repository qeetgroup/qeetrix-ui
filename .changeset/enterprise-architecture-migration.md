---
"@qeetrix/ui": major
---

Enterprise architecture migration: component-first organization

## Breaking changes

- `@qeetrix/ui/blocks` and all `@qeetrix/ui/blocks/*` subpath exports removed. The blocks (auth, dashboard-shell, onboarding-wizard, page-state, pricing-table, settings-layout) were application-level compositions that do not belong in a pure component library.
- `@qeetrix/ui/components/<category>` group imports for old categories (actions, inputs, selection, etc.) removed. Use `@qeetrix/ui/components/<Family>` (e.g., `@qeetrix/ui/components/Button`).

## Non-breaking

All individual component APIs, tokens, hooks, providers, and lib utilities remain unchanged. The `@qeetrix/ui/components/<slug>` deep import paths continue to work. The root `@qeetrix/ui` barrel export surface is unchanged (minus blocks).
