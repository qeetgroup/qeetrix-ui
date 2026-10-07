# Variant axes

A **design axis** is a prop with a closed set of values that changes how a component looks or how
large it is: `variant`, `size`, `tone`. This document is about one narrow problem: telling *"this
component has no design axis"* apart from *"it has one and nobody wrote it down"*.

Held in review: the `check:contract` gate that enforced it was removed in 01dce7a. Vocabularies in
[`src/contracts/variants.ts`](../../src/contracts/variants.ts); declarations in
[`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts).

---

## The problem

The manifest reads a component's axes out of its `cva()` call, which is statically readable and
exact. Components that do not use `cva` record `null`:

```json
"api": { "variants": null, "sizes": null, "variantGroups": null }
```

135 of 145 components look like that. For most of them it is the truth — a `Separator` has no
variant axis. For 21 of them it was not: they declare a public `variant`, `size`, `kind`,
`severity` or `orientation` prop, style themselves without `cva`, and report `null` anyway.

A docs generator, an MCP tool or a consistency check reading that manifest cannot tell the two
apart. `Avatar` has three sizes; the manifest said it had none.

---

## The rule

`AXIS_PROP_NAMES` lists the prop names that *are* an axis. The rule reads each component's
public props from source — the exported `…Props` types **and** the inline props type on the
component's parameter, which is the dominant shape in this library — and every axis-shaped prop
there has to be recorded, one of four ways:

1. **`cva` members** — the canonical case. Already in `api.variants` / `api.sizes`.
2. **`api.domainAxes`** — the axis exists and its value names are domain concepts rather than the
   shared vocabulary (`Typography`'s variants are element names).
3. **`api.axisSources`** — the axis exists and `cva` did not produce it. Say where the values live.
4. Not at all — because the prop does not exist. That is now a *derived* fact.

The check runs in both directions: an `axisSources` record for a prop the component does not
declare is also an error, because a stale note is worse than no note.

---

## `api.axisSources`

```ts
avatar: {
  status: "stable",
  api: {
    axisSources: {
      size: {
        source: "data-attribute",
        note: "Written to data-size and styled with data-[size=sm|lg] utilities: default | sm | lg.",
      },
    },
  },
},
```

`source` is machine-readable, from `AXIS_SOURCES`:

| `source` | Meaning | Is it an axis? |
| --- | --- | --- |
| `cva` | The canonical case; members are in the manifest already. | Yes |
| `data-attribute` | Written to `data-<axis>`, styled with `data-[<axis>=…]` utilities. | Yes |
| `forwarded` | Passed straight to another component's axis; that component's `cva` is the definition. | Yes |
| `class-map` | The values index a lookup table or a conditional of class strings. One step short of `cva`. | Yes |
| `measurement` | A number — a diameter, a pixel size. Not a closed set. | No |
| `layout` | A structural choice (`orientation`), not an appearance. | No |
| `not-an-axis` | The name collides with the vocabulary but the prop is content. | No |

`note` is prose, and it is required: a bare `source` is the same shrug as a `null` with more
characters. Write the value set into it, so a reviewer can check the claim without opening the
component.

The three `No` rows are the "documented exemption" case. `FileCard.size` is the file's byte size
rendered as text; `QrCode.size` is a pixel edge length. Both are recorded as *not* axes, on
purpose, so the absence is a statement rather than a gap.

---

## Why `cva` is still optional

`cva` is the best way to express an axis and it is not worth a migration on its own. Ten
components use it; the other eleven of the twenty-one use `data-*` attributes, which is a perfectly
readable idiom and in some cases the better one — `data-size` is available to consumer CSS in a way
a generated class name is not.

What is not optional is *recording* the axis. Converting a `data-attribute` axis to `cva` later is
an internal change; leaving the manifest unable to describe the component's public API is not.

---

## What this does not do yet

`api.axisSources` is declared in the registry and copied into `component-manifest.json` (26
components record one), but nothing checks that every axis prop has a record since the contract
check was removed.

Nothing validates that a `note`'s value set matches the source. A note that lists the wrong
variants is a stale comment, and comments are checked by review.
