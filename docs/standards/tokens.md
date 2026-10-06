# Design tokens

Every colour, length, corner, shadow, duration and stacking value in `@qeetrix/ui` comes from a
token. This document is how they are organised, named and changed.

The source is W3C DTCG JSON under [`src/tokens/`](../../src/tokens/), compiled by Style
Dictionary. **Nothing here is hand-written CSS or hand-written TypeScript** — the generated
artifacts are gitignored and rebuilt by `bun run build:tokens`.

---

## The four layers

```text
primitive  ── owns values           raw scales: palette ramps, the space scale, shadow values
    ↓
semantic   ── owns meaning          content/surface/border/action/feedback, focus, motion,
    ↓                               elevation, corner, typography roles, density, stacking
component  ── owns the mapping      per-component decisions (button, input, card, dialog, badge)
    ↓                               plus the shadcn bridge
component styles                    Tailwind utilities, resolved through @theme
```

| Layer | Location | Emits |
|:--|:--|:--|
| primitive | `src/tokens/primitive/` | `--qx-*` — **only** into `tokens.raw.css` |
| semantic | `src/tokens/semantic/`, `src/tokens/theme/<t>/semantic.json` | `--qx-*` |
| component | `src/tokens/component/`, `src/tokens/theme/<t>/component.json` | `--qx-component-*` |
| component (bridge) | `src/tokens/theme/<t>/bridge.json` | unprefixed `--primary`, `--card`, … |

`bun run check:tokens` enforces the direction. Dependencies are deny-by-default:

```text
primitive  → primitive
semantic   → primitive, semantic
component  → semantic, component (its own only)
```

### Why the primitive layer is not published to the runtime

`src/styles/index.css` — the public `@qeetrix/ui/styles.css` — imports `tokens.css`, which
carries the **semantic and component layers only**. The palette is absent from it.

So "a component must not depend on a primitive value" is not a convention that reviewers have
to police. `bg-[var(--qx-color-neutral-500)]` does not resolve, because that variable is not
there. The full export, primitives included, is still available as
`@qeetrix/ui/tokens.css` for consumers that want the ramps.

### Why the bridge is the component layer

`bridge.json` publishes the unprefixed variables the shadcn / Base-UI contract expects —
`--primary`, `--card`, `--popover`, `--input`, `--ring`, `--sidebar-*` — which
[`src/styles/index.css`](../../src/styles/index.css) maps into Tailwind's utility namespaces.
Those are the tokens components actually render, which makes the bridge a component-token layer
by function, whatever its filename says.

Every bridge entry references a **semantic** token. That indirection is what makes the contrast
gate meaningful: before it existed, the bridge aliased primitives directly and
`bun run check:contrast` was measuring a parallel set of tokens that nothing displayed.

---

## Naming

```text
<category>.<role>[.<variant>][.<state>]
```

- **kebab-case segments.** `color.text.on-brand`, not `color.text.onBrand`.
- **No physical directions.** `left`/`right` are rejected outright — see [rtl.md](./rtl.md).
- **Component tokens live under `component.*`.** `component.button.corner`, never `button.corner`.
- **State goes last**, as a suffix on the role: `action.primary-hover`,
  `input.background-disabled`.
- The emitted variable is the path, hyphen-joined, prefixed `--qx-` (or unprefixed for the
  bridge): `component.button.primary.background` → `--qx-component-button-primary-background`.

### A path cannot be both a leaf and a group

The bridge publishes leaves called `input`, `card` and `radius`. A group at the same path
collides with them, and **Style Dictionary resolves that collision by silently dropping one
side — no error, no output.** Three token groups were lost that way while this layer was being
built, which is why `check:tokens` runs before the build and why:

- component tokens are namespaced `component.*`
- the corner roles are called `corner.*`, not `radius.*`

### Naming by layer

| Layer | Shape | Example |
|:--|:--|:--|
| primitive | the scale it belongs to | `color.neutral.500`, `space.l`, `radii.xl`, `duration.fast` |
| semantic | what it *means* | `color.surface.elevated`, `elevation.modal`, `motion.easing.enter` |
| component | `component.<name>.<part>[-<state>]` | `component.button.primary.background-hover` |
| theme override | the same path, in `theme/<t>/` | `color.action.primary` in both light and dark |

---

## The semantic colour vocabulary

Nine categories, all present in both themes:

```text
text        primary · secondary · tertiary · placeholder · disabled · inverse · brand
            link · link-hover · success · warning · danger · info
            on-brand · on-subtle · on-feedback
surface     canvas · default · elevated · overlay · sunken · subtle · rail · inverse
            interactive · interactive-hover · interactive-active
            brand-subtle · brand-subtle-hover · brand-subtle-active
border      default · subtle · strong · control · control-hover · focused · hover · brand
            danger · success · warning · info
action      primary · primary-hover · primary-active
feedback    success · warning · error · info · *-subtle
focus       ring
overlay     scrim
selection   background
disabled    color.text.disabled + state.opacity.disabled
```

