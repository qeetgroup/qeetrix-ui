---
"@qeetrix/ui": patch
---

**Overlays use the published stacking ladder instead of `z-50`.** The `--qx-z-*` tokens
described a 1000–2100 ladder that nothing referenced: every overlay sat at `z-50`, so nested
surfaces stacked by portal insertion order and any consumer stacking context could swallow one.
Dialog and AlertDialog now use `--qx-z-modal-backdrop` / `--qx-z-modal`, Sheet and Drawer
`--qx-z-drawer-backdrop` / `--qx-z-drawer`, FloatingWindow `--qx-z-fixed`, and Popover,
HoverCard, PreviewCard, DropdownMenu, ContextMenu, Menubar and NavigationMenu
`--qx-z-popover`.

Menus use the popover layer rather than `--qx-z-dropdown`, because the ladder places
`dropdown` (1000) *below* `modal` (1400) — and a menu inside a dialog is one of the most common
compositions there is. The ordering the mapping depends on (popover above modal, each surface
above its own backdrop) is now asserted in a test rather than assumed, together with a nested
dismissal test: Escape inside a dialog closes the popover it opened and returns focus to the
trigger, leaving the dialog open.

Not covered: Tooltip, Select, Combobox, Autocomplete, MentionInput and ActionBar were not part
of this change and still use `z-50`. Until they follow, a tooltip or select portalled from
inside a migrated dialog paints *behind* it — the ladder is only coherent once every portalled
surface is on it.
