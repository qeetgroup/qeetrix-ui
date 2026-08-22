---
"@qeetrix/ui": patch
---

**The 119 `unknown` density values are now 119 reviewed ones, with the evidence for each written
down.**

`density-applicability-enforced` corrected the derivation's fallback from `not-applicable` to
`unknown` and said so plainly: 119 families reporting "we don't know" is honest and useless. This
is the review. Every one of the 145 families was read, and its value now comes with the metric it
hardcodes or the reason it has none:

- **78 `unsupported`** — the family owns a metric density should govern and hardcodes it. `Table`
  reads `--qx-control-cell-padding-y`; `NotificationPreferenceMatrix`, which is also a table, is
  `py-2`. `Input` reads `--qx-component-input-height`; `Textarea` is `min-h-16`. `TreeView`,
  `DropdownMenu`, `ContextMenu` and `Listbox` are all row lists at a literal `py-1`, while
  `Menubar` — the same menu pattern — reads `--qx-control-height`.
- **33 `not-applicable`** — the family owns none of the four metrics. Four shapes, and each entry
  says which: content-intrinsic (`Badge`, `Typography`, `Highlight`, and the graphic tracks
  `Progress`, `Meter`, `PasswordStrengthMeter`, whose thickness is a weight rather than a height),
  author-sized (`QrCode`, `ProgressCircle`, `AngleSlider` — one `size` prop owns the only
  dimension), pass-through (`ButtonGroup`, `Collapsible`, `MasterDetail` contribute no metric of
  their own), and absent from layout (`Portal`, `VisuallyHidden`, `FocusTrap`).
- **4 newly `supported`** — `IconButton`, `CurrencyInput`, `MaskInput` and `PasswordInput` inherit
  a density-resolved height from the control they render. The variable never appears in their own
  source, so file-scoped derivation could not see it; these are declared, and two tests hold the
  claim to the facts it depends on.
- **4 left `unknown`, deliberately** — `Checkbox`, `RadioGroup`, `Switch` and `Rating`. Their only
  density-relevant metric is a fixed hit target, and compact would push it further below the WCAG
  2.5.8 minimum. That is a design ruling, not a source fact, and the recorded evidence says so.

`scripts/config/density-applicability.json` is the new per-slug record, and `check:contract`
enforces it three ways: every component has an entry, the entry agrees with the manifest, and the
entry has a non-empty `evidence` note. A value with nothing behind it is the original defect
restated, so it fails the gate. `unknownCapabilities` drops 119 → 4.

Also fixed, because the review surfaced it: **the `@deprecated` marker matched anywhere in a file,
so deprecating one prop deprecated the whole component.** `Carousel` picked up a `deprecated` flag
from a single message prop and then failed `check:contract` for carrying it alongside a `stable`
status. Only column-0 comments count now — a module header, or the JSDoc above an exported
function — so a prop's JSDoc no longer speaks for the component.

**What this does not fix.** Nothing rendered changed: 119 metadata values did, and `unsupported` is
a backlog entry, not a repair. The largest single reason a family lands there is that the density
contract publishes four metrics — control height, row height, cell padding, field gap — and none of
them is surface padding, so `Card`, `Dialog`, `Popover`, `Sheet` and `Toast` have nothing to read
even if they wanted to participate. That is a gap in the contract, and calling those components
`not-applicable` would have laundered it into a design decision.
