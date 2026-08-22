---
"@qeetrix/ui": minor
---

**Component architecture and API standardization.** Additive throughout — nine new exported
types, four new variant names, three new props. Nothing renamed, nothing removed.

- **One implementation of controlled state.** `useControllableState` replaces the identical
  hand-rolled logic in Chip, Listbox, SegmentedControl and Spoiler. `value !== undefined` is the
  only rule that decides the mode, so `null`, `""`, `0` and `false` are values rather than
  accidental uncontrolled mode, and in controlled mode the hook never writes internal state.
- **One name per tone.** The library had three names for the destructive tone — `destructive`
  (Button, Badge, Link, DropdownMenu), `danger` (Alert, Banner) and `error` (Callout,
  Notification). `destructive` is now canonical and accepted by all of them; `danger` and `error`
  keep working, declared as `api.variantAliases`.
- **`<Name>Props` for the pilots.** Button, Input, Checkbox, Select (trigger), Tabs,
  DropdownMenu, Card, Dialog and Alert now export their props type, so a consumer can type a
  wrapper without importing from `@base-ui/react`.
- **Spoiler is controllable.** Gains `expanded` and `onExpandedChange` alongside the existing
  `defaultExpanded`.
- **The API snapshot sees props.** `src/__tests__/public-props.json` records the props each
  exported `*Props` type declares — 659 of them. The export list alone cannot see a renamed or
  removed prop, since `ButtonProps` is exported either way. Inherited DOM props are excluded, so
  the snapshot does not churn on `@types/react` bumps.
- **The contract covers the API.** The registry declares controlled-state triples, variant
  aliases and domain axes; `check:contract` rejects a variant named after an interaction state, a
  variant outside the shared vocabulary, a size off the scale, `default` and `md` on the same
  component, and a triple that is not `x` / `default<X>` / `on<X>Change`.
- **Docs.** `docs/standards/component-api.md` (expanded from `api-guidelines.md`) now covers the
  variant/size/state axes, the vocabularies, controlled state, composition, compound naming,
  parts and `data-slot`, polymorphism via `render`, prop order, types, native props and the
  styling contract. `docs/standards/component-checklist.md` is new.
