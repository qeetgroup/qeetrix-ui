---
"@qeetrix/ui": minor
---

**Design-token, foundation and theming architecture.** The token system now has four explicit
layers with an enforced direction of ownership. No rendered value changed: `tokens.css` — the
only token file components resolve against — is byte-identical to before.

- **Four layers.** `primitive` (owns values) → `semantic` (owns meaning) → `component` (owns the
  per-component mapping) → component styles. `src/tokens/` gained `semantic/` and `component/`
  directories; `zindex`, `state`, `focus` and `density` moved out of `primitive/` (they express
  meaning, not raw values) and the component dimensions moved out too. Token paths, and
  therefore every emitted CSS variable, are unchanged.
- **The bridge references semantic tokens.** Every entry in the shadcn/Base-UI contract
  (`--primary`, `--card`, `--input`, `--ring`, `--sidebar-*`) now resolves through a semantic
  token instead of aliasing a primitive. This is what makes `check:contrast` meaningful: it was
  measuring tokens nothing displayed — the dark primary button scored 8.44 there while rendering
  a different pair entirely.
- **Primitives are no longer published to the runtime stylesheet.** `styles.css` carries the
  semantic and component layers only, so `bg-[var(--qx-color-neutral-500)]` does not resolve.
  "Components must not depend on primitive values" is now a fact rather than a convention. The
  complete export, ramps included, is still `@qeetrix/ui/tokens.css`.
- **Fixed: 10 broken variables in the public style entry.** `styles.css` referenced
  `--qx-shadow-*`, `--qx-easing-*` and `--qx-state-opacity-disabled` while importing a file that
  never declared them, so `shadow-rest`, `shadow-modal`, `opacity-disabled` and the `ease-*`
  utilities silently resolved to nothing for anyone importing only `styles.css`. Cards, dialogs
  and disabled controls now render their intended elevation and opacity.
- **New semantic vocabulary**, all present in both themes: `feedback.*`, `focus.ring`,
  `overlay.scrim`, `selection.background`, `surface.interactive`, `surface.rail`,
  `text.on-subtle`, `text.on-feedback`, `border.{success,warning,info}`, plus `elevation.*`,
  `motion.duration/easing/reduced`, `corner.*` and seven `typography.*` roles. Every value
  aliases something the library already used — no new colours, no new timings.
- **Foundations layer.** `src/foundations/token-values.ts` is now **generated** from the token
  source. It previously claimed to be generated in its own header while being maintained by hand
  — a second source of truth for shadows, z-indexes and component geometry.
  `src/lib/token-values.ts` re-exports it, so `@qeetrix/ui/lib/token-values` and the root barrel
  are unchanged.
- **New gate: `check:tokens`.** Validates the authored graph before the build: layer direction,
  missing references, cycles (with the chain), type compatibility, cross-component coupling,
  theme parity, naming, undocumented literals, and token deprecation records. It also catches
  the failure mode that motivated it — a path used as both a leaf and a group, which Style
  Dictionary resolves by silently dropping one side.
- **`check:token-usage`** gains a raw-length rule on a shrinking-only ratchet
  (`raw-dimension-baseline.json`, 24 pre-existing entries); expressions containing `calc()`,
  `min()` or `var()` are not flagged.
- **`check:contrast`** goes from 9 to 18 blocking pairs per theme — every feedback fill, the
  sidebar rail, muted text and both focus-ring surfaces — plus an advisory tier for the
  deliberately subtle hairlines.
- **Pilot components** — Button, Input, Card, Dialog and Badge read component tokens. Card,
  Dialog and Badge no longer contain a single `dark:` colour variant, and Input lost both of its
  fills to a theme-varying token.
- **Docs.** `docs/standards/`: `tokens.md`, `theming.md`, `density.md`, `motion.md`, `rtl.md`.

No new runtime dependencies.
