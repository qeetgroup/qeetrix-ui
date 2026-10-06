# RTL and logical properties

Qeetrix mirrors under `dir="rtl"` because its styling is written in **logical** properties, not
physical ones. There is no separate RTL stylesheet.

Styling never branches on direction. **Behaviour sometimes has to**, and that is what the
direction runtime below exists for: no logical property can express "ArrowRight collapses a tree
node in Arabic and expands it in English".

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

**`rtl:` versus `[&:dir(rtl)]:`.** Tailwind's `rtl:` variant matches `[dir="rtl"] *` as well as
`:dir(rtl)`, so an element inside an LTR island (`<code dir="ltr">` in an Arabic page) still
matches it and mirrors when it should not. `[&:dir(rtl)]:` reads the element's *resolved*
direction and gets the island right; prefer it in new component code (Sheet and Sidebar use it).
The existing `rtl:` usages — about thirty, nearly all icon flips — are correct for whole-document
RTL and are left as they are; converting them is a mechanical follow-up.

**Portalled overlays** render into `document.body`, outside any `DirectionProvider` wrapper, so in
an application that declares RTL only through the provider (no `dir` on `<html>`) a popup's
layout reads LTR. Set `dir` on `<html>` for whole-application RTL — the recommended setup — or
pass `dir` to the overlay's content part where it accepts one (`SheetContent`). The logical
`side` values (`inline-start` / `inline-end`) on Popover, HoverCard and Tooltip resolve from the
provider or the document either way.

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

<DirectionProvider locale="ar-EG">
  <App />
</DirectionProvider>
```

It wraps Base UI's provider, so keyboard navigation flips with the writing mode too — in an RTL
listbox, `ArrowRight` moves toward the start. It sets `dir` on its wrapper, so CSS logical
properties resolve for the subtree, and `lang`, so the browser hyphenates and speaks it correctly.

`direction` and `locale` are both optional and either may be given alone:

| Given | Direction | Locale |
|:--|:--|:--|
| `locale="ar-EG"` | `rtl`, derived | `ar-EG` |
| `direction="rtl"` | `rtl` | none |
| both | the explicit `direction` | as given |
| neither | `ltr` | none |

Application-level direction (reading the user's locale, choosing a direction) belongs to the
consuming product. The library takes them as props; it does not detect them.

---

## The direction runtime

Four hooks and two framework-free modules. A component should never re-derive direction from the
DOM itself — that is what this replaced.

### `useResolvedDirection(ref, override?)`

The value a component branches *behaviour* on. Resolution order, first hit wins:

1. `override` — an explicit prop on the component.
2. The nearest `DirectionProvider`, Qeetrix's or Base UI's.
3. The DOM: the nearest ancestor carrying `dir`, then the computed `direction`. This is what
   picks up `<html dir="rtl">` and `dir="auto"`.
4. `"ltr"`.

Steps 1 and 2 answer during render, including on the server. Step 3 cannot — there is no node yet
— so a subtree relying on it renders LTR for one commit and a layout effect corrects it before
paint. Hydration stays clean because server and client agree on that first pass.

**The DOM is read once per mount.** Toggling `document.documentElement.dir` later does not re-run
it. An application that switches direction at runtime should drive it through `DirectionProvider`,
which is reactive.

### `useDirectionalKeys(ref, orientation?, override?)`

`useResolvedDirection` plus the two derived values a key handler wants:

```tsx
const { direction, arrowKeys, logical } = useDirectionalKeys(rootRef, "horizontal");

