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
| [api-guidelines.md](./standards/api-guidelines.md) | Prop names, controlled state, event naming, refs, styling |
| [component-manifest.md](./standards/component-manifest.md) | The generated manifest's schema, and where every field comes from |
| [tokens.md](./standards/tokens.md) | The four token layers, naming, ownership, types, deprecation, raw-value policy |
| [theming.md](./standards/theming.md) | How light/dark resolve, ThemeProvider, re-branding, overrides, forced colors |
| [density.md](./standards/density.md) | The density model and how a component consumes it |
| [motion.md](./standards/motion.md) | The motion vocabulary and reduced-motion handling |
| [rtl.md](./standards/rtl.md) | Logical properties, and why tokens carry no direction |

## Governance

| | |
|:--|:--|
| [component-status.md](./governance/component-status.md) | The maturity model: experimental · beta · stable · deprecated |
| [deprecations.md](./governance/deprecations.md) | The deprecation lifecycle and what a deprecation must carry |
| [versioning.md](./governance/versioning.md) | What counts as patch, minor and major for a design system |

## The short version

- Layers flow one way, dependencies are deny-by-default, and both are enforced —
  `bun run check:architecture`.
- Tokens flow one way too: primitive → semantic → component → component styles. The primitive
  layer is not published to the runtime stylesheet, so a component cannot reach it —
  `bun run check:tokens`.
- Every component has a contract (status, capabilities, states, variants, ARIA pattern, test
  coverage) published in `component-manifest.json` — `bun run check:contract`.
- Nothing becomes public by accident — `bun run check:exports`.
- Unknown is a value, not a guess. `"unknown"` in the manifest is a review backlog item, not a
  "no".
