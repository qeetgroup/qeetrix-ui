---
"@qeetrix/ui": minor
---

**Added: one Field/native-form contract for composite controls (`API-003`).** `Input` and
`Textarea` inherit the browser's form behaviour for free — the `<label for>` association, a `name`
that puts their value in the submitted `FormData`, constraint validation. A control assembled from
buttons, spans and a contenteditable inherits none of it, so each of them wired up whichever
subset its author remembered: `DatePicker` had `id` and nothing else, `OTPInput` hard-coded an
`aria-label` that a `Field` label could never override, `ColorPicker` took a required `value` and
no `name` at all, and `RichTextEditor` could not appear in a form.

The contract is now written down once, in `field.tsx`, and has three clauses.

- **(a) Association.** New exported hook `useFieldControl()` resolves the `id`,
  `aria-labelledby`, `aria-describedby`, `aria-errormessage` and `aria-invalid` a control should
  take from its enclosing `Field`. `FieldControl` was refactored onto it, so a native input and a
  composite go through the same resolution rather than two implementations that agree today.
  Explicit props still win: an `aria-label` suppresses the Field label, an explicit
  `aria-describedby` is merged with the description and error rather than replaced.
- **(b) Serialisation.** New exported `FieldHiddenInput` renders the canonical submitted value.
  `type="hidden"` on purpose: it is never a tab stop, never carries an accessible name, and is
  already skipped by `focusFirstInvalidControl`, so adding one cannot introduce a second focus
  stop or a duplicate name for the widget it belongs to. A disabled composite does not submit,
  exactly as a native one does not. `form` associates a value with a form it is not nested inside.
- **(c) Validation, only where it is real.** A hidden input is *barred from constraint validation*
  by the HTML standard. So `required` exists only on the two composites that own a real, focusable
  native input and can put it there — `OTPInput` (its digit boxes) and `ColorPicker` (its hex
  field) — where an empty or unparseable value genuinely blocks submission and `:invalid` matches.
  Everywhere else `required` is documented as advisory, or is absent, rather than being a hidden
  input with an attribute that silently never fires.

New optional props: `name` and `form` on `DatePicker`, `DateRangePicker`, `OTPInput`, `Rating`,
`RichTextEditor` and `Dropzone`; `required` on `OTPInput`, `ColorPicker` and `RichTextEditor`; `id`,
`aria-describedby` and `aria-invalid` on the composites that did not accept them. `ColorPicker`
gains `defaultValue`, and its `value`/`onChange` become optional — it was the one control in the
library with no uncontrolled mode.

Canonical serialised forms, chosen so a submitted value never depends on a locale or a timezone:

- `DatePicker` submits `yyyy-mm-dd` for the **local** calendar day, not `toISOString()`, which
  converts to UTC first and therefore posts the previous day for every user east of Greenwich.
- `DateRangePicker` submits both ends under the same name — `formData.getAll(name)` is
  `[from, to]`, the native multi-value idiom. An unset end submits as `""` rather than being
  dropped, so the pair is always two entries and position keeps its meaning.
- `OTPInput` submits the joined code as one value. The digit boxes are deliberately unnamed: a
  six-part code posted as six fields is not what any server asked for.
- `Dropzone` names its own `<input type="file">`, so the file-dialog path submits like a plain file
  input. Drag-and-drop does not: a `FileList` cannot be assembled from a *validated subset* without
  `DataTransfer`, which is not available everywhere, so a form that must submit dropped files
  should submit what `onDrop` handed it. Documented on the prop rather than half-implemented.

Two fixes fell out of the work. `Dropzone` cleared its file input immediately after validating,
which also cleared the file out of the `FormData` — that is why `name` was not implementable at
all; it now clears when the dialog *opens*, which keeps re-picking the same file a change event and
leaves the chosen file in place. `ColorPicker`'s `aria-invalid` no longer overwrites an enclosing
Field's invalid state with a flat `false`.

**Behaviour a consumer can see.** Inside a `Field`, these controls now take their accessible name
from the Field label, so a query written against the old built-in name (`"One-time code"`,
`"Rating: 3 of 5"`, `"Rich text editor"`) will not match — the value they displaced is carried by
`aria-valuetext` on `Rating` and by a named value element on the date pickers, so nothing is lost
to a screen reader. `DatePicker`/`DateRangePicker` wrap their trigger text in a `<span>`
(`data-slot="date-picker-value"`). `ColorPicker`'s hex input now carries a native `pattern`, so a
form containing an unparseable hex fails `checkValidity()` where it previously submitted.

51 tests in `field.test.tsx` drive the contract as a table across all six composites — Field
naming, description/error/invalid association, no added tab stop, serialisation with and without a
`name`, serialisation while disabled — plus the native-validation cases and a test asserting that a
hidden value contributes no constraint, which is what would fail if someone "fixed" clause (c) by
putting `required` on a hidden input. 30 further tests cover the per-component serialised forms.

Not covered: `LogoUploader` and `TagInput` are unchanged, and `A11Y-009`'s remaining item is only
half-closed — `RichTextEditor` now participates in a form, but the editing surface is a
contenteditable, so a `Field` label's `htmlFor` still cannot focus it by click. The same is true of
`OTPInput`'s group. Both are named by `aria-labelledby`, which is the association that assistive
technology reads.
