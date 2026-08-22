---
"@qeetrix/ui": patch
---

**`check:contrast` measured six sub-3:1 border pairs, called them "ADVISORY", and exited 0 with a
tick.** One shared comment covered all three entries, and it argued the case rather than making
it: "Qeetrix hairlines are deliberately subtle … raising these is a visual decision." That is true
of two of them and false of the others, and the gate could not tell you which.

The advisory tier is gone. In its place:

- **A blocking non-text tier.** Eight pairs per theme held to 3:1 under WCAG 1.4.11 — the focused
  border, the invalid border, and each status fill against the page. All eight pass today; the tier
  exists so a token edit that drops one is a build failure rather than something noticed later.
- **A validated exception register.** Eleven pairs are below 3:1 right now. Each entry names the
  themes it fails in, what else conveys the information, and — where nothing else does — says so
  in the output: `alternate affordance: NONE — this is a real gap`. An entry with no reason fails
  the gate at startup.
- **Exceptions cannot go stale.** A registered pair that climbs to its target fails the build with
  instructions to promote it to the blocking tier. Exceptions expire by construction.

Four of the eleven have no alternate affordance and are the same token: `color.border.default`,
which `--border` (dividers, outside 1.4.11) and `--input` (control boundaries, inside it) both
reference. A light-theme text field is `background: transparent` with a 1.26:1 border, and that is
a real AA failure, not a taste question.

**No token values changed.** Fixing it means splitting a `color.border.control` role out and
retargeting `--input` — which is rendered as a border by 25 components *and as a fill*
(`bg-input/30`, `data-unchecked:bg-input`) by 28 more, so darkening it would also darken every
dark-mode field wash and the light-mode Switch off-track. That is a coordinated design change
across every product's forms, so it is registered with the measured candidate values
(`docs/standards/theming.md § Non-text contrast`) rather than done here. The gate is honest about
it now, which it was not before.

Three of the remaining seven are legitimate exceptions and need no change: `border.strong`
(structure, not a control), `border.hover` (pointer-only, accompanied by a background and cursor
change), and `action.primary` at 2.83:1 in light — 0.17 short, but the checked state is carried by
a glyph at 4.5:1 and by `aria-checked`, and the alternative is moving the brand colour.
