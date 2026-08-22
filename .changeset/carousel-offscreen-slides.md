---
"@qeetrix/ui": minor
---

**Fixed: `Carousel` left offscreen slides fully operable, and ignored direction and motion
preference (`A11Y-004`).** Every slide stayed mounted, focusable and in the accessibility tree
whatever Embla thought was on screen, so tabbing through a three-slide carousel walked a keyboard
user into two slides they could not see — and a screen reader read all three as present.

- **Offscreen slides are `inert` and `aria-hidden`.** Visibility is taken from Embla's own
  `slidesInView()`, and each `CarouselItem` resolves its index from `api.slideNodes()` rather than
  from mount order, so the state always matches what Embla actually shows. It fails open: until
  Embla has reported visibility — a server render, a failed init, a single-slide carousel — nothing
  is hidden.
- **Slides state their position.** Each is named `"2 of 5"` by default; a new
  `slidePositionLabel(index, count)` prop replaces that for translation, and a slide that sets its
  own `aria-label` keeps it.
- **RTL works.** Direction is read from the nearest `dir` attribute, which covers both
  `<html dir="rtl">` and `DirectionProvider`, and is passed to Embla. In a horizontal RTL carousel
  <kbd>ArrowLeft</kbd> now moves to the *next* slide and the arrow glyphs flip; vertical carousels
  are unaffected. An explicit `opts.direction` still wins.
- **Reduced motion is honoured.** Embla animates with JavaScript, so the library's global
  `prefers-reduced-motion` CSS cannot reach it. The scroll duration collapses to zero — slides
  change instantly instead of gliding — and any plugin exposing `stop()`, which is how
  `embla-carousel-autoplay` presents itself, is stopped and re-stopped on the events that could
  restart it. The option is only sent when reduced motion is requested: Embla merges options by key
  presence, so passing `duration: undefined` would have wiped out its own default.

Trade-off: `inert` is a browser behaviour, and jsdom only stores the attribute. The tests pin the
attribute contract and the accessibility-tree consequence (role queries no longer reach a hidden
slide); that focus and hit-testing are genuinely blocked needs a real browser to confirm, and is
recorded as such.

Autoplay still needs a visible pause control from the caller — the `api` is exposed for exactly
that. This change does not add one.

21 new tests. `carousel.test.tsx` keeps its real-Embla suite and adds a fake-Embla one, because
`slidesInView()` derives from an IntersectionObserver and from layout, neither of which exists in
jsdom.
