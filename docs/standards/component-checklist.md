# Component checklist

Work through this when adding a component, or when standardising an existing one. Skip anything
that genuinely does not apply — a `Separator` has no controlled state and no variants, and
inventing them to tick a box is the failure mode this list is meant to prevent.

The canonical rules live in [component-api.md](./component-api.md); this is the order to do
things in.

---

## Design

- [ ] **Purpose** is one sentence. If it takes two, it is probably two components.
- [ ] **Not already covered.** Check [`component-manifest.json`](../../component-manifest.json) —
      145 components is enough that the thing may exist under another name.
- [ ] **Category** chosen from the ten families, and added to
      [`scripts/config/category-map.json`](../../scripts/config/category-map.json).
- [ ] **Anatomy** decided: which parts exist, and which of them a consumer would target.

## API

- [ ] **Props extend the native element** (`React.ComponentProps<"div">`) or the Base UI part
      (`DialogPrimitive.Root.Props`). No enumerated allow-list.
- [ ] **`<Name>Props` is exported**, and nothing else from the type layer.
- [ ] **Variants** come from the shared vocabulary, or the component declares
      `api.domainAxes: ["variant"]`. No variant named after a state.
- [ ] **Sizes** come from the size scale — `default` if density-resolved, `md` if a fixed scale,
      never both.
- [ ] **Boolean props** are `disabled` / `loading` / `required` / `invalid` / `readOnly` /
      `open` — not `isDisabled` or `hasError`.
- [ ] **Controlled state**, where the consumer could plausibly own it, is the triple
      `x` / `default<X>` / `on<X>Change`, implemented with
      [`useControllableState`](../../src/hooks/use-controllable-state.ts) or inherited from
      Base UI.
- [ ] **Callbacks** receive the new value, not an event (`onValueChange(value)`), unless the
      component is a thin wrapper over a native input.
- [ ] **`{...props}` is spread last**, so a consumer can always override.
- [ ] **Prop order** follows content → value → appearance → behaviour → callbacks.

## Implementation

- [ ] **A plain function component.** No `forwardRef` — `ref` is a prop in React 19.
- [ ] **`data-slot` on every part**, named for the part.
- [ ] **`cva` + `cn()`** for variants, so the variant surface is statically readable.
- [ ] **Tokens only.** No raw colour, length, z-index or shadow —
      [tokens.md](./tokens.md) § Raw values.
- [ ] **Logical properties** (`ps-`, `pe-`, `start-`, `text-start`) — [rtl.md](./rtl.md).
- [ ] **`"use client"` first**, if it uses hooks, state or browser APIs.
- [ ] **Composition, not configuration.** Parts over `showHeader`-style props.
- [ ] **`render`** if it needs to change element — not `as`, not `asChild`.

## Contract

- [ ] **Registry entry** in
      [`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts):
  - [ ] `status` — `experimental` or `beta` for something new, not `stable`
        ([component-status.md](../governance/component-status.md))
  - [ ] `accessibility` — the APG pattern it implements, or `"none"` with `required` set honestly
  - [ ] `api.controlled` — the triples it supports
  - [ ] `api.variantAliases` / `api.domainAxes` — only if it needs them
- [ ] **`bun run build:manifest`** to regenerate the catalogue.
- [ ] Nothing invented. A capability that has not been reviewed stays `unknown`; the
      contract-coverage ratchet exists so that is visible rather than quietly assumed.

## Tests

- [ ] **Renders** and exposes its `data-slot`.
- [ ] **`axe`** passes ([`check:a11y`](../../scripts/check/a11y-coverage.mjs) requires it).
- [ ] **Each variant and size** applies its distinguishing class.
- [ ] **Controlled**: the prop stays authoritative when the parent ignores the callback.
- [ ] **Uncontrolled**: `defaultValue` seeds it and the component owns it afterwards.
- [ ] **Callbacks** fire with the new value.
- [ ] **Forwarding**: `className`, `style`, `id`, `data-*` and `aria-*` survive.
- [ ] **`ref`** reaches the expected element.
- [ ] **Disabled / loading** behave, where applicable.

## Ship

- [ ] **Export it** from the category `index.ts`.
- [ ] **`bun run verify`** — it names anything missed.
- [ ] **`bun run check:exports -- --update`** to re-snapshot the export list and the declared
      props, in the same commit.
- [ ] **`bun run changeset`** — a new component is a minor
      ([versioning.md](../governance/versioning.md)).
