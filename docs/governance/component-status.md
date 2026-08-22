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

Breaking changes are still allowed in a minor, but they are deliberate: they need a changeset
that says what changed and what to do about it. In practice this is the status for a component
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

## The Phase 1 baseline

Every component currently in the library is recorded as **`stable`**, except
`pagination-bar`, which is `deprecated`.

That is a description of a commitment that already exists rather than a new claim. These
components shipped in the 1.0 line, they are governed by the public-API lock
([`src/__tests__/public-api.json`](../../src/__tests__/public-api.json)), and they are live
dependencies of Qeet ID and qeet-docs. Calling them anything else would understate what
breaking one of them would cost.

The baseline lives in `REGISTRY_DEFAULTS`, so a component inherits `stable` unless it declares
otherwise. Components can be re-classified individually as they are reviewed.

---

## Choosing a status for a new component

New components should declare their status explicitly rather than inherit `stable`.

```text
Is the API shape still an open question?        → experimental
Is it settled but unproven in more than one     → beta
  product?
Is it in production in a product, with an API   → stable
  you would defend in a code review?
```

Promotion is a **minor** release and a registry edit. There is no ceremony beyond that — but
promoting to `stable` means the next breaking change costs a major, so it is worth being honest
about.

---

## What the gates enforce

`bun run check:contract` holds the status honest:

- the value must be one of the four (also a compile error in the registry)
- `status: "deprecated"` requires a deprecation record with a reason and a version
- a deprecation record on a component that is *not* deprecated is an error
- the legacy `deprecated` boolean in the manifest must agree with the status, so an
  `@deprecated` marker in the source cannot drift from the registry

---

## What status does *not* mean

- It says nothing about **test coverage**. That is `testing` in the manifest, and every
  component has an axe test regardless of status.
- It says nothing about **accessibility**. That is `accessibility.required` and
  `accessibility.pattern`.
- It says nothing about **capability support**. `stable` with `rtl: "unknown"` is a real and
  common combination: the API is settled, the RTL review has not happened.

Conflating these is how status labels become meaningless. Keep them separate.
