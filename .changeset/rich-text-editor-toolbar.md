---
"@qeetrix/ui": minor
---

**Fixed: `RichTextEditor`'s formatting controls were an unlabelled row of tab stops, and its
placeholder and read-only state were invisible to assistive technology (`A11Y-009`).**

- **The formatting strip is a named APG `toolbar`** with one tab stop; arrow keys,
  <kbd>Home</kbd> and <kbd>End</kbd> move between controls. It was a plain `<div>` holding thirteen
  individually tabbable buttons — a wall in front of the editing surface on every visit. The tab
  stop is derived, so a control that becomes disabled (Undo with nothing to undo) cannot take it
  with it, and arrow navigation skips disabled controls rather than focusing nothing. New
  `toolbarLabel` prop, defaulting to `"Formatting"`.
- **`placeholder` is exposed as `aria-placeholder`.** The visible copy is `aria-hidden`, as it was,
  so it is announced once rather than twice or not at all.
- **`editable={false}` reports `aria-readonly="true"`.** It kept full textbox semantics, so it
  presented as an editable field that silently refused input.

11 tests. Not covered: the composite `Field` relationship and native `FormData` serialisation, which
depend on the wider field-contract work and are unchanged here.
