# Deprecation policy

Removing something is easy. Removing something without breaking five products is the part that
needs a policy.

---

## The lifecycle

```text
stable
  ↓   a replacement exists, and the old shape is no longer the one we would choose
deprecated
  ↓   the replacement has shipped and had time to be adopted
removal announced
  ↓   a removal version is set
major release
  ↓
removed
```

Each arrow is a decision, not a timer. Nothing advances because time passed.

---

## What a deprecation must carry

Declared in [`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts)
and published in the manifest:

```ts
"pagination-bar": {
  status: "deprecated",
  deprecation: {
    since: "1.0.0",
    reason: "Renamed to Pagination when the pagination API was consolidated in 1.0.0.",
    replacement: "Pagination",
    migration:
      'Import { Pagination } from "@qeetrix/ui" and rename PaginationBarProps to PaginationProps.',
    removeIn: null,
  },
},
```

| Field | Required | Notes |
|:--|:--|:--|
| `since` | yes | The version the deprecation was announced in. |
| `reason` | yes | One sentence. Why, not what. |
| `replacement` | decision | The component to use instead, or `null` when there genuinely is none. |
| `migration` | decision | One line of guidance, or a link. `null` when the replacement is a drop-in. |
| `removeIn` | decision | `null` until a removal is actually announced. |

"Decision" means the field must be present and may be `null` — an explicit "there is no
replacement" is information. A missing field is not.

`bun run check:contract` fails on a deprecated component with no reason or no `since`, and on a
deprecation record attached to a component that is not deprecated.

---

## `removeIn` stays `null` until it is real

Do **not** invent a removal version. `removeIn: null` means "no removal is scheduled", which is
the honest state for almost every deprecation. A date in that field that nobody has agreed to
is worse than an empty one: consumers plan around it, and then it slips.

Set it when a specific major is actually being planned, and announce it in the changelog at the
same time.

`pagination-bar` is the current example. Its source comment says "Removed in 1.0.0" — it was
not, and it still ships at 1.0.3. The registry records `removeIn: null`, which is what is
actually true.

---

## Keeping a deprecated thing reachable

The mechanism is `@barrel-exclude`. A file marked with it stays compiled and published, but is
deliberately absent from the category barrel and therefore from `@qeetrix/ui`:

```tsx
// @deprecated — use Pagination and PaginationProps.
// @barrel-exclude — deliberately absent from the category barrel and the root
// export, so it stays reachable only via @qeetrix/ui/components/pagination-bar.
export type { PaginationProps as PaginationBarProps } from "./pagination";
export { Pagination as PaginationBar } from "./pagination";
```

The effect: existing deep imports keep working, and the deprecated name stops appearing in
autocomplete for anyone importing from the root. `bun run check:exports` enforces both halves —
the module must not leak its own names into the public surface, and the components that *are*
barrel-exported must all be reachable.

---

## Deprecating a prop rather than a component

Same lifecycle, smaller surface:

1. Add the replacement prop. Keep the old one working.
2. Mark the old one `@deprecated` in its JSDoc, with the replacement named — this is what a
   consumer sees in their editor, which is where it does the most good.
3. Accept both for at least one minor. If they conflict, the new one wins and the old one is
   ignored, not merged.
4. Remove the old prop in a major.

Removing a public prop is a **major** even when it looks unused. See
[versioning.md](./versioning.md).

---

## Removal checklist

When a removal is actually happening:

- [ ] the replacement has shipped in a released version, and been available for at least one
      minor
- [ ] `deprecation.replacement` and `deprecation.migration` are filled in
- [ ] `deprecation.removeIn` names the major, and the changelog says so
- [ ] the consuming Qeet products have been migrated (`qeet-id-console`, `qeet-id-login`,
      `qeet-id-website`, `qeet-docs` at minimum)
- [ ] the removal ships in a **major** version, with the migration path in its changelog entry
- [ ] `bun run check:exports -- --update` re-snapshots the surface in the same commit

---

## What is not a deprecation

- **A visual change.** Restyling a component is not deprecating it. See
  [versioning.md](./versioning.md).
- **An internal rewrite.** Replacing a component's internals while keeping its API and its
  accessibility behaviour is a patch or a minor, and needs no deprecation.
- **Moving a component between categories.** The published import path is flat and generated, so
  a move is invisible. `bun run verify` proves the surface is unchanged.
