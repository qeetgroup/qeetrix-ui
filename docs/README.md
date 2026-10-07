# `@qeetrix/ui` documentation

The standards and governance that keep the design system coherent. Component *usage* lives in
the sibling `qeetrix-story` workshop and on docs.qeet.in; this directory is about how the
library itself is built and changed.

## Architecture

| | |
|:--|:--|
| [overview.md](./architecture/overview.md) | What the package is, how it is layered, what is public, how it is validated |
| [component-layers.md](./architecture/component-layers.md) | What each layer is for and what it may import |
| [dependency-rules.md](./architecture/dependency-rules.md) | The full allow-list, the forbidden edges, and the rules about the rules |

## Standards

| | |
|:--|:--|
| [component-api.md](./standards/component-api.md) | Variants, sizes, states, controlled state, composition, parts, refs, types, styling |
| [component-checklist.md](./standards/component-checklist.md) | The order to do things in when adding or standardising a component |
| [component-manifest.md](./standards/component-manifest.md) | The generated manifest's schema, and where every field comes from |
| [tokens.md](./standards/tokens.md) | The four token layers, naming, ownership, types, deprecation, raw-value policy |
| [theming.md](./standards/theming.md) | How light/dark resolve, ThemeProvider, re-branding, overrides, forced colors |
| [density.md](./standards/density.md) | The density model and how a component consumes it |
| [motion.md](./standards/motion.md) | The motion vocabulary and reduced-motion handling |
| [rtl.md](./standards/rtl.md) | Logical properties, and why tokens carry no direction |
| [security.md](./standards/security.md) | Trust boundaries: what the library guarantees, and the upload/HTML sanitisation your server must still do |
| [accessibility.md](./standards/accessibility.md) | The WCAG 2.2 AA baseline, the audit matrix, ARIA and naming policy, forms, overlays, live regions |
| [keyboard-interactions.md](./standards/keyboard-interactions.md) | The keyboard model per pattern |
| [focus-management.md](./standards/focus-management.md) | Focus models, entry, containment, restoration, visibility |
| [accessibility-checklist.md](./standards/accessibility-checklist.md) | The audit checklist |

## Governance

| | |
|:--|:--|
| [component-status.md](./governance/component-status.md) | The maturity model: experimental · beta · stable · deprecated |
| [deprecations.md](./governance/deprecations.md) | The deprecation lifecycle and what a deprecation must carry |
| [versioning.md](./governance/versioning.md) | What counts as patch, minor and major for a design system |

## The short version

- Layers flow one way and dependencies are deny-by-default — declared in
  `src/contracts/layers.ts`, held in review (the architecture checker was removed in 01dce7a).
- Tokens flow one way too: primitive → semantic → component → component styles. The primitive
  layer is not published to the runtime stylesheet, so a component cannot reach it, and the token
  graph's rules run in `bun run test` (`token-governance.test.ts`).
- Every component has a contract (status, capabilities, states, variants, ARIA pattern, test
  coverage) published in `component-manifest.json`. TypeScript checks the registry's
  vocabularies; the rest is held in review.
- Nothing becomes public by accident — every export is an explicit line in a barrel or the
  `exports` map, reviewed in the diff (the export lock went with the checks).
- Unknown is a value, not a guess. `"unknown"` in the manifest is a review backlog item, not a
  "no".
- Accessibility is audited per dimension, and the roll-up is computed — there is no field that
  means "accessible: true". All 137 components pass axe in `bun run test`; 18 are audited — see
  [accessibility-evidence.md](./governance/accessibility-evidence.md).
