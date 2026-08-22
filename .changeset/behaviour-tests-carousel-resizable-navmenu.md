---
"@qeetrix/ui": patch
---

Carousel, Resizable and NavigationMenu tests assert behaviour instead of rendering.

All three were satisfied by markup existing. Carousel's arrow-key test was
`expect(() => { fireEvent.keyDown(...) }).not.toThrow()` — it would have passed with the handler
deleted. Resizable's suite asserted that two panels and a handle appeared, which cannot tell a
working separator from a `<div>`. NavigationMenu's rendered no triggers at all, so it tested two
static links and never opened a menu.

- **Carousel** now spies on the Embla API it was handed and asserts `scrollNext`/`scrollPrev` were
  called and the key was claimed (`preventDefault`), that unmodified arrows are claimed and
  modified ones are not — `Alt+Arrow` is browser back — and that a caller's own `onKeyDown` can
  pre-empt it. 29 → 34.
- **Resizable** now asserts the separator's value model (`aria-valuenow`, bounds, and which panel
  `aria-controls` names, so two dividers are distinguishable), that `aria-orientation` is
  *perpendicular* to the group's, the axis-dependent geometry, and that a disabled divider loses
  its tab stop rather than only gaining `aria-disabled`. 4 → 13.
- **NavigationMenu** now drives the disclosure: opens a panel, asserts only that panel is present,
  reads the `aria-controls` relationship, closes on a second activation and on Escape, and proves
  that activating a second trigger moves the open panel rather than accumulating panels. 4 → 12.

What is *not* covered is stated in each file rather than faked. `react-resizable-panels` throws
`Previous layout not found` in jsdom because it needs a real measurement, so the drag and the
arrow-key resize are browser assertions. Base UI's collision positioning has nothing to measure,
so where the NavigationMenu popup lands is too.

Also recorded, in `resizable.tsx`: **`react-resizable-panels` inverts its own interaction under
`dir="rtl"`.** Layout mirrors correctly, but the library maps `ArrowLeft` to "shrink the first
panel" and derives drags from a raw `clientX` delta, neither of which consults direction — so both
move the divider the wrong way in a horizontal RTL group. Working around it would mean
re-implementing the library's constraint cascade against its imperative `setLayout`, and the
result would be unverifiable here. Vertical groups are unaffected.
