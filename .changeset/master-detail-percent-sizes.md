---
"@qeetrix/ui": patch
---

`MasterDetail` was sizing its desktop list pane in pixels while documenting percentages.

`react-resizable-panels` v4 reads a bare `number` as **pixels** and a string as a percentage.
`MasterDetail` passed `defaultSize={defaultListSize}` and `minSize={minListSize}` — both numbers —
so its documented "% of width" defaults of `32` and `22` asked for a **32-pixel list pane with a
22-pixel minimum** on every desktop viewport. Both are now passed as `"32%"` and `"22%"`.

The units are asserted by recording the props the component emits, because the resulting widths
are not observable here: the library needs a real `ResizeObserver` measurement before any size
takes effect and reports every panel as 50% in jsdom. The same limitation is why `Resizable`'s own
suite tests the separator's value model rather than a drag.
