---
"@qeetrix/ui": patch
---

**Fixed: `Rating`'s half-star click landed on the wrong half under `dir="rtl"` (`RTL-001`
residual).** `direction-aware-widgets.md` mirrored the arrow keys and left this one open, twice, for
a stated and correct reason: `valueFromPointer` measures a coordinate, and jsdom reports every box
as zero-sized, so the mirrored arithmetic and the unmirrored arithmetic return the same number for
every input. A test could not have failed.

The split was measured from the star's physical `left` edge, which is its inline *end* in RTL. The
partial fill, meanwhile, already mirrored — `inset-0` with an explicit width is over-constrained, so
the browser drops `left` and anchors to the right in an RTL containing block — so the pointer and the
paint disagreed: a click on the half of the star that *shows* as filled at 0.5 returned 1, and a
user aiming at half a star got a whole one. It is now measured from the inline-start edge via
`inlineAxisSign`, which puts it on the same contract the keys use. The two paths now agree about
which direction is "more": a click one half-star toward the inline end and the arrow key that raises
the value move the same way.

The reason a test can fail now is `real-browser-evidence.md`. This is the first defect the browser
project has made assertable that was previously declined as unprovable, so the new file is written
as the pattern: `src/__tests__/browser/rating-pointer.test.tsx` asserts the three real-browser facts
the arithmetic depends on before it asserts the arithmetic — that `direction: rtl` reverses the flex
line so star 0 is the rightmost box, that the partial fill anchors to the right edge, and that the
LTR reading is unchanged so the fix is a mirror rather than a swap. Every click is a real pointer
event at a real coordinate, so each one also proves hit-testing lands on the star the test names.
**Six tests, three of which fail against the previous implementation** — and the three that do not
are the layout premises, which is what makes the other three mean something.
