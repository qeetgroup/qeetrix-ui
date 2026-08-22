---
"@qeetrix/ui": minor
---

**`status` is now required on every component, and `stable` has to be earned. 68 components move
from `stable` to `beta`.**

`REGISTRY_DEFAULTS.status` was `"stable"`, so a component became a stability promise by being
added to a table — 144 of 145 were labelled `stable` and not one of those labels was a decision
anybody recorded. The default is gone and the field is required, so an entry without a status
does not compile.

`check:contract` requires four checkable things before it accepts `stable`: a unit suite, a test
that runs axe, a recorded ARIA pattern, and an audited `semantic` dimension. The last one is what
moved the 68 — every one of them for the same reason, that nothing in either evidence corpus
asserts anything about its roles, elements or ARIA state model. 56 of the 68 declare
`accessibility.required: true`: they claim an APG pattern contract they have never had audited.

Deprecation records are held to more than their shape too. `replacement` must **resolve** to a
component that exists in this library, by name or by slug, so a migration path cannot point at
nothing; `removeIn`, when set, must be a future major, because a removal cannot ship in a minor
and announcing one for a released version is a broken promise on arrival.

**The trade-off.** Nothing about those 68 components changed. They are still under the public-API
lock and a breaking change to one still needs a changeset that says so. What `beta` withdraws is
the promise that breaking it would cost a major — a promise the library was making on their
behalf without evidence. Promoting one back is a small job: assert its semantics in one of the
accessibility suites or in the component's own colocated suite, re-record the snapshot, set the
status.

`minor` because the published manifest's `status` field changed for 68 components. No API
changed.

See `docs/governance/component-status.md § Promotion evidence`.
