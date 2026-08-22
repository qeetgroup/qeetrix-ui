# API guidelines

The conventions every Qeetrix component follows. They exist so a developer who has used one
component can predict the next one — which is most of what a design system is for.

These are descriptive as well as prescriptive: each one is already the majority pattern in the
library. Where a component departs, that is a documented exception, not a precedent.

---

## Component shape

Components are **plain function components**. There is no `React.forwardRef` anywhere in the
library and none should be added: React 19 passes `ref` as an ordinary prop, and the
`forwardRef` wrapper only obscures the signature.

```tsx
function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export type { ButtonProps };
export { Button, buttonVariants };
```

Rules:

- **Extend the underlying element's props.** `React.ComponentProps<"input">` for a native
  element, `DialogPrimitive.Root.Props` for a Base UI part. Never re-declare `className`,
  `children`, `id` or `aria-*`.
- **Spread the rest.** `{...props}` last, so a consumer can always reach the DOM.
- **Merge, never replace, `className`.** Always through `cn()`.
- **Every part carries `data-slot`.** It is the styling and testing hook consumers rely on, and
  it is how a compound component's parts are addressable without exported class names.
- **Export the type alongside the component**, named `<Component>Props`.

---

## Common props

Use these names and only these names for these meanings.

| Prop | Type | Meaning |
|:--|:--|:--|
| `variant` | union | Visual treatment. Never size, tone or state. |
| `size` | union | Control dimension. See the size scale below. |
| `disabled` | `boolean` | Not interactive, and communicated to assistive technology. |
| `loading` | `boolean` | Work in flight. Implies busy, not necessarily disabled. |
| `required` | `boolean` | The field must be filled for its form to submit. |
| `invalid` | `boolean` | The value failed validation. |
| `readOnly` | `boolean` | Value is shown and focusable but not editable. |

`invalid` maps to `aria-invalid`, `required` to `aria-required`, `disabled` to the native
attribute — the ARIA is part of the prop's contract, not an extra a consumer supplies.

**Do not** introduce `kind`, `appearance`, `style` or `type` as a synonym for `variant`, or
`scale`/`sizing` for `size`. The contract validator reports these as naming drift.

### The size scale

```text
xs · sm · default · md · lg · xl
icon · icon-xs · icon-sm · icon-lg
```

`default` is the density-aware size — it resolves its height from
`--qx-density-control-height`, so `DensityProvider` can compact it. Explicit sizes deliberately
override density.

The scale is a convergence target for **controls**. Layout components legitimately size on a
different axis (`Container` has `prose`/`content`/`wide`/`full`); `bun run check:contract
--verbose` reports those rather than failing them.

---

## Controlled and uncontrolled state

Every stateful component supports both. The pattern is a triple, named after the state:

```tsx
value       defaultValue       onValueChange
open        defaultOpen        onOpenChange
checked     defaultChecked     onCheckedChange
```

- Pass `value` (or `open`, `checked`) → controlled. The component never changes it itself.
- Pass `defaultValue` → uncontrolled. The component owns the state from that starting point.
- Pass neither → uncontrolled from a sensible default.
- Passing both is a bug. Do not silently prefer one.

Use the triple whenever a consumer might reasonably want to own the state — which is nearly
always for anything with a selection, an open/closed state, or a checked state.

Do **not** invent a triple for state a consumer cannot meaningfully own (a hover state, a
transient animation phase). Internal state stays internal.

---

## Event naming

| Callback | Fires with | Use when |
|:--|:--|:--|
| `onValueChange(value)` | the new value | The component's value changed — the default for a selection, a text value, a date, a set of tags. |
| `onOpenChange(open)` | the new boolean | An overlay or disclosure opened or closed. |
| `onCheckedChange(checked)` | the new boolean, or `"indeterminate"` | A checkbox-like control toggled. |
| `onChange(event)` | the DOM event | **Only** when the component is a thin wrapper over a native input and the consumer wants the event. Never invent it for a composite. |

