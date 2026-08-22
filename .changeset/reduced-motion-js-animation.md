---
"@qeetrix/ui": patch
---

**Fixed: chart presets animated even when the user asked for reduced motion (`MOTION-001`).**
The library's global reduced-motion CSS collapses every transition and animation duration, but
Recharts animates in JavaScript through `requestAnimationFrame` — a rule that zeroes a CSS
duration cannot touch it. So a user with `prefers-reduced-motion: reduce` still got bars growing,
lines drawing themselves on, and pie sectors sweeping into place.

`AreaChart`, `BarChart`, `LineChart`, `DonutChart` and `RadialChart` now feed
`usePrefersReducedMotion()` into Recharts' `isAnimationActive`, so the final geometry is painted on
the first frame. `Sparkline` never animated. Nothing changes when motion is allowed.

The tests assert the rendered geometry rather than the prop: an animated Recharts series starts
from nothing — an empty rectangle group, a zero-width reveal clip, a dash-array draw-on — and both
branches are covered, so the test would fail if the preference stopped being consumed *or* if the
non-reduced path stopped animating. jsdom's `matchMedia` always answers `false`, so each branch
installs its own.