if (event.key === arrowKeys.next) advance();          // ArrowLeft in RTL
if (logical(event.key) === "inline-end") expand();     // direction-independent intent
```

### `useLocale()`

The locale declared by the nearest provider, or `undefined`. **Pass `undefined` through** rather
than substituting a default: every `Intl` constructor reads it as "the runtime's own locale",
which is the right answer when the host has not declared one. `"en-US"` would override a browser
that already knows better.

### `@/lib/direction` — no React

| Export | Purpose |
|:--|:--|
| `directionForLocale(tag)` | `"ar-EG"` → `rtl`. Prefers the runtime's CLDR data, falls back to script/language tables. A script subtag wins: `pa-Arab` is RTL, `pa-IN` is not. |
| `directionFromDom(node)` | The nearest `dir`, then the computed style. `undefined` when it cannot tell. |
| `logicalDirectionForKey(key, dir)` | `"ArrowRight"` + `rtl` → `"inline-start"`. |
| `keyForLogicalDirection(logical, dir)` | The inverse. |
| `sequentialArrowKeys(dir, orientation)` | `{ previous, next }` for a one-dimensional widget. |
| `inlineAxisSign(dir)` | `1` or `-1`. Multiply a `clientX` delta to get an inline-axis delta. |

The block axis never mirrors — Qeetrix never sets `writing-mode`, so `ArrowUp` is always
`block-start`.

---

## Numbers and calendars

`@/lib/locale`, also React-free. `Intl` formats but does not parse, which is how a field ends up
rendering `1 234,56` to a French user and accepting only `1234.56`.

| Export | Purpose |
|:--|:--|
| `parseLocaleNumber(text, locale?)` | Parses what the locale *writes*. `Number.NaN` when the input is not a number in that locale. |
| `numberSymbols(locale?)` | The separators, minus sign, digit glyphs and grouping widths, read from `formatToParts`. |
| `localeWeekStart(locale?)` | First weekday as a `getDay()` index — `0` for `en-US`, `1` for `en-GB`, `6` for `ar-EG`. |

`parseLocaleNumber` is deliberately strict, because the failure mode is a wrong amount rather
than a wrong layout:

```ts
parseLocaleNumber("1.234,56", "de-DE");  // 1234.56
parseLocaleNumber("1 234,56", "fr-FR");  // 1234.56 — a typed space, not U+202F
parseLocaleNumber("12,34,567", "en-IN"); // 1234567 — lakh grouping, read from the formatter
parseLocaleNumber("١٢٣٤٫٥", "ar-EG");    // 1234.5
parseLocaleNumber("1.5", "de-DE");       // NaN — "." groups in German, and never by one digit
parseLocaleNumber("12abc", "en-US");     // NaN — Number.parseFloat would say 12
```

A group separator must be followed by as many digits as the locale actually groups by, which is
what lets `1.5` be rejected in German without also rejecting `12,34,567` in Indian English.

`localeWeekStart` is locale *data*, not product policy. A product that lets a user choose their
week start should take that as a prop and use this only as the initial value.

---

## Localised strings

The direction contract has a message counterpart: every user-facing string lives in the
catalogue, [`src/lib/messages.ts`](../../src/lib/messages.ts), and an application translates it
once with `<MessagesProvider messages={…}>` (or per instance with a component's `messages` prop).
`QEETRIX_MESSAGES` enumerates the English source for a translator. Interpolated strings are
functions of their parts, so a translation can reorder them. See
[component-api.md § Copy and localization](./component-api.md#copy-and-localization).

Known gaps: a few strings are hard-coded inside `@base-ui/react` with no prop to reach them (the
Combobox internal dismiss button's "Dismiss"), and server-safe components resolve their group
from their own `messages` prop only — the provider does not reach them.

---

## Checking your work

```bash
bun run check:contract --verbose   # lists every component whose rtl support is unreviewed
bun run check:a11y --verbose       # the rtl audit dimension, and whether a test backs it
```

An `rtl` dimension recorded as `pass` needs a test that asserts *direction* — `check:a11y` looks
for `DirectionProvider` or `dir="rtl"` in the test body and refuses an unbacked claim.

**jsdom does no layout.** Mirroring cannot be observed in a unit test: `getBoundingClientRect` is
all zeros and no CSS is applied. What a unit test can pin is what the component *emits* — the
resolved `data-direction`, the logical style properties, the utility classes, and the key→action
mapping. Whether `ps-4` lands on the right under `dir="rtl"` is a browser assertion, governed by
`TEST-001`.

For a component under review: render it inside `<DirectionProvider direction="rtl">` and look
for spacing that did not move, icons pointing the wrong way, and text that stayed
left-aligned. Then either fix the utilities or record `rtl: "not-applicable"` in the registry
with the reason.
