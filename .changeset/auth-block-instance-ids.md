---
"@qeetrix/ui": patch
---

**Fixed: the Auth block's forms used fixed element IDs (`ID-001`).** `LoginForm`, `SignupForm` and
`ForgotPasswordForm` hard-coded `id="email"`, `id="password"`, `id="name"` and friends, so two
forms on one page — a sign-in and a sign-up side by side, or a form rendered twice in a test —
produced duplicate document IDs. A `<label for="email">` resolves to the *first* match, so
clicking the second form's label focused the first form's field.

IDs are now derived from `useId()`. The `name` attributes are untouched: they are the form's
serialisation contract and what `onSubmit` reads.

6 tests, asserting that two rendered instances have disjoint IDs and that each label resolves to a
control inside its own `<form>`.
