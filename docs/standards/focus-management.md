# Focus management

Focus is the keyboard user's cursor. Losing it, hiding it, or moving it unasked are three of the
most disabling defects a component library can ship — and none of them are visible to axe.

---

## The four models

Declared per component as `accessibility.focus.model`:

| Model | Behaviour | Used by |
|:--|:--|:--|
| `none` | One focusable element, or none | Button, Input, Checkbox, Switch, Tooltip |
| `sequential` | Several focusables, reached with Tab in DOM order | Dialog, Popover, Accordion |
| `roving` | One tab stop; arrows move `tabindex` between items | Tabs, DropdownMenu, TreeView |
| `active-descendant` | Container keeps focus, `aria-activedescendant` names the active item | Listbox, Combobox |

**Roving versus active-descendant** is a real choice, not a style. Roving moves real DOM focus, so
the browser scrolls the item into view and AT announces it — right for menus and tab lists.
Active-descendant keeps focus on a text input while a list moves beneath it — the only workable
model for a combobox, where the user is still typing.

Whichever is used, the visual highlight and the announced item must be the same item. Two sources
of truth for "which one is active" is how a listbox ends up highlighting one option and announcing
another.

---

## Entry

When an overlay opens, focus moves to the overlay — not to the page, and not nowhere.

| Opens | Focus lands on |
|:--|:--|
| Dialog, Drawer, Sheet | The first focusable inside, or the content container |
| AlertDialog | The safest action — Cancel, not Delete |
| DropdownMenu (keyboard) | The first item |
| DropdownMenu (pointer) | The menu container; **no item is highlighted** |
| Popover | The content, so Tab reaches what is inside |
| Tooltip | Nowhere — focus stays on the trigger |

Do not move focus when nothing opened. A component that steals focus on mount, on a value change,
or on a re-render will interrupt whatever the user was doing.

---

## Containment

Only modal overlays contain focus:

```text
contained: true    Dialog · AlertDialog · Drawer · Sheet · DropdownMenu · ContextMenu
contained: false   Popover · HoverCard · Tooltip · everything else
```

A non-modal popover that trapped focus would strand the user — they can see the rest of the page
and cannot reach it. This is why "does this overlay trap focus?" is a declared field rather than a
default.

Containment is enforced by Base UI with **`inert` on the rest of the document plus focus guards**,
not with `aria-modal`. `inert` removes the background from the tab order *and* from hit-testing,
which is stronger than an attribute AT may or may not honour.

`useFocusTrap` ([`src/runtime/focus-trap.ts`](../../src/runtime/focus-trap.ts)) exists for
overlay patterns that cannot use a Base UI primitive. It is the only focus trap in the library —
do not add a second.

---

## Restoration

When an overlay closes, focus returns to whatever opened it.

```text
restored: true     Dialog · AlertDialog · Drawer · Sheet · DropdownMenu · Popover
restored: false    Tooltip (focus never left)
```

**The trigger may not exist any more.** A menu item that deletes the row containing its own
trigger is a normal thing for a user to do. Restoration must not throw, and must not leave focus
on `<body>` — where the next Tab starts from the top of the document. This case has a regression
test: `Dialog > survives its trigger unmounting while open`.

Nested overlays unwind innermost-first. Escape in a dialog-inside-a-dialog closes the inner one
and returns focus to the inner trigger, not to the page.

---

## Visibility

Every focusable element has a visible focus indicator, from the Phase 2 focus tokens:

```text
--qx-focus-ring-width     3px
--qx-focus-outline-width  2px
--qx-focus-offset         2px
--qx-color-focus-ring     theme-varying (qeet.600 light, qeet.400 dark) — ≥3:1 on every surface,
                          held by src/__tests__/token-governance.test.ts
```

The indicator is **one recipe, three utilities**, defined once in `src/styles/index.css` so no
component carries its own ring:

| Utility | For | What it draws |
|:--|:--|:--|
| `focus-visible:focus-ring` | buttons, tabs, toggles, checkboxes, radios, switches, links, slider thumbs, interactive cards | a solid `--ring` outline, `--qx-focus-offset` away from the control |
| `focus-visible:focus-ring-inset` | items inside a clipping container — menu items, list options, table rows and cells, sidebar and tree items | the same outline, drawn inside the element |
| `focus-visible:focus-ring-field` | bordered text-entry controls | the border turns `--ring` and a 1px outline thickens it to 2px |

Outline, not `box-shadow`: forced-colors mode strips shadows, while the stylesheet's host-global section re-points
`:focus-visible` outlines at `Highlight`, so the same rule survives both. The offset puts the ring
against the *surrounding* surface rather than the control's own fill, which is why one colour
reaches 3:1 on a primary button and on a ghost button alike. The colour is a longhand, so an
invalid control overrides it with `aria-invalid:focus-visible:outline-destructive`.

The shadcn halo it replaces — `focus-visible:ring-3 focus-visible:ring-ring/disabled` — is about
1.9:1 against the page, borrows the *disabled* opacity token for an unrelated purpose, and
disappears entirely in forced-colors mode.

Rules:

- **Never remove an outline without replacing it.** `outline: none` with no ring is the single
  most common accessibility regression in a redesign.
- **`:focus-visible`, not `:focus`.** A ring on a mouse click is noise; a ring on Tab is
  essential. Base UI and the Qeetrix classes use `focus-visible:` throughout.
- **Hover styling is not focus styling.** A state that only appears on hover does not exist for a
  keyboard user.
- The ring survives forced-colors mode as a `Highlight` outline at the token's width — asserted in
  [`environment.test.ts`](../../src/__tests__/accessibility/environment.test.ts).

### Not obscured

A focused control must be visible, not behind a sticky header, a drawer or a toolbar (WCAG 2.2
§2.4.11). Components with fixed or sticky chrome — `AppShell`, `Sidebar`, `ActionBar`,
`Toolbar`, `Table` sticky headers — use the z-index ladder (`--qx-z-*`) so overlay order is
deliberate rather than a race between `z-50`s, and scroll focused items into view where they
manage their own scrolling.

---

## Testing focus

Helpers in [`src/__tests__/accessibility/index.ts`](../../src/__tests__/accessibility/index.ts):

```tsx
expectFocus(element);                 // holds focus now
await expectFocusRestored(trigger);   // came back, after the close animation
await tabThrough(6);                  // the element focused after each Tab
await pressEscape();
```

A complete overlay focus test is four steps: **open · interact · close · restore.**

```tsx
const trigger = screen.getByRole("button", { name: "Open dialog" });
await userEvent.click(trigger);
const dialog = await screen.findByRole("dialog");
await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
await pressEscape();
await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
await expectFocusRestored(trigger);
```

### What jsdom cannot test

**jsdom does not implement `inert`.** Tab will happily reach a control behind an open dialog in
jsdom, and will not in a browser. So containment is asserted as *mechanism* — `inert` applied to
the background, focus guards present — and the behaviour itself is on the manual checklist. Dialog
and AlertDialog are recorded as `focus: partial` for exactly this reason, with the limitation in
`accessibility.exceptions`.

That is the honest position. Marking them `pass` on the strength of a test that cannot fail in the
way that matters would be worse than recording the gap.
