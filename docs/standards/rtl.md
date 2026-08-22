# RTL and logical properties

Qeetrix mirrors under `dir="rtl"` because its styling is written in **logical** properties, not
physical ones. There is no separate RTL stylesheet, and no component branches on direction.

---

## The rule

Use the inline-axis utilities:

| Instead of | Use | Meaning |
|:--|:--|:--|
| `pl-2` / `pr-2` | `ps-2` / `pe-2` | padding inline start / end |
| `ml-2` / `mr-2` | `ms-2` / `me-2` | margin inline start / end |
| `left-0` / `right-0` | `start-0` / `end-0` | inset inline start / end |
| `text-left` / `text-right` | `text-start` / `text-end` | text alignment |
| `border-l` / `border-r` | `border-s` / `border-e` | border inline start / end |
| `rounded-l-*` / `rounded-r-*` | `rounded-s-*` / `rounded-e-*` | corners on the inline axis |

Icons that indicate direction (a chevron in a breadcrumb, a "next" arrow) mirror with
`rtl:rotate-180` or by swapping the icon — a physical transform is correct there, because the
glyph itself has a direction.

---

## Physical properties are not banned

Some physical values are direction-agnostic and correct:

```tsx
// Centring. Identical in both directions.
className="fixed left-1/2 -translate-x-1/2"

// Vertical axis. Direction does not apply.
className="top-3 pb-4"
```

This is why the manifest records `rtl` as three-valued rather than boolean:

| Value | Meaning |
|:--|:--|
| `supported` | uses logical utilities — mirrors by construction |
| `unknown` | uses physical utilities and has not been reviewed |
| `not-applicable` | no directional styling at all |

`unknown` is a review queue, not a defect list. 49 components are `supported`, 85
`not-applicable`, and 11 are `unknown` — `bun run check:contract --verbose` names them. `table`
is a genuine finding in that set: it uses `text-left` where `text-start` belongs.

---

## Tokens carry no direction

The token layer has no `margin.left.4` and never will:

- **spacing and sizing tokens are scalars.** `space.l` is 16px on whichever axis a component
  applies it to.
- **`check:tokens` rejects a physical direction in a token path.** `left`, `right`, `ltr-only`
  and `rtl-only` fail the naming rule.

Where a token has to express an axis, it uses the logical vocabulary — `start`, `end`, `inline`,
`block`.

---

## DirectionProvider

```tsx
import { DirectionProvider } from "@qeetrix/ui";

<DirectionProvider direction="rtl">
  <App />
</DirectionProvider>
```

It wraps Base UI's provider, so keyboard navigation flips with the writing mode too — in an RTL
listbox, `ArrowRight` moves toward the start. It also sets `dir` on its wrapper, so CSS logical
properties resolve correctly for the subtree.

`useDirection()` returns `"ltr"` or `"rtl"` for the rare component that needs the value in
JavaScript — a drag interaction whose delta has to be negated, say. Styling should never need it.

Application-level direction (reading the user's locale, choosing a direction) belongs to the
consuming product. The library takes `direction` as a prop; it does not detect it.

---

## Checking your work

```bash
bun run check:contract --verbose   # lists every component whose rtl support is unreviewed
```

For a component under review: render it inside `<DirectionProvider direction="rtl">` and look
for spacing that did not move, icons pointing the wrong way, and text that stayed
left-aligned. Then either fix the utilities or record `rtl: "not-applicable"` in the registry
with the reason.
