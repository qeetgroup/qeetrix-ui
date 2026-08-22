---
"@qeetrix/ui": patch
---

**Menubar is asserted as a whole widget again, and its keyboard model is proven.** The axe
assertion had been narrowed to the open menu popup to avoid a real `aria-required-children`
violation on the menubar itself. Narrowing hides everything else: the assertion now runs over
the entire widget and subtracts exactly one node, whose continued existence it also asserts — so
when the upstream cause is fixed the test fails and the exception comes out.

The violation is Base UI's `aria-owns` bridge (an empty `<span>` that re-parents the portalled
popup under its trigger for assistive technology), which lands as a direct child of the
`role="menubar"` element. Verified against `@base-ui/react` 1.7.0 as having no supported
workaround: `Menu.Positioner` throws without `Menu.Portal`, so the popup cannot render inline;
the bridge is only emitted for non-modal focus managers and `Menu.Popup` hard-codes
`modal: isContextMenu`; and wrapping each menu in a `role="none"` element — the APG's own
`<li role="none">` idiom — does not help, because axe recurses through presentational wrappers.

Eight keyboard tests were added for the behaviour the pattern requires and nothing demonstrated:
inline arrows between menus, Home/End, `ArrowDown`/`Enter` to open with the first item
highlighted, switching menus while one is open, Escape closing and returning focus to its
trigger, typeahead inside an open menu, and arrow keys following the writing direction in RTL.
Type-to-select on the triggers is optional in the APG pattern and Base UI does not implement it;
that is now stated rather than left as a gap of unknown status.