The rule behind the table: **`on<Thing>Change` receives the new `<thing>`, not an event.** A
consumer should never have to reach into `event.target.value` to find out what a Qeetrix
component just did.

Two things this rule does not do:

- It does not force `onValueChange` onto components with different semantics. A component whose
  state is genuinely "open" uses `onOpenChange`; one whose state is "checked" uses
  `onCheckedChange`. Renaming those to `onValueChange` would be consistent and wrong.
- It does not replace native DOM handlers. `onClick`, `onKeyDown`, `onFocus` and friends pass
  through untouched, with their normal event signatures.

For anything other than a state change, name the event after what happened: `onSelect`,
`onDismiss`, `onReorder`, `onCopy`. Present tense, no `Change` suffix.

---

## Refs and imperative APIs

**DOM refs.** `ref` is an ordinary prop and reaches the component's root element. Because
components extend the underlying element's props and spread `{...props}`, this works without
anything being written for it — which is the point. Compound components expose a ref per part,
each on its own root.

Do not add `forwardRef`. Do not accept a ref under another name (`rootRef`, `innerRef`).

**Composition instead of cloning.** Base UI's `render` prop is how a component's markup is
replaced while keeping its behaviour:

```tsx
<DialogClose render={<Button variant="ghost" size="icon-sm" />} />
```

Prefer `render` over `asChild`-style cloning and over a polymorphic `as` prop. It composes
props explicitly rather than by convention, and it type-checks.

**Imperative handles.** Avoid them. A component that needs to be driven from outside usually
needs a controlled prop instead — an imperative `.open()` is a controlled `open` prop that
skipped the design step. Where an imperative API is genuinely the right shape (a timer, a
carousel's `scrollTo`), expose it as a **hook** returning the controls (`useTour`, `useTimer`,
`useCopyToClipboard`), not as a ref handle. A hook is testable, composable and does not fight
concurrent rendering.

---

## Accessibility

- Anything interactive is built on **Base UI**, which implements the WAI-ARIA APG patterns. Do
  not hand-roll a listbox.
- A component that claims an APG pattern records it in
  [`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts). That is a
  commitment: breaking the pattern is a breaking change (see
  [versioning.md](../governance/versioning.md)).
- Where a label is required and cannot be inferred, **enforce it in the type**. `IconButton`
  requires a non-optional `"aria-label": string`; copy that approach rather than documenting a
  requirement nobody reads.
- Every component ships an `axe` test in its category's `__tests__/`. This is checked by
  `bun run check:a11y`, at 145/145.

---

## Styling

- Every colour, shadow, radius, duration and z-index comes from a token. Raw values fail
  `bun run check:token-usage`; documented exceptions live in
  `scripts/config/raw-value-exemptions.json` with a reason.
- Variants are declared with `cva` and merged with `cn()`. The variant surface is read
  statically into the manifest, so `cva` is not merely a convention — it is what makes the API
  introspectable.
- Prefer **logical properties** (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`, `text-start`)
  over physical ones, so RTL mirrors without a second stylesheet. Physical properties are fine
  where they are direction-agnostic (`left-1/2` for centring) — the manifest records such
  components as `rtl: "unknown"` for review rather than failing them.
- Anything that animates should degrade under `prefers-reduced-motion`, via
  `usePrefersReducedMotion` or the `motion-reduce:` variant.

---

## Copy and localization

Component-internal copy is plain English. Localization belongs to the consuming product —
expose a prop, never a translation key. A component that needs five strings takes five props (or
one `labels` object); it does not take an `i18n` instance.

---

## Adding a component

The full checklist is in [CONTRIBUTING.md](../../CONTRIBUTING.md). In contract terms:

1. Declare its `status` in the registry — new components start at `experimental` or `beta`, not
   `stable`. See [component-status.md](../governance/component-status.md).
2. Declare its `accessibility` — the APG pattern it implements, or `"none"` with a reason.
3. Everything else (capabilities, states, variants, test coverage) is derived. Do not declare
   what the generator can observe.
4. Re-snapshot the public API and record a changeset.
