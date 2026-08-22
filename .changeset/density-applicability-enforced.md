---
"@qeetrix/ui": patch
---

**The enforcement half of the density-applicability contract: `not-applicable` is now a
declaration, and 119 components move to `unknown`.**

`density-applicability-contract` landed the contract, the docs and the guards, and named this as
the residual: "flipping the detector's fallback and declaring the defensible cases in the registry
touches `scripts/lib/component-source.mjs`, `scripts/check/component-contract.mjs` and
`src/manifests/component-registry.ts`, and moves the coverage baseline". That is what this is.

- `deriveDensitySupport` returns `supported` (the source reads a density metric, directly or
  through a component token that resolves to one) or `unknown`, and nothing else. Its old doc
  comment argued *for* returning `not-applicable`; the argument was right and the conclusion was
  backwards — `not-applicable` **is** the design decision it said a derivation cannot make.
- `check:contract` rejects any `not-applicable` or `unsupported` that does not come from an
  explicit registry declaration, against `DERIVABLE_DENSITY_APPLICABILITY`.
- Six pure-display families are declared `not-applicable`: `blockquote`, `aspect-ratio`, `avatar`,
  `separator`, `skeleton`, `kbd`. No control height, no row rhythm, no field gap to compress.
- `unknownCapabilities` in the coverage baseline goes from 0 to 119, with a comment recording that
  the 0 was never a clean sheet. The number may only fall, one reviewed declaration at a time.

No component's behaviour changed. `capabilities.density` is published metadata and 125 entries'
values changed, which is why this is visible at all.
