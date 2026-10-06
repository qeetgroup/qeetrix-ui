# Component status

Every component in `@qeetrix/ui` carries one of four statuses. The status is a statement about
**what a change to that component is allowed to do** — it is a promise to consumers, not a
quality score. A component can be excellent and `experimental`, or unremarkable and `stable`.

Status is declared in
[`src/manifests/component-registry.ts`](../../src/manifests/component-registry.ts), validated by
`tsc`, and published in [`component-manifest.json`](../../component-manifest.json) so tools and
consumers can read it.

---

## The four statuses

### `experimental`

**The API may change freely, in any release.**

The component is published so it can be used in anger and learned from. A prop can be renamed,
a callback signature can change, the whole thing can be withdrawn — in a **minor**, without a
deprecation cycle.

Use it for a component whose shape is still a question. Consumers using it are opting into
churn, and should expect to read the changelog.

### `beta`

**The API is mostly settled; changes are possible but no longer casual.**

Breaking changes are still allowed in a minor, but they are deliberate: they need a changelog
entry that says what changed and what to do about it. In practice this is the status for a component
that has one or two real consumers and one or two known rough edges.

### `stable`

**Production-ready. Breaking changes require the normal compatibility governance.**

A breaking change to a `stable` component is a **major**, and follows the deprecation lifecycle
in [deprecations.md](./deprecations.md) — deprecate, provide a replacement, then remove.
"Breaking" here covers more than the type signature; see
[versioning.md](./versioning.md) for what counts.

### `deprecated`

**Still available, still working, should not attract new usage.**

A deprecated component keeps behaving exactly as it did. What changes is the guidance: new code
should use the replacement. Every deprecated component carries a record with its reason, the
version it was deprecated in, and — where one exists — its replacement and migration guidance.
See [deprecations.md](./deprecations.md).

---

## Status is declared, never inherited

`status` is a **required** field on every registry entry, and `REGISTRY_DEFAULTS` no longer
supplies one.

It used to. `REGISTRY_DEFAULTS.status` was `"stable"`, described as the "Phase 1 baseline", and
the effect was that 144 of 145 components were labelled `stable` without anybody ever typing the
word. A component became a stability promise by being added to a table. The label was accurate
for some of them and aspirational for the rest, and nothing in the repository could tell which
was which.

So the type now insists: a registry entry without a `status` does not compile, and a component
that somehow reaches the manifest on the placeholder default fails `bun run check:contract`.

---

## Promotion evidence

`stable` means "a breaking change here costs a major release". That is a commitment about API,
accessibility and support, so `check:contract` requires four things a machine can check before
it will accept the label:

| Evidence | Field | Why |
| --- | --- | --- |
| A unit suite exists | `testing.unit` | Without one, "breaking change" is a matter of opinion. |
| A test runs axe | `testing.accessibility` | The floor for a component we tell people to ship. |
| An ARIA pattern is recorded | `accessibility.pattern` | Somebody has decided what the component *is*. `"none"` is a valid answer; `null` means nobody looked. |
| The `semantic` dimension is audited | `accessibility.dimensions.semantic` ≠ `not-audited` | And, per [accessibility-evidence.md](./accessibility-evidence.md), audited means a test asserts it. |

The last one is the one that bites. When it was first enforced, **68 components moved from
`stable` to `beta`** — every one of them for the same reason: nothing in either evidence corpus
asserts anything about its roles, elements or ARIA state model. 56 of those 68 declare
`accessibility.required: true`, which is to say they claim an APG pattern contract they have
never had audited.

That is a re-labelling, not a regression. Nothing about those components changed; the label
stopped over-promising. They are still governed by the public-API lock
([`src/__tests__/public-api.json`](../../src/__tests__/public-api.json)), and a breaking change
to one of them still needs a changelog entry that says so. What `beta` withdraws is the promise that
breaking it would cost a major — a promise the library was making on 68 components' behalf
without evidence.

**Promoting one back is a small, well-defined job:** assert its roles and ARIA state — in one of
the suites in `src/__tests__/accessibility/`, or in the component's own colocated suite, which
counts as evidence for that component — then run
`node scripts/check/a11y-coverage.mjs --update`, set `status: "stable"`. There is no committee.

The three deliberately *unenforced* criteria, because no gate can settle them: whether the API
would survive a code review, whether more than one product uses it, and whether the docs exist.
Those stay a judgement call, which is why `beta` → `stable` is a human edit rather than something
the gate does for you.

---

## Choosing a status for a new component

```text
Is the API shape still an open question?        → experimental
Is it settled but unproven in more than one     → beta
  product?
Is it in production in a product, with an API   → stable
  you would defend in a code review?
```

Promotion is a **minor** release and a registry edit, plus the promotion evidence above. There is
no ceremony beyond that — but promoting to `stable` means the next breaking change costs a major,
so it is worth being honest about.

---

## What the gates enforce

`bun run check:contract` holds the status honest:

- the value must be one of the four (also a compile error in the registry)
- the entry must **declare** a status; inheriting one is an error
- `stable` requires the promotion evidence above, and names what is missing when it fails
- `status: "deprecated"` requires a deprecation record with a reason and a version
- a deprecation record on a component that is *not* deprecated is an error
- a deprecation's `replacement` must **resolve** to a component that exists in this library —
  by name or by slug — so a migration path cannot point at nothing
- a deprecation's `removeIn`, when set, must be a future **major** (`x.0.0`). A removal cannot
  ship in a minor or a patch, and announcing one for a version already released is a broken
  promise on arrival
- the legacy `deprecated` boolean in the manifest must agree with the status, so an
  `@deprecated` marker in the source cannot drift from the registry

---

## What status does *not* mean

- It says nothing about **test depth**. `stable` requires *a* unit suite and *an* axe test; it
  says nothing about how much either covers.
- It says little about **accessibility**. `stable` requires a recorded pattern and an audited
  `semantic` dimension, and nothing about keyboard, focus, announcement, RTL or contrast. A
  `stable` component with eight `not-audited` dimensions is a real and currently common
  combination. The audit matrix is the honest picture; status is not.
- It says nothing about **capability support**. `stable` with `rtl: "unknown"` is a real and
  common combination: the API is settled, the RTL review has not happened.

Conflating these is how status labels become meaningless. Keep them separate.
