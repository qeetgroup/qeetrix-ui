---
"@qeetrix/ui": minor
---

Direction and locale are now cross-cutting runtime contracts instead of per-component guesses.

Every widget whose *behaviour* has a direction was deriving it for itself. Carousel read the
nearest `[dir]` attribute and fed Embla; TreeView and AvailabilityGrid did not derive it at all
and hardcoded `ArrowRight` to mean "forward", which is backwards in Arabic. `DirectionProvider`
existed but only re-exported Base UI's hook, which cannot see `<html dir="rtl">` — the way most
applications actually turn RTL on — and so reported `ltr` inside one.

Three new pieces, all additive:

- **`@/lib/direction`** — framework-free. `directionForLocale` (CLDR-backed, with script subtags
  winning over the language, so `pa-Arab` is RTL and `pa-IN` is not), `directionFromDom`,
  `logicalDirectionForKey` / `keyForLogicalDirection`, `sequentialArrowKeys`, `inlineAxisSign`.
  A handler switches on `"inline-end"` and stops caring which arrow that is.
- **`@/lib/locale`** — `parseLocaleNumber`, `numberSymbols`, `localeWeekStart`. `Intl` formats but
  does not parse, which is how a field renders `1 234,56` to a French user and accepts only
  `1234.56`. The parser is deliberately strict: a group separator must be followed by as many
  digits as the locale actually groups by, so `1.5` is `NaN` in German rather than fifteen, and
  `12abc` is `NaN` rather than `Number.parseFloat`'s `12`. It reads Indian lakh grouping and
  Arabic-Indic digits out of the formatter rather than a hand-written table.
- **`DirectionProvider`** gained a `locale` prop and three hooks: `useResolvedDirection` (override
  → provider → DOM → `ltr`), `useDirectionalKeys`, `useLocale`. `<DirectionProvider locale="ar-EG">`
  is RTL without restating it, and publishes `lang` on its wrapper.

**Trade-off, and it is a real one.** The DOM half of the resolution runs in a layout effect, so a
component that relies on `<html dir>` rather than a provider renders LTR for exactly one commit
before being corrected — deliberate, because server and client then agree on the first pass and
hydration stays clean. The DOM is also read once per mount: toggling `document.documentElement.dir`
at runtime does not re-resolve. Applications that switch direction live should drive it through
`DirectionProvider`, which is reactive. Observing every ancestor's attributes for every
direction-aware widget is not worth the cost.

`useDirection` keeps its old behaviour and is still exported; it is now documented as the
provider-only read, with `useResolvedDirection` as the one components should use.
