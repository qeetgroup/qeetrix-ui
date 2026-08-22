---
"@qeetrix/ui": patch
---

**`check:token-usage` did not see named Tailwind palette classes, so three components bypassed
the semantic layer while the scan printed "0 violations".**

The scanner rejected `#123456` and `oklch(…)`, but not `text-sky-700` or `fill-amber-400`. A
palette class looks token-backed because it is a class name — and it isn't: the palette is
deliberately absent from the runtime stylesheet, so a value spelled that way is baked into the
component. No brand theme re-points it, the `forced-colors` mapping never sees it, and
`check:contrast` has no pair to measure. CodeBlock's and JSONTree's syntax highlighting (eight
classes each) and Rating's filled star were exactly that.

- A new `palette-utility` rule covers all 22 Tailwind ramps across 19 utility prefixes, with or
  without an opacity modifier and behind any variant. It fires on the whole set, not a list.
- New semantic roles carry the values instead: `color.syntax.{key,string,number,literal}` per
  theme, and `color.rating.filled`. Components render `text-syntax-key` and
  `fill-rating-filled`.
- The four syntax roles are now **blocking** contrast pairs (5.07–7.29:1 light, 6.34–10.38:1
  dark). They always rendered those values; nothing was measuring them.
- `forced-colors` remaps the rating fill to `Highlight` and opts the widget out of the forced
  palette. Previously filled and empty stars both resolved to `CanvasText`, which erased the
  value; the accessible name always stated it, so this is the visual channel catching up.

Every replacement token resolves to the exact palette step the class used, so the refactor is
non-visual. One deliberate exception: CodeBlock's "Copied" tick moves from `emerald-600` to
`text-success` — the semantically correct role, one ramp step different in light.
