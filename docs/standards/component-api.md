# Component API

The conventions every Qeetrix component follows. They exist so a developer who has used one
component can predict the next one — which is most of what a design system is for.

These are descriptive as well as prescriptive: each one is already the majority pattern in the
library. Where a component departs, that is a documented exception, not a precedent — recorded in
[`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts) and enforced by
`bun run check:contract`.

New component? Work through [component-checklist.md](./component-checklist.md).

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

### Three axes, three meanings

```text
variant   what the component looks like       variant="destructive"
size      how large or dense it is            size="sm"
state     what it is currently doing          disabled  loading  selected
```

These are not interchangeable, and the validator enforces the distinction: a variant named after
an interaction state fails `check:contract`.

```tsx
<Button variant="disabled" />   // wrong — that is a state
<Button disabled />             // right
```

### Variant vocabulary

One tone, one name, across the whole library:

```text
default · primary · brand · secondary · tertiary · outline · ghost · link
destructive · muted · info · success · warning
```

`primary` is the solid Qeet action fill; `brand` is the quiet Qeet tint (brand-subtle surface,
brand text, brand edge) — Badge, Timeline and the selected Chip use it. They are different tones,
not synonyms.

`destructive` is the name for the dangerous/error tone. The library previously had three names
for it — `destructive` (Button, Badge, Link, DropdownMenu), `danger` (Alert, Banner) and `error`
(Callout, Notification) — which meant you had to look up which one a component wanted.

`destructive` won: it is the most used, and it is what the bridge variable is called. The other
two **still work** on the four components that had them, declared as aliases:

```ts
// src/manifests/component-registry.ts
alert: { api: { variantAliases: { danger: "destructive" } } },
```

New code should use `destructive`. Nothing was removed. `TimelineTone` follows the same rule:
`destructive`, with `danger` accepted as a deprecated alias.

A component whose variants are domain concepts rather than tones — `Typography`'s are element
names, `Container`'s sizes are content widths — declares that instead:

```ts
typography: { api: { domainAxes: ["variant"] } },
```

### The size scale

```text
xs · sm · default · md · lg · xl
icon · icon-xs · icon-sm · icon-lg
```

`default` is the density-aware size — it resolves its height from
`--qx-density-control-height`, so `DensityProvider` can compact it. Explicit sizes deliberately
override density.

**`default` versus `md`.** Both name the middle of the scale, and the difference is real:

- **`default`** — the size is *density-resolved*. `Button`, `Input`, `Select`, `Sidebar` and
  `Toggle` read their height from `--qx-control-height`, so `default` means "whatever density
  says". See [density.md](./density.md).
- **`md`** — a fixed middle step. `Chip`, `Blockquote`, `Progress`, `Meter`, `ProgressCircle`,
  `SegmentedControl` and friends do not participate in density, so their scale is plainly
  `sm | md | lg`.

A component may not declare **both**; `check:contract` rejects it, because a consumer would have
to guess. (`Spinner` is the one component using `default` without density — it predates the
distinction and is left alone rather than renamed.)

Layout components legitimately size on a different axis; they declare
`api: { domainAxes: ["size"] }`.

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

### Use the shared hook

[`useControllableState`](../../src/hooks/use-controllable-state.ts) is the one implementation of
this contract. Twelve components had hand-rolled it identically; the logic is now in one place.

```tsx
const [value, setValue] = useControllableState({
  value,                     // undefined → uncontrolled
  defaultValue,              // seeds internal state; a function is called once
  onChange: onValueChange,   // fires in both modes, with the *intended* value
});

setValue("next");                        // direct
setValue((previous) => previous + 1);     // functional, correct in both modes
```

Exactly one rule decides the mode: **`value !== undefined` is controlled.** `null`, `""`, `0` and
`false` are values — only `undefined` means "not controlled". In controlled mode the hook never
writes internal state, so a parent that ignores the callback sees no change, which is what makes
a controlled component actually controlled.

Base UI already implements this contract for the primitives it provides, so a Base UI-backed
component (Dialog, Tabs, Checkbox, Select, DropdownMenu) needs nothing extra — it forwards
`Root.Props`.

### Declare the triple

Controlled state is part of the contract, so it is declared and validated:

```ts
tabs: { api: { controlled: [{ value: "value", default: "defaultValue", change: "onValueChange" }] } },
```

`check:contract` verifies the shape — `x` / `default<X>` / `on<X>Change` — so a component cannot
ship `open` seeded by `initialOpen`.

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

## Composition

Prefer composition over configuration. A component that grows `showHeader` / `headerTitle` /
`footerActions` props is a component that will grow ten more.

```tsx
// Right — the consumer arranges the parts.
<Card>
  <CardHeader><CardTitle>Billing</CardTitle></CardHeader>
  <CardContent>…</CardContent>
  <CardFooter><Button>Save</Button></CardFooter>
</Card>

// Wrong — every new arrangement needs a new prop.
<Card headerTitle="Billing" footerActions={<Button />} showFooter />
```

### Compound naming

Qeetrix exports compound parts as **flat, prefixed names**, not as properties on the root:

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "@qeetrix/ui";
```

not `Dialog.Trigger`. This is deliberate and library-wide: flat named exports tree-shake, and a
dot-namespace object does not. Every compound component follows it — `Tabs`/`TabsList`/
`TabsTrigger`/`TabsContent`, `Card`/`CardHeader`/`CardContent`/`CardFooter`,
`Select`/`SelectTrigger`/`SelectContent`/`SelectItem`. Do not introduce a second style.

The part names follow the underlying pattern's vocabulary: a dialog has a `Trigger`, `Content`,
`Title`, `Description`, `Footer` and `Close` because those are the parts the APG dialog pattern
names.

### Parts and `data-slot`

Every part carries a `data-slot` attribute naming it:

```tsx
<div data-slot="card-header" />
```

`data-slot` is the **public styling and testing surface**. It is what lets a consumer reach a
part without exported class names, and what lets a test find one without a test id. Treat a
`data-slot` value like a prop name: renaming or removing one is a breaking change
([versioning.md](../governance/versioning.md)).

Add a slot for a part a consumer would plausibly need to target. Do not add one for every
`<div>` — an implementation detail exposed as a slot becomes an implementation detail you cannot
change.

---

## Polymorphism

**One mechanism: Base UI's `render` prop.** Not `as`, not `asChild`, not a polymorphic generic.

```tsx
<DialogClose render={<Button variant="ghost" size="icon-sm" />} />
<TooltipTrigger render={<IconButton icon={InfoIcon} aria-label="About" />} />
```

`render` composes props explicitly and type-checks. `asChild` clones a child and merges props by
convention, which fails silently when the child does not forward what it was given; a polymorphic
`as` prop makes every component generic over its element type, which makes every error message
worse.

Components that do not wrap a Base UI part and genuinely need to change element expose a narrow,
explicit prop instead — `Typography`'s `variant` selects the element. (`Link` renders an `<a>`
by default and takes `render` to compose a router link, like the Base UI parts.)
Do not add a general-purpose escape hatch to a component that does not need one.

