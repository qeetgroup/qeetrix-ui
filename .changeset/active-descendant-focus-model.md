---
"@qeetrix/ui": minor
---

**Fixed: three `aria-activedescendant` widgets could point at nothing, and moved a highlight the
user could not see (`A11Y-006`).**

- **`Listbox` built option IDs out of option values.** An option whose value contained a space
  produced `aria-activedescendant="r1-two words"` — two IDREFs where the attribute allows one — and
  a value containing a quote produced an ID that could not be queried. IDs are positional now; the
  value is still available on the element as `data-value`.
- **`Listbox`'s active option is reconciled on every render.** It used to be initialised once, so
  filtering the list, or disabling the active option, left the attribute pointing at an element that
  no longer existed. If the requested option is gone, the first enabled one becomes active; if
  nothing is selectable, the attribute is dropped rather than left dangling.
- **The active option is scrolled into view** in `Listbox`, `MentionInput` and `CommandPalette` —
  all three scroll at a fixed height, so arrowing past the visible window used to move a highlight
  off screen. Only interaction scrolls: mount and unrelated re-renders do not, which would otherwise
  yank a parent scroller on page load.
- **`CommandPalette` clamped its highlight in an effect**, leaving one committed frame where
  `aria-activedescendant` pointed past the end of the filtered list — and <kbd>Enter</kbd> in that
  frame read the same stale index. The clamp is derived in render, the effect is gone, and
  <kbd>Enter</kbd> and the highlight now always agree.
- **Result counts are announced.** `CommandPalette` had a visible count in an optional footer and
  nothing for a screen reader; `MentionInput` had neither. Both now carry a visually hidden polite
  status region, with `resultCountLabel` / `suggestionCountLabel` props for translation (return `""`
  to opt out).
- **`MentionInput` dismisses on focus-out.** Clicking away used to leave the suggestion popup
  floating over the page with a live `aria-activedescendant`. Focus moving *into* the popup, which is
  what a mouse-down on an option does, still keeps it open.

Not done, deliberately: `MentionInput` does not gain `role="combobox"` or `aria-expanded`. It is a
multiline composer, `role="combobox"` would drop `aria-multiline`, and ARIA does not allow
`aria-expanded` on `textbox` — axe fails it as `aria-allowed-attr`. The live region carries the
open/closed state instead. That part of the audit's recommendation does not apply as written.

35 tests across the three components, covering the transitions rather than the initial attribute.
