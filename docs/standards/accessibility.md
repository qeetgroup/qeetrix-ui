# Accessibility

The baseline is **WCAG 2.2 AA**. WCAG 3 is a working draft and is not a conformance target.

Accessibility here is not "axe is green". Axe checks part of the semantic layer and nothing at
all about keyboard behaviour, focus movement, or what a screen reader is actually told. All 137
components pass axe; **18 are audited**. Those are different claims, and the library reports both:
`bun run test` runs every component's axe check, and `component-manifest.json` carries the audit
roll-up (`accessibilityAudit`). The `check:a11y` gate that also verified each `pass` against a test
was removed in 01dce7a — see [accessibility-evidence.md](../governance/accessibility-evidence.md).

---

## What an audit covers

Nine dimensions, tracked per component in
[`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts) and published
in [`component-manifest.json`](../../component-manifest.json):

| Dimension | Question |
|:--|:--|
| `semantic` | Right element or role, and a correct ARIA state model |
| `name` | Every control that needs an accessible name has one, from an appropriate source |
| `keyboard` | The keys the pattern calls for — and no others |
| `focus` | Entry, movement, containment, visibility, restoration |
| `screenReader` | What AT is told, including live announcements |
| `rtl` | Behaviour under `dir="rtl"`, not just mirrored layout |
| `reducedMotion` | Motion degrades under `prefers-reduced-motion` |
| `forcedColors` | Legible and operable under `forced-colors: active` |
| `contrast` | Text, focus and non-text contrast hold at AA |

Each is `pass` · `partial` · `exception` · `not-applicable` · `not-audited`.

**The roll-up is computed, never declared.** There is no field that means "accessible: true". A
component is `audited` only when every applicable dimension resolves, and `pass` is only recorded
when a test asserts it — in the component's own suite.

`partial` and `exception` **must** carry a reason in `accessibility.exceptions` (held in review
since the a11y check was removed). An undocumented exception is a defect wearing a label.

---

## The platform first

In order of preference:

1. **Native HTML.** `<button>`, `<input>`, `<a href>`, `<label>`, `<table>`, `<nav>`. A native
   button gets Enter, Space, focus, disabled and form association for free, and gets them right
   in every browser and AT combination.
2. **Base UI.** For composite widgets — menu, listbox, combobox, dialog, tabs, tree — Base UI
   implements the APG pattern, including the keyboard model and focus management. Use it.
3. **ARIA.** Only when neither of the above covers the requirement.

`<div role="button">` is not an acceptable substitute for `<button>`. `RadioCard` is the model to
copy: native `<input type="radio">` elements sharing a `name`, which gives arrow-key roving focus
from the browser with no JavaScript at all.

### ARIA rules

- A role brings obligations. Adding `role="listbox"` means committing to the listbox keyboard
  model, its focus model and its state attributes — all of them.
- Never add `aria-expanded`, `aria-selected`, `aria-checked` or `aria-pressed` because a
  component *looks* like it has that state. The attribute must describe the real interaction.
- Do not restate what the platform already says. A `<button disabled>` needs no
  `aria-disabled`.
- A relationship must resolve. `aria-controls` pointing at an unmounted panel is worse than no
  `aria-controls` — which is why Accordion and Tabs only set it while the panel exists.

---

## Accessible names

Every control that needs a name has one, from the most robust source available:

```text
visible text          →  <Button>Save</Button>
native label          →  <FieldLabel> + <FieldControl>
aria-labelledby       →  Dialog, named by its DialogTitle
aria-label            →  icon-only controls, last resort
```

Prefer a visible label. `aria-label` is invisible to sighted users, untranslated by page
translation tools, and silently wrong when the visible text changes.

**Icon-only controls must have a name enforced by the type, not by review.** `IconButton`
requires a non-optional `"aria-label": string`; `CloseButton` ships a default. That is why the
library has zero unlabelled icon-only controls — it is not possible to write one.

Decorative icons carry `aria-hidden`. 117 were marked; the count is not allowed to
grow, because a bare `<svg>` is announced as a graphic by several AT combinations.

---

## Forms

`Field` owns the relationships. **`FieldControl` is what wires them** — it supplies the
`aria-labelledby`, `aria-describedby`, `aria-errormessage` and `aria-invalid` that tie a label,
a description and an error to the control:

```tsx
<Field invalid={hasError}>
  <FieldLabel>Email</FieldLabel>
  <FieldContent>
    <FieldControl render={<Input />} />
    <FieldDescription>We only use this to sign you in.</FieldDescription>
    {hasError ? <FieldError>Enter a valid address.</FieldError> : null}
  </FieldContent>
</Field>
```

> A bare `<Input />` inside a `<Field>` is **styled but unwired**. It renders correctly and has no
> label association at all. Always go through `FieldControl`.

Ids come from `React.useId()`, so they are stable across server and client and the relationships
survive hydration — covered by `src/__tests__/hydration.test.tsx` and asserted directly in the
audit tests.

**Errors announce once.** One `role="alert"` per field, referenced by both `aria-describedby` and
`aria-errormessage`. Do not add a second live region for the same message.

**`required` and `invalid`** map to the native attribute where one exists, and to
`aria-required` / `aria-invalid` where the control is a composite. Not both.

**Disabled versus read-only** are different states, not two shades of grey. A disabled control is
removed from the tab order and takes no input; a read-only control stays focusable so a keyboard
user can read and copy it.

---

## Overlays

Modality is not one behaviour:

| | Focus contained | Focus restored | Escape closes |
|:--|:--:|:--:|:--:|
| Dialog · AlertDialog · Drawer · Sheet | yes | yes | yes |
| DropdownMenu · ContextMenu · Menubar | yes | yes | yes |
| Popover · HoverCard | **no** | yes | yes |
| Tooltip | no | n/a | yes |

A non-modal popover that trapped focus would strand a keyboard user. See
[focus-management.md](./focus-management.md).

`AlertDialog` uses `role="alertdialog"`, not `role="dialog"` — the difference is what tells AT
that a response is required before continuing. Base UI's popup renders `dialog`; the Qeetrix
wrapper sets the correct role.

**Tooltips are never the only path to information.** A tooltip is an `aria-describedby`
supplement, reachable on focus as well as hover, and dismissible with Escape. Anything essential
belongs in the accessible name or visible text.

---

## Live regions

Announce sparingly. A live region that fires on every state change trains users to ignore it.

| Component | Politeness | Why |
|:--|:--|:--|
| `Alert`, `FieldError`, `Form` error summary | `assertive` | The user must know now |
| `Progress`, `Field`, `Spinner`, `PasswordStrengthMeter` | `polite` | Status, not an interruption |
| Everything else | none | Most state changes are visible where the user already is |

Do not force `role="alert"` onto every notification. A `Toast` confirming a save is `status`; a
`Toast` reporting a failed payment is `alert`.

---

## Motion, direction, forced colors

These are library-wide guarantees rather than per-component work. The test that verified them
(`src/__tests__/accessibility/environment.test.ts`) was removed in 01dce7a;
`token-governance.test.ts` still asserts that the host-global section of `styles.css` is exactly
the reviewed list:

- **Reduced motion** — one rule in `src/styles/index.css` collapses every CSS transition and
  animation to the reduced-motion token, document-wide. A component only needs its own handling
  when it drives motion from JavaScript. See [motion.md](./motion.md).
- **RTL** — logical properties mirror the layout; **behavioural** direction (which arrow key
  advances) comes from `DirectionProvider`. A bare `dir="rtl"` attribute mirrors the layout and
  leaves arrow keys running left-to-right. See [rtl.md](./rtl.md).
- **Forced colors** — every bridge colour variable is remapped to a system colour, shadows are
  removed, and focus falls back to a `Highlight` outline. A state carried by a fill behind a label
  (highlighted, selected, current, pressed) paints the system selection with
  `forced-colors-selected`; indicators take `Highlight` directly and selected containers a
  `Highlight` edge — the three recipes in [theming.md § Forced colors](./theming.md#forced-colors).
  The chart series are the one deliberate exemption: eight series mapped onto system colours
  would be eight identical lines, so they keep their authored colour under
  `forced-color-adjust: none`, and `ChartDataTable` is the non-colour alternative.

---

## Data visualisation

A chart is not made accessible by adding ARIA to SVG paths. `Chart` provides `ChartDataTable` —
a real `<table>` of the same data — and that is the accessible representation. The chart itself
carries a title and description; the table carries the data.

`DataTable` exposes sort state on the header (`aria-sort`), selection on the row checkboxes, and
keeps its action buttons keyboard-reachable. Virtualisation limits what can be reached by a
screen reader's virtual cursor at any moment; that limitation is real and recorded rather than
papered over.

---

## Testing

Four layers, because no single one is sufficient:

```text
axe            every component. Catches missing names, bad roles, broken relationships.
semantic       the right element, the right role, the right state attribute.
keyboard       the keys the pattern calls for, driven with user-event.
focus          entry, movement, containment, restoration.
```

Write them with `vitest-axe` (`axe`, `toHaveNoViolations`), Testing Library queries
(`getByRole(…, { name })`), `@testing-library/user-event` for keys, and jest-dom matchers
(`toHaveFocus`, `toHaveAccessibleName`). The house helpers that used to wrap these went with the
audit suites in 01dce7a, so a failure points straight at the component.

**Every accessibility defect found gets a regression test.** The `AlertDialog` role and the
un-remapped chart colours both have one.

### What jsdom cannot test

Recorded rather than pretended away:

- **`inert`** is not implemented, so focus *containment* cannot be observed. The tests assert the
  mechanism is installed (`inert` on the background, focus guards present) and browser-level
  containment sits on the manual checklist. This is why Dialog and AlertDialog are `partial`.
- **`forced-colors`** and **`prefers-reduced-motion`** cannot be evaluated, so those are asserted
  structurally against the stylesheet.
- **Real AT behaviour** cannot be simulated at all. The audit records what the markup promises.

---

## Adding or auditing a component

Work through [accessibility-checklist.md](./accessibility-checklist.md). The order matters: a
defect in a primitive reaches every composite built on it, so
`Button` → form controls → composite widgets → overlays → data-heavy → editors.