---

## Prop order

Declare props in this order. It is a readability convention for the *type*, not a runtime
concern, and it exists so a reader finds what they are looking for in the same place every time:

```tsx
type ThingProps = React.ComponentProps<"div"> & {
  // 1. content
  children?: React.ReactNode;
  label?: string;
  // 2. value / state
  value?: string;
  defaultValue?: string;
  open?: boolean;
  // 3. appearance
  variant?: "default" | "destructive";
  size?: "sm" | "default" | "lg";
  // 4. behaviour
  disabled?: boolean;
  loading?: boolean;
  multiple?: boolean;
  // 5. callbacks
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
};
```

Native and DOM props come last, by extension rather than enumeration. Do not reformat existing
components for this alone.

---

## Types

Every component exports a `<Name>Props` type. A consumer writing a wrapper should not have to
import from `@base-ui/react` to type it:

```tsx
import type { ButtonProps } from "@qeetrix/ui";

function SubmitButton(props: ButtonProps) {
  return <Button type="submit" {...props} />;
}
```

For a component that adds nothing to its primitive, the type is a named alias — that is the
point:

```ts
type TabsProps = TabsPrimitive.Root.Props;
```

Export the props type and nothing else. Internal context values, discriminated unions used for
implementation and helper generics stay unexported; once a type is public, changing it is a
semver event.

The declared props of every exported `*Props` type are snapshotted in
[`src/__tests__/public-props.json`](../../src/__tests__/public-props.json), so a removed or
renamed prop fails `check:exports` — the export list alone cannot see that, since `ButtonProps`
is still exported either way.

---

## Native props

A component wrapping a native element accepts that element's props, by extension:

```ts
type InputProps = React.ComponentProps<"input">;
```

That means `name`, `form`, `autoComplete`, `autoFocus`, `id`, `title`, every `aria-*` and every
`data-*` work without the component knowing about them. **Never enumerate an allow-list** — the
next consumer will need the one attribute you left out, and stripping a consumer's `data-*`
breaks their analytics and their tests.

Spread `{...props}` last so a consumer can override, and never intercept a native handler
without calling the one you were given.

---

## Styling

The public styling API is exactly two props, plus the slot attributes:

| Surface | Purpose |
|:--|:--|
| `className` | merged through `cn()` — a consumer's class always wins |
| `style` | passed through untouched |
| `data-slot` | target a part from CSS or a test |
| `--qx-component-*` | override a component token, scoped or globally |

That is the whole list. No `classes`, no `styles`, no `slotProps`, no `sx`, no `css`. Four
parallel styling APIs is how a design system becomes impossible to restyle.

For anything beyond a one-off, override the component token rather than the class — it survives
a refactor of the internals:

```css
:root { --qx-component-card-corner: var(--radius-2xl); }
```

See [tokens.md](./tokens.md) § Component tokens.

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
  `bun run check:a11y`, at 137/137.

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

Every string a component puts in front of a user lives in the message catalogue,
[`src/lib/messages.ts`](../../src/lib/messages.ts), under the component's group, with a JSDoc line
and an English default. A component resolves its group with `useMessages(group, defaults,
messages)` and takes a `messages?: MessagesFor<"group">` prop, so a string can be replaced per
instance, or for the whole application through `MessagesProvider`; a dedicated prop that already
names a string (`placeholder`, `emptyMessage`, `toolbarLabel`, `detailTitle`) keeps winning over
both. Interpolation is a function of its parts, never a template string. The library never takes
an `i18n` instance.

A **server-safe** component (no `"use client"`) cannot read the provider without becoming a
client boundary. It resolves its catalogue group against its own `messages` prop with the
framework-free `resolveMessages`, so its defaults still live in the catalogue and an `undefined`
override still falls back, but `MessagesProvider` does not reach it.

No module keeps a local `*Messages` object of its own: a string that is not in the catalogue
cannot be enumerated for a translator.

---

## Adding a component

The full checklist is in [CONTRIBUTING.md](../../CONTRIBUTING.md). In contract terms:

1. Declare its `status` in the registry — new components start at `experimental` or `beta`, not
   `stable`. See [component-status.md](../governance/component-status.md).
2. Declare its `accessibility` — the APG pattern it implements, or `"none"` with a reason.
3. Everything else (capabilities, states, variants, test coverage) is derived. Do not declare
   what the generator can observe.
4. Re-snapshot the public API, raise the version, and add the changelog entry.
