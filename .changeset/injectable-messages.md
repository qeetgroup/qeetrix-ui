---
"@qeetrix/ui": minor
---

**Every user-facing string in 44 components can now be replaced (`RTL-001`, partial).** The package
hardcoded English `aria-label`s and visible text, so a non-English application could not localise it
at all. There is now a message catalogue with a `MessagesProvider` and a per-component `messages`
prop, resolved the same way direction is: an explicit prop wins, then the nearest provider, then the
built-in default.

**No rendered output changed.** Every default is byte-identical to what the component emitted before,
which is why 1,970 tests still pass without one being edited to accommodate a new string. Adopting
this is opt-in.

Strings that interpolate take a function rather than a template, so a translator can reorder the
parts: `itemPosition: (index, total) => …` rather than `"${index} of ${total}"`.

The ad-hoc single-string label props that predated this — `slidePositionLabel`,
`suggestionCountLabel`, `resultCountLabel`, `toolbarLabel`, `statusLabel`, `timeColumnHeader`,
`categoryHeader` — still work and now read from the same catalogue, so there is one mechanism rather
than two.

**Scope, stated honestly: 44 components are covered and 17 strings across 9 files are not.** The
remainder are concentrated in the pickers and Tour. `MessagesProvider` is published at
`@qeetrix/ui/providers/messages-provider` and re-exports every type needed to write a typed override;
the catalogue module itself stays internal, consistent with `./lib/*` not being a public path.