The surfaces are a hierarchy, not synonyms, and in light mode they really are different colours.
The page (`canvas`, a warm off-white) sits below `default` (white cards and panels). `elevated`
and `overlay` rise above that, `sunken` and `subtle` recess below it, and `interactive`
(with -hover and -active) is the neutral fill of things you can press. `brand-subtle` is the
**selected** surface: a quiet Qeet tint for the chosen row, nav item or segment, with ordinary
`text.primary` on top (`text.on-subtle`). `border.brand` is the ≥3:1 indicator that goes with it,
so selection never depends on the tint alone. `border.control` is the resting boundary of a form
control, held to 3:1 on every surface; `border.default` is a divider and is not.

Elevation and the `surface-fade` gradient live in `theme/<t>/` as well, because a shadow designed
for a white page is invisible on graphite. Dark elevation is black shadow plus a faint neutral rim and an
inset top highlight, not the light shadow at a higher opacity.

Two naming notes, both deliberate:

- The content category is called **`text`**, not `content`. That is the established Qeetrix
  name and `--qx-color-text-*` is already consumed; renaming it would break consumers for no
  functional gain.
- **`surface.canvas` is the page, `surface.rail` is the navigation rail.** `canvas` was
  previously a tone nothing rendered while the page used a different value; it now names what
  the page background actually is.

`disabled` has no colour of its own on purpose: disabled styling is `color.text.disabled` plus
`state.opacity.disabled`, so it composes over whatever the control's own colours are.

---

## Owning a value versus referencing one

A token above the primitive layer normally **references** a lower layer. Some legitimately own
a value — a z-index ladder, a density metric, a corner cap — because there is no meaningful
primitive to alias.

That is allowed, on one condition: **the token, or a group above it, must carry a
`$description` saying why.** An undocumented literal in the semantic or component layer is
indistinguishable from an author who skipped the token, so `check:tokens` rejects it.

```json
"corner-xs": {
  "$value": "min(var(--radius-md), 10px)",
  "$type": "dimension",
  "$description": "Corners for the xs sizes, capped so a 24px control never reads as over-rounded."
}
```

---

## Types

Every token declares a `$type`, and a reference has to be type-compatible:

```text
color → color        dimension → dimension       duration → duration
number → number      fontWeight → fontWeight     shadow → shadow
```

`component.button.background → space.4` fails. Composite types are checked per sub-field, so a
`gradient`'s stops are expected to be `color` rather than `gradient`.

---

## Themes

Light and dark expose **the same semantic vocabulary**; only the values differ. A component
therefore never branches on the theme. See [theming.md](./theming.md).

Parity is enforced:

- a token defined in dark but not light is an **error** — it has no base value
- a *colour* defined only in light is a **warning** — dark would silently inherit it
- a token whose `$type` changes between themes is an **error**

Non-colour tokens are legitimately declared once (`--radius` is not theme-varying).

---

## Component tokens

Create one only when there is a real decision to record:

1. the component has visual specialisation a semantic token cannot express
2. the mapping is a customisation point a consumer might reasonably want

Not one per CSS property. `Button` has four colour tokens for its primary variant, three
corners, a height and one font size — not twenty. Prefer a semantic token wherever one fits;
token count is a cost, not an achievement.

**A component token must never reference another component's tokens.** `dialog.background →
card.background` couples two components that should merely agree; each points at its own
semantic surface instead (`color.surface.overlay` for the dialog, `color.surface.default` for the
card). `check:tokens` rejects the coupling.

### Referencing a theme-varying semantic token

A component token in `src/tokens/component/` is theme-agnostic, so it cannot alias a
theme-varying colour by path — it would freeze at the light value. Reference the semantic
**variable** instead, which resolves per theme at runtime:

```json
"background": { "$value": "var(--qx-color-surface-elevated)", "$type": "color" }
```

Only put a component token in `theme/<t>/component.json` when the decision genuinely differs
between themes — the input's fill is transparent on light and a subtle wash on dark, so those
two tokens live there and the component needs no `dark:` variant.

---

## Deprecating a token

Tokens are renamed the same way components are: keep the old one working, stop pointing new
things at it, remove it in a major. Record it with a DTCG `$extensions` entry:

```json
"color": {
  "old-name": {
    "$value": "{color.new-name}",
    "$type": "color",
    "$extensions": {
      "qeetrix.deprecated": {
        "since": "1.2.0",
        "reason": "Renamed to match the surface vocabulary.",
        "replacement": "color.surface.rail"
      }
    }
  }
}
```

`check:tokens` requires `since`, `reason` and an explicit `replacement` (use `null` to state
there is no successor), verifies the replacement exists and is not itself deprecated, and
**fails if any live token still references the deprecated one**. Deleting a token outright is a
major — see [versioning.md](../governance/versioning.md).

---

## Raw values in component source

Design decisions belong in tokens, not in class names.
`bun run check:token-usage` scans component source and rejects:

| Rejected | Instead |
|:--|:--|
| `#123456`, `rgb()`, `hsl()`, `oklch()` | a semantic or component token |
| `text-sky-700`, `fill-amber-400`, `bg-rose-500/20` | a semantic role utility |
| `z-[9999]` | `--qx-z-*` |
| `shadow-[…#000…]` | `--qx-elevation-*` |
| `opacity-50` | `opacity-disabled` |
| `text-[11px]`, `rounded-[2px]`, `w-[32px]` | a scale step, or a component token |

