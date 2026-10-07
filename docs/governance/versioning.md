# Versioning policy

`@qeetrix/ui` follows semantic versioning. The interesting question is never "what does semver
mean" — it is "what counts as a breaking change for a *design system*", where the contract
includes behaviour and accessibility, not only types.

Every PR's version bump is visible in its diff: `version.yml` raises the patch, and you raise a
minor or major by hand ([release.md](./release.md)). Every change that touches the published
surface also needs a [CHANGELOG.md](../../CHANGELOG.md) entry.

---

## The quick table

| Change | Level |
|:--|:--|
| New component | minor |
| New optional prop | minor |
| New variant, size or slot | minor |
| New token | minor |
| Promoting a component's status (`beta` → `stable`) | minor |
| Marking a component deprecated | minor |
| Bug fix with no API change | patch |
| Internal rewrite, same API and behaviour | patch |
| Dependency bump with no surface change | patch |
| Removing a public component | **major** |
| Removing or renaming a public prop | **major** |
| Making an optional prop required | **major** |
| Changing what a callback receives | **major** |
| Changing the default value of a prop | **major** |
| Removing a variant or size | **major** |
| Breaking a documented accessibility contract | **major** |
| Changing a token's *meaning* (not its value) | **major** |

---

## Why some of those are majors

### Changing what a callback receives

`onValueChange(value)` → `onValueChange(event)` compiles for anyone using `(v) => setV(v)` and
then silently sets state to an event object. A change that type-checks at the call site and
breaks at runtime is the worst kind, and it is a major.

The same applies to *when* a callback fires. Moving `onValueChange` from commit-time to
keystroke-time changes every consumer's network traffic. Semantics are API.

### Changing a default

A default is what most consumers actually get. Changing `size="default"` to `size="sm"` changes
every unstyled usage in every product. If a default is wrong, add the correct value as an option
in a minor, and change the default in the next major.

### Breaking accessibility behaviour

A component that declares an APG pattern in
[`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts) has made a
promise. Losing keyboard navigation, dropping an ARIA relationship, or breaking focus management
is a breaking change even though nothing in the type signature moved — a consumer's product
becomes non-compliant, which is exactly the kind of breakage semver exists to signal.

`accessibility.required: true` in the manifest is how a component says "this applies to me".

### Changing what a token means

Changing `--qx-color-success` from green to a different green is a **patch** — the token still
means "success". Repurposing `--qx-space-4` from `1rem` to `1.5rem` so the whole scale shifts is
a **major**: every consumer's layout moves, and the name no longer means what it did.

---

## Keyboard behaviour: evaluate carefully

Keyboard changes do not have one answer. Ask what a consumer's user has learned:

| Change | Level |
|:--|:--|
| **Adding** a shortcut where none existed (Home/End in a listbox) | minor |
| **Fixing** behaviour to match the APG pattern the component claims | patch or minor — it was a bug |
| **Removing** a working shortcut | major |
| **Rebinding** an existing shortcut to a different action | major |
| Changing a shortcut that was **opt-in and off by default** | minor |

The last row is why `ThemeProvider`'s `Ctrl/Meta+Shift+D` shortcut is disabled unless
`enableKeyboardShortcut` is passed: an opt-in shortcut can evolve, a default one cannot.

---

## Visual changes are not automatically major

A design system that treated every visual change as breaking could never improve. Restyling is
**patch or minor**, in the normal case:

- refining a shadow, a radius, a hover treatment → patch
- adjusting spacing within a component → patch
- a new variant that nobody is using yet → minor

It becomes breaking when the *contract* changes, not the pixels:

- a documented dimension changes (a control's height, which consumers align other things to)
- a WCAG-AA contrast pair regresses — held by `token-governance.test.ts` (`bun run test`), in both
  themes
- a `data-slot` attribute is renamed or removed. `data-slot` is a public styling and testing
  hook; treat it like a prop name.
- a component changes its rendered element (`<div>` → `<span>`), which can break a consumer's
  layout or selectors

---

## Status changes the bar, not the rules

The table above describes a `stable` component. For the others (see
[component-status.md](./component-status.md)):

- `experimental` — a breaking change is a **minor**, no deprecation cycle required
- `beta` — a breaking change is a **minor**, but needs a changelog entry that explains the migration
- `stable` — as above: breaking changes are majors and follow
  [the deprecation lifecycle](./deprecations.md)

This is the entire practical purpose of the status field. Publishing a component as
`experimental` buys the freedom to get it wrong once.

---

## The mechanics

A public API change is not just a version number:

1. **Make the change.**
2. **Read the surface diff.** Every added or removed symbol is a line in a family `index.ts`,
   `src/index.ts` or the `exports` map. The export and signature locks that used to make this
   mechanical (`public-api.json`, `public-props.json`) were removed in 01dce7a, so check by hand
   what they caught: a prop that becomes required, a union that narrows and a props type that
   stops extending its DOM attributes are all breaking, and a list of names cannot show them.
3. **Update the registry** if a status, accessibility contract or deprecation changed, and
   regenerate the manifest (`bun run build:manifest`).
4. **Set the level and write the changelog.** `version.yml` bumps the patch on your PR; for a
   minor or major, set `version` in `package.json` yourself. Add the matching section to
   [CHANGELOG.md](../../CHANGELOG.md), written for the person doing the upgrade.
5. **`bun run build && bun run typecheck && bun run lint && bun run test`** — exactly what CI
   runs.

Merging the PR to `main` publishes that version, then tags it — after build, typecheck, lint and
test pass in the protected release workflow. See [release.md](./release.md) for the mechanics,
rollback, and the publishing setup.

---

## Pre-1.0 paths stay alive

`@qeetrix/ui/components/ui/<slug>` still resolves, generated by
[`scripts/build/subpath-shims.mjs`](../../scripts/build/subpath-shims.mjs). Legacy specifiers
cost a generated re-export file each; breaking a consumer's build costs a great deal more.

Two path *classes* were accidents of a wildcard export rather than decisions, and were slated for
withdrawal in a major. `@qeetrix/ui/hooks/use-controllable-state` is withdrawn: the subpath is
not exported, and the hook is on the root barrel since 3.0. `@qeetrix/ui/components/<Family>/<slug>`
still resolves through the `components/*` wildcard; use the flat `@qeetrix/ui/components/<slug>`,
which is what the documentation always said. Everything else that a wildcard used to expose —
the four public hooks, the four `lib` helpers and the providers — is an explicit entry in the
export map and keeps working.
Keeping them is the cheap side of that trade.
