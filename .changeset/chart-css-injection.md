---
"@qeetrix/ui": minor
---

**Fixed: chart config could inject CSS into the host document (`SEC-001`).** `ChartStyle`
interpolated the chart id, series keys and series colours into a generated stylesheet without
validating any of them. A colour containing `;` or `}`, or an id containing `"]`, closed
Qeetrix's declaration and opened a rule of the author's choosing — `body { display: none }` was
reproduced end to end. Chart config is routinely consumer data: keys come from datasets, colours
come from tenant themes and API responses.

- **Series declared with `color` no longer generate CSS at all.** They are written as inline
  custom properties on the chart element, the way `Sidebar` and `Marquee` already set theirs.
  CSSOM parses each value as a single declaration, so no value can open a rule and a typical
  chart emits no `<style>` element. This is the whole vulnerable path for every chart in the
  suite.
- **Series declared with `theme` still need a `.dark`-scoped rule**, so they keep going through
  `ChartStyle` — now behind allowlists rather than escaping. The scope must be a CSS identifier,
  each series key must be a CSS identifier, and each colour must be drawn from the CSS colour
  grammar's safe character set with balanced parentheses and an allowlisted function name.
  `url` and `image-set` are excluded, so a config cannot make the host document issue a request
  for an attacker-chosen address. Nothing is escaped: anything outside the allowlist is dropped,
  and each half of a `theme` pair is validated independently.
- **The style scope no longer derives from the consumer `id`.** `ChartContainer` scopes generated
  CSS to a `useId()`-derived `data-chart-scope` attribute, reduced to identifier characters so a
  future React id format degrades to a shorter scope instead of dropping every series colour.
  `data-chart` still carries the consumer id as an attribute value, and `ChartStyle` matches both
  attributes so existing standalone usage keeps working.
- **`ChartContainer` accepts `nonce`**, forwarded to the generated stylesheet for hosts whose
  `style-src` does not allow inline stylesheets. Series declared with `color` need no nonce.

Rejected values are dropped silently — there is no development warning, because this package logs
nothing at runtime. A chart whose colours disappear should be checked against the accepted grammar
documented on `ChartStyle`.

15 tests cover the malicious-config matrix, per-value granularity, nonce forwarding, and the
server-rendered output.
