---
"@qeetrix/ui": patch
---

**Fixed: `RichTextEditor` called the wrong `onChange`, and called it once before the user had done
anything.** Two independent defects in how the editor reports changes, both found while giving it a
form value to submit.

- **The callback was frozen at the first render.** Tiptap binds its `update` listener once, in the
  `Editor` constructor (`this.on("update", this.options.onUpdate)`), and `setOptions` never rebinds
  it. The handler closed over `onChange`, so an editor kept calling the *first* render's callback
  for its whole life — a consumer passing an inline arrow that reads current state saw stale state
  forever, with no error and no way to notice from inside the editor. The listener now reads the
  latest props through a ref.
- **Mounting reported a change.** `editor.setEditable()` emits an `update` unless told not to, and
  it was called unconditionally in an effect, so an uncontrolled editor fired `onChange` once with
  its own initial value before the first interaction. A consumer marking a form dirty on change was
  dirty from the first paint. It is now called only when `editable` actually differs, and with the
  emit suppressed — the toolbar tracks `transaction`, not `update`, so nothing else depended on it.

Also documented rather than changed: a controlled `RichTextEditor` is **the library's one exception
to controlled authority**. Every other controlled component in the package refuses to move when its
parent ignores the callback; this one keeps the user's text on screen until `value` itself changes,
because reverting a contenteditable on every keystroke destroys the caret and the browser's undo
stack. `onChange` still reports every change, so the parent is never out of date — it is authority
over *display* that is deferred, not notification. There is now a test named for the exception, so
it is a decision rather than a surprise.

13 tests. The editing ones drive node commands (list, heading, quote) rather than mark commands: a
mark toggle on an empty selection only stores a pending mark and changes no document, so a test
built on `Bold` can pass while formatting is broken.
