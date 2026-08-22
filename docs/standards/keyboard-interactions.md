# Keyboard interactions

Every interactive component has a keyboard model, and it is the one its pattern calls for — not a
Qeetrix invention, and not every key on every component. A button that responded to arrow keys
would be worse than one that did not.

The keys a component handles are declared in
[`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts) and published
in the manifest, so the contract is inspectable rather than folklore.

---

## The keys, and what they mean

| Key | Meaning |
|:--|:--|
| `Tab` / `Shift+Tab` | Move between *widgets*. Never between items inside one widget. |
| `Enter` | Activate. On a menu item, a tab, a tree item: commit. |
| `Space` | Toggle. On a button: activate. On a checkbox, switch, radio: toggle. |
| `Escape` | Dismiss the innermost thing that can be dismissed. |
| `Arrow` keys | Move *within* a widget — along its orientation. |
| `Home` / `End` | First / last item in the widget. |
| `PageUp` / `PageDown` | Coarse movement — a month in a calendar, a page in a listbox. |
| Type-ahead | Jump to the item starting with the typed characters. |

**One tab stop per composite.** A tab set, a menu, a listbox and a tree are each *one* stop in the
page's tab order; arrows move inside. Tabbing through eleven tabs to reach the content after them
is the most common keyboard defect in a component library, and it is what the roving-tabindex and
active-descendant models exist to prevent. See
[focus-management.md](./focus-management.md).

---

## Per pattern

Verified in [`src/__tests__/accessibility/audit.test.tsx`](../../src/__tests__/accessibility/audit.test.tsx).

### Button · IconButton · CloseButton · Toggle

```text
Enter   activate
Space   activate
Tab     in, and out
```

Native `<button>`, so this comes from the platform. **Do not add key handling to a button.**
`disabled` removes it from the tab order and makes it inert — both inherited, neither
implemented.

### Checkbox · Switch · Radio

```text
Space   toggle
Tab     in, and out (radio: the group is one tab stop)
```

A radio group is one stop; arrows move between radios. `RadioCard` gets this from native inputs
sharing a `name`.

### Tabs — **manual activation**

```text
ArrowLeft / ArrowRight   move focus between tabs (inline axis — mirrors under rtl)
Home / End               first / last tab
Enter / Space            select the focused tab
Tab                      leave the tab list, into the panel
```

Qeetrix Tabs activate **manually**: arrows move focus without selecting, and Enter commits. That
is deliberate — automatic activation fires every intermediate panel's data fetch as a keyboard
user traverses the set. Documented here rather than changed.

### Accordion · Collapsible · Spoiler

```text
Enter / Space   toggle the section
Tab             between triggers, and into an open panel
```

A collapsed panel is **unmounted**, not hidden, so it is absent from the accessibility tree and
from Find-in-page — and `aria-controls` only exists while the panel does.

### DropdownMenu · ContextMenu · Menubar

```text
ArrowDown / ArrowUp   move between items (opens the menu from the trigger)
Home / End            first / last item
Enter / Space         activate the item
Escape                close, and return focus to the trigger
Type-ahead            jump to a matching item
```

Roving tabindex: exactly one item is in the tab order. Opening with the **pointer** deliberately
highlights nothing — a mouse user is about to click the item they want, and moving the roving stop
for them is a change they did not ask for. Opening with the **keyboard** highlights the first item.

### Listbox · Select · Combobox · Autocomplete

```text
ArrowDown / ArrowUp   move the active option
Home / End            first / last option
Enter                 commit
Escape                close (combobox: revert the typed value)
Type-ahead            jump to a matching option
```

`Listbox` uses `aria-activedescendant`: the container keeps DOM focus and names the active option,
so the visual highlight and the announced option cannot drift apart.

### TreeView

```text
ArrowDown / ArrowUp      move between visible items
ArrowRight               expand, or move to the first child
ArrowLeft                collapse, or move to the parent
Home / End               first / last visible item
Enter                    activate
```

Under `rtl`, expand/collapse follow the inline axis: ArrowLeft expands.

### Dialog · AlertDialog · Drawer · Sheet

```text
Tab / Shift+Tab   cycle within the dialog — focus does not leave
Escape            close, and return focus to the trigger
```

### Popover · HoverCard

```text
Tab      into and *out of* the content — a non-modal overlay does not trap
Escape   close, and return focus to the trigger
```

### Tooltip

```text
Tab      focusing the trigger reveals it
Escape   dismiss while keeping focus on the trigger
```

Focus alone must reveal a tooltip. A hover-only tooltip does not exist for a keyboard user.

### Slider · AngleSlider

```text
ArrowUp / ArrowRight     increase by one step
ArrowDown / ArrowLeft    decrease by one step
Home / End               minimum / maximum
PageUp / PageDown        coarse step
```

Under `rtl` the *inline* arrows swap; ArrowUp still increases. Vertical semantics do not mirror.

### Calendar · DatePicker

```text
Arrow keys            move by day (inline axis mirrors) and week
Home / End            start / end of week
PageUp / PageDown     previous / next month
Enter                 select
Escape                close the picker
```

---

## Adding a keyboard model

1. **Find the pattern.** The [APG](https://www.w3.org/WAI/ARIA/apg/patterns/) names the keys. Do
   not design a keyboard model.
2. **Check Base UI first.** If it has the primitive, it has the keyboard model, and hand-rolling
   one is how the two drift apart.
3. **Handle only the applicable keys.** Every extra key is a key that shadows something the user
   expects — the browser's, the AT's, or the OS's.
4. **Never intercept `Tab`** except to contain focus in a modal. Anything else strands the user.
5. **`preventDefault()` only when handling the key.** A swallowed unhandled key is a bug you will
   never hear about.
6. **Declare it** in the registry, and **test it** with `user-event` — not `fireEvent`, which
   skips the browser's event sequence.
7. **Test the RTL case** if the component uses inline-axis arrows, with `DirectionProvider`.