The second row is the one that is easy to get wrong. A **named Tailwind palette class looks
token-backed** — it is a class name, not a hex literal — but the palette is deliberately absent
from the runtime stylesheet, so `text-sky-700` is a value baked into the component: no brand theme
re-points it, the forced-colors mapping never sees it, and `check:contrast` has no pair to measure.
Only the semantic namespaces are governed. CodeBlock, JSONTree and Rating passed the scan for
months this way; they now render `text-syntax-key` and `fill-rating-filled`, which are semantic
roles with a value per theme and a blocking contrast pair each.

If a component genuinely needs a colour vocabulary the semantic roles do not cover, add the roles
— that is what `color.syntax.*` and `color.data.categorical.*` are.

What is *not* rejected, because it is arithmetic rather than a design decision:
`calc()`, `min()`, `max()`, and anything containing `var()`. `translate-x-[calc(100%-2px)]`
is layout maths; `rounded-[2px]` is a corner someone chose.

Two escape hatches, deliberately different:

- **[`raw-value-exemptions.json`](../../scripts/config/raw-value-exemptions.json)** — colours
  that are *domain data*, not styling: the colour picker's hex input, the QR encoder's RGBA
  arguments. Each needs a reason.
- **[`raw-dimension-baseline.json`](../../scripts/config/raw-dimension-baseline.json)** — a
  ratchet over the lengths that predate the token architecture. The gate fails on anything new;
  the list may only shrink. Reseed with
  `node scripts/check/token-usage.mjs --init` **only** when entries have been removed.

`ring-[3px]` in `angle-slider` and `calendar` is the canonical backlog entry: it should be
`--qx-focus-ring-width`.

---

## The generated artifacts

```text
bun run build:tokens

src/tokens/**  ──►  src/styles/tokens.css          bridge + semantic + component + density modes
                    src/styles/tokens.raw.css      everything, primitives included
                    src/styles/tokens.json         resolved per theme, for tooling and gates
                    src/foundations/token-values.ts  the same values, typed
```

All four are **gitignored and generated**. Editing one by hand is how a design system ends up
with two truths — which is exactly what `src/lib/token-values.ts` used to be: a file whose own
header claimed it was generated while it was maintained by hand.

`src/lib/token-values.ts` is now a re-export of the generated foundations module, so
`@qeetrix/ui/lib/token-values` and the root barrel keep working unchanged.

### Reading tokens from TypeScript

```ts
import { DURATION, EASING, Z_INDEX, SHADOW, CHART_COLOR } from "@qeetrix/ui";
```

Plain `as const` objects: tree-shakeable, no runtime resolution, no registry. Values that must
follow the document theme (chart colours) are `var()` references rather than resolved colours,
so a chart re-themes without re-rendering.

For anything styling-related, prefer the CSS variable — it is already theme-, density- and
direction-aware. Reach for the TypeScript constants when a value has to reach JavaScript:
a `z-index` comparison, an animation duration passed to a library, an SVG stroke width.

---

## The CSS entry points

| Export | File | Contents |
|:--|:--|:--|
| `@qeetrix/ui/styles.css` | `styles/index.css` | the entry: Tailwind, fonts, `@theme` mappings, base layer, forced-colors. Imports `tokens.css`. |
| `@qeetrix/ui/qeetrix.css` | `styles/tokens.css` | bridge + semantic + component + density modes |
| `@qeetrix/ui/tokens.css` | `styles/tokens.raw.css` | every token, primitives included |
| `@qeetrix/ui/tokens.json` | `styles/tokens.json` | resolved per theme |

`@theme` is the only place Tailwind utility namespaces are mapped, and every mapping points at
a generated variable. It restates no values — that was how the shadow ramp came to exist twice.

---

## Adding a token

1. **Is there a primitive for it?** If not, add the scale step first.
2. **Does it need a name?** If a component is the only consumer, it is a component token; if
   several components mean the same thing by it, it is semantic.
3. **Does it vary by theme?** Colour usually does; geometry usually does not. Theme-varying
   goes in `theme/<t>/`, and must be present in **both** themes.
4. `bun run build:tokens && bun run check:tokens`.
5. If it is a colour that text will sit on, add the pair to
   [`scripts/check/contrast.mjs`](../../scripts/check/contrast.mjs).
6. Changeset: a new token is a **minor**; changing what an existing token *means* is a
   **major**. See [versioning.md](../governance/versioning.md).
