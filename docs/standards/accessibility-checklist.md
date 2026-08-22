# Accessibility checklist

Work through this when auditing a component. Skip what does not apply — a `Separator` has no
keyboard model, and claiming one would make the audit numbers meaningless.

Record the result in `accessibility.dimensions` in
[`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts). **A dimension
may only be marked `pass` if a test covers it.** `partial` and `exception` must carry a reason in
`accessibility.exceptions`, or `bun run check:a11y` fails.

Rules: [accessibility.md](./accessibility.md) ·
[keyboard-interactions.md](./keyboard-interactions.md) ·
[focus-management.md](./focus-management.md)

---

## Semantic

- [ ] Uses the **native element** where one fits — `<button>`, `<input>`, `<a href>`, `<table>`.
- [ ] Uses the **Base UI primitive** where the pattern is a composite widget.
- [ ] The role matches the real interaction model, not the visual appearance.
- [ ] The APG pattern is recorded as `accessibility.pattern`, or `"none"` deliberately.
- [ ] No ARIA restating what the platform already says.
- [ ] Every `aria-controls` / `aria-labelledby` / `aria-describedby` resolves to an element that
      exists — `expectAriaRelationship` asserts this.

## Accessible name

- [ ] Every control that needs a name has one.
- [ ] The name comes from visible text or a real label wherever possible.
- [ ] Icon-only controls have a name the **type** enforces, not a review.
- [ ] Decorative icons carry `aria-hidden`.
- [ ] A tooltip is a description, never the only name.

## State

- [ ] `aria-expanded` / `aria-selected` / `aria-checked` / `aria-pressed` reflect real state, and
      change when it does.
- [ ] Indeterminate is `mixed`, not a third boolean.
- [ ] `aria-invalid` and `aria-errormessage` are set when invalid, and the error resolves.
- [ ] `disabled` removes the control from the tab order; `readOnly` does not.
- [ ] A loading control keeps its visible label and does not silently become a spinner.

## Keyboard

- [ ] The keys the pattern calls for — and no others.
- [ ] Declared as `accessibility.keyboard`.
- [ ] A composite widget is **one tab stop**; arrows move inside it.
- [ ] `Escape` dismisses, where there is something to dismiss.
- [ ] `preventDefault()` only on keys actually handled.
- [ ] Tested with `user-event`, not `fireEvent`.

## Focus

- [ ] The model is declared: `none` · `sequential` · `roving` · `active-descendant`.
- [ ] Focus enters correctly when the component opens.
- [ ] Containment matches modality — modal contains, non-modal does not.
- [ ] Focus returns to the trigger on close, **and survives the trigger unmounting**.
- [ ] The focus ring is visible, uses `:focus-visible`, and comes from the focus tokens.
- [ ] A focused control is not hidden behind sticky or fixed chrome.

## Screen reader

- [ ] The role, name, description and state are all what a user would need.
- [ ] Live regions only where an update genuinely needs announcing, at the right politeness.
- [ ] Nothing announces on every render.
- [ ] Ids come from `useId()`, so relationships survive hydration.

## Environment

- [ ] **RTL** — behaviour, not just layout, tested with `DirectionProvider` if the component uses
      inline-axis arrows.
- [ ] **Reduced motion** — covered by the base rule for CSS motion; scripted motion needs
      `usePrefersReducedMotion`.
- [ ] **Forced colors** — paints only with bridge variables; no shadow-only affordance.
- [ ] **Contrast** — any new semantic pair added to `scripts/check/contrast.mjs`.
- [ ] **Target size** — adequate for the context, or the rationale recorded.

## Tests

- [ ] `axe` — the floor, not the goal.
- [ ] Semantic assertions: element, role, state.
- [ ] Keyboard assertions for every declared key.
- [ ] Focus assertions: open · interact · close · restore.
- [ ] A regression test for **every defect found**.

## Record it

- [ ] `accessibility.dimensions` updated, honestly.
- [ ] `accessibility.keyboard`, `focus`, `liveRegion` declared where applicable.
- [ ] Reasons recorded for anything `partial` or `exception`.
- [ ] `bun run build:manifest && bun run check:a11y` — the roll-up is computed, so check the
      number it produces.
- [ ] Baseline raised in `scripts/config/contract-coverage-baseline.json` if the audited count
      went up.
