---
"@qeetrix/ui": minor
---

**One overlay runtime instead of four near-misses.** Base UI gives Dialog, Sheet, Popover and
the menus real focus containment, inerting and scroll locking. Tour and the public `FocusTrap`
had their own partial versions, and "partial" in focus management means "escapes". There is now
a shared, headless runtime — `src/runtime/overlay.ts`, `focus-trap.ts`,
`overlay-position.ts` — that both use. No public API changes.

Fixed:

- **`FocusTrap` was a Tab handler, not a containment boundary.** It only saw `Tab` events that
  originated inside it, so a script calling `.focus()` on a control behind the overlay, or a
  `Tab` pressed while focus was already outside, walked straight through it. It now watches the
  document for both, and watches its own subtree for the third case — removing the focused
  element drops focus to `<body>` without firing any focus event, which no listener can see.
- **A trap with nothing focusable left focus on the page behind it.** It now falls back to the
  container itself (adding, and later removing, `tabindex="-1"`), so an overlay that has not
  finished loading still holds focus.
- **The tabbable selector missed valid stops and included invalid ones.** `area[href]`,
  `iframe`, `object`, `audio`/`video[controls]`, `details > summary` and `[contenteditable]`
  were never found; `input[type=hidden]`, `tabindex="-2"` and controls inside an `inert`,
  `[hidden]` or disabled-`fieldset` subtree were treated as reachable — so a trap could "enter"
  a hidden input and appear to do nothing.
- **Nested traps fought each other.** Both enforced containment simultaneously. A focus-layer
  stack now gives the innermost active trap ownership and hands it back on unmount. A surface
  portalled *from inside* a trap — a Select, a menu, a nested dialog — is recognised and left
  alone, so the trap no longer yanks focus out of its own popup.
- **Focus was restored to detached triggers.** If the trigger was removed while the overlay was
  open, the trap called `focus()` on a disconnected node. It now checks and leaves focus alone.
- **Tour advertised `aria-modal="true"` without meaning it.** No inerting, no scroll lock, so
  keyboard, pointer and virtual-cursor users could all reach the obscured page. It now inerts
  every background `<body>` child and locks page scroll, refcounted so nested overlays compose,
  and skipping `[aria-live]` containers so a toast raised behind it is still announced.
- **Dialog, AlertDialog, Sheet and Drawer could put content outside the operable viewport.**
  Each modal surface is now bounded in dynamic viewport units with its own scroll region, so
  long content stays reachable at 200% zoom, on a short viewport, and with a mobile keyboard
  open. Drawer's cap moved from `85vh` to `85dvh`.
- **Tour's coordinates were unclamped and static.** Placement subtracted literal 80/100/200px
  height guesses, never checked whether the result was on screen, and never recomputed on
  resize or scroll. It now measures the card, flips to the opposite side when the requested one
  has no room, clamps to the viewport, tracks resize/scroll/its own size, and exposes the
  resolved side as `data-side`.
- **FloatingWindow clamped drags against a fixed 80px assumption**, which let a wide panel sit
  almost entirely off screen. It clamps against the measured panel, keeps 64px reachable, and
  re-clamps when the window shrinks.
- **OverflowList mounted every item twice.** Measurement rendered a duplicate hidden copy of
  each child: duplicate `id`s in the document, two of every mount effect, two of every fetch.
  It now measures the real row before paint. It also measured the *leading* items when
  collapsing from the start, so `collapseFrom="start"` kept the wrong ones whenever item widths
  differed.

Trade-offs and what is not covered:

- **`inert` is the containment mechanism, and jsdom does not implement it.** The tests assert
  that it is applied and released, not that focus is excluded; that needs a real browser, as
  already recorded for Dialog and AlertDialog.
- **Background is decided when an overlay opens.** An element appended to `<body>` afterwards is
  left operable — deliberate, so overlays raised on top and live regions keep working, but it
  means a late-arriving background element is not inerted.
- **Modal surfaces scroll as a whole.** The close button scrolls with the content rather than
  staying pinned; a dedicated body slot would fix that and is not in this change.
- **Overlay layer tokens are applied to the surfaces in this change only.** Tooltip, Select,
  Combobox, Autocomplete and ActionBar still use `z-50` and now sit below the migrated
  surfaces; they have to follow before the ladder is coherent.
