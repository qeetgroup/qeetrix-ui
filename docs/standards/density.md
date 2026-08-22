# Density

Density changes how tall controls are and how much room sits between them, without changing any
component's markup or class names. It is delivered entirely through tokens.

```tsx
import { DensityProvider } from "@qeetrix/ui";

<DensityProvider density="compact" scope="document">
  <App />
</DensityProvider>
```

---

## The model

Four metrics, three modes:

| Metric | `default` | `comfortable` | `compact` |
|:--|:--|:--|:--|
| `control-height` | 2rem | 36px | 28px |
| `row-height` | 2.5rem | 52px | 40px |
| `cell-padding-y` | 0.75rem | 12px | 6px |
| `field-gap` | 1rem | 16px | 8px |

`default` is the **density-neutral baseline**: what a control measures when no
`DensityProvider` is mounted. `comfortable` and `compact` are opt-in and applied by attribute:

```css
:root                             { --qx-density-control-height-default: 2rem; }
[data-qx-density="comfortable"]   { --qx-density-control-height: 36px; }
[data-qx-density="compact"]       { --qx-density-control-height: 28px; }
```

Note that `:root` publishes the **default under its own name** rather than assigning
`--qx-density-control-height`. If `:root` set the live variable, it would win over nothing and
lose to everything — but it would also silently change every control's size for consumers not
using a provider. Publishing it separately lets a component spell its fallback as a token:

```tsx
// component.button.height
var(--qx-density-control-height, var(--qx-density-control-height-default))
```

---

## Consuming density

Read the component token, not the density variable:

```tsx
// Right — the component's own token, which resolves density for it.
className="h-[var(--qx-component-button-height)]"

// Tolerated — the density variable with a token-backed fallback.
className="h-[var(--qx-density-control-height,var(--qx-density-control-height-default))]"

// Wrong — a magic number that disagrees with the tokens.
className="h-[var(--qx-density-control-height,2.25rem)]"
```

The third form is a real bug, not a style preference: the control renders one size on its own
and a different one inside a `DensityProvider`. `bun run check:tokens` reports every occurrence:

```text
⚠ 8 inline density fallback(s) in 8 component(s) disagree with the density tokens
  src/components/navigation/tabs.tsx: --qx-density-control-height falls back to 2.25rem,
    tokens say 2rem
```

It reports rather than fails, because deciding which number is right is a design call.

---

## DensityProvider

```tsx
<DensityProvider density="comfortable" scope="subtree">
```

- `density` — `comfortable` | `compact`, defaulting to `comfortable`
- `scope="document"` — sets `data-qx-density` on `<html>`, in an effect, restoring the previous
  value on unmount. Use once near an application root.
- `scope="subtree"` (default) — renders a `display: contents` wrapper carrying the attribute.
  Use for previews, embedded tools, or a compact table inside a comfortable page.
- `useDensity()` returns the nearest mode, for the rare component that has to branch in
  JavaScript rather than CSS — `DataTable` uses it to pick row-virtualisation heights.

Nesting works, because the attribute is inherited: a `compact` subtree inside a `comfortable`
document is a supported arrangement.

Explicit component sizes always win. `<Button size="lg">` is 36px in every mode — density moves
the *default*, it does not override an author's decision.

---

## Adding a density-aware metric

1. Add all three modes to
   [`src/tokens/semantic/density.json`](../../src/tokens/semantic/density.json). All three are
   required — the parity of the mode set is what makes the fallback pattern safe.
2. Extend `densityModeCss` in
   [`scripts/build/tokens.mjs`](../../scripts/build/tokens.mjs) to emit the new metric.
3. Reference it from a component token, not from the component.

Density belongs in the token layer. A component that computes its own compact spacing is a
component that will disagree with the next one.
