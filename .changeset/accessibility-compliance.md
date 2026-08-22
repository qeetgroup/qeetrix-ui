---
"@qeetrix/ui": minor
---

**Accessibility and interaction compliance.** Baseline is WCAG 2.2 AA. One behavioural fix, one
CSS fix, 117 markup fixes, and an audit model that cannot lie.

- **Fixed: `AlertDialog` rendered `role="dialog"`.** Base UI's popup does; the APG alert-dialog
  pattern needs `role="alertdialog"` so assistive technology announces that a response is required
  before continuing — which is the entire difference between AlertDialog and Dialog.
- **Fixed: chart colours were not remapped under `forced-colors`.** Grid, axis and reference lines
  now map to system colours so they stay legible; the eight categorical series keep their authored
  colour behind `forced-color-adjust: none`, because eight series mapped onto system colours would
  be eight identical lines. `ChartDataTable` remains the non-colour alternative. A test asserts
  every other bridge colour *is* remapped.
- **117 decorative icons across 48 components now carry `aria-hidden`.** `IconButton` already did;
  Pagination, DataTable, Calendar and 45 others did not. A bare `<svg>` is announced as a graphic
  by several AT combinations.
- **An audit model that is computed, not claimed.** Nine dimensions per component — semantic, name,
  keyboard, focus, screenReader, rtl, reducedMotion, forcedColors, contrast — each `pass` /
  `partial` / `exception` / `not-applicable` / `not-audited`. The roll-up is derived from the
  dimensions, so there is no field meaning "accessible: true", and `pass` is only recorded where a
  test covers it. **16 of 145 components are audited; 129 are not, and say so.**
- **`check:a11y` reports the matrix** with real counts and a migration-aware ratchet: coverage may
  improve, never regress. `partial` and `exception` must carry a reason or the gate fails.
- **40 audit tests** across `src/__tests__/accessibility/` covering keyboard models, focus entry /
  containment / restoration, ARIA state and relationship resolution — plus 12 structural tests for
  the two global guarantees (forced-colors remapping, reduced-motion collapse).
- **Test helpers**: `expectAccessibleName`, `expectFocusRestored`, `expectAriaRelationship`,
  `tabThrough`, `pressEscape` and friends. Thin on purpose.
- **Documented, not changed**: Tabs activate **manually** (arrows move, Enter selects), and
  DropdownMenu deliberately highlights nothing when opened with the pointer.
- **Recorded honestly**: jsdom does not implement `inert`, so focus *containment* cannot be
  observed in tests. Dialog and AlertDialog are `focus: partial` with that limitation as the
  reason, rather than marked `pass` on a test that cannot fail in the way that matters.
- **Exemptions must justify themselves.** `a11y-coverage-exemptions.json` entries now require
  `component`, `rule`, `reason` and `revisit`; the list is empty at 145/145 axe coverage.
- **Docs**: `docs/standards/accessibility.md`, `keyboard-interactions.md`,
  `focus-management.md`, `accessibility-checklist.md`.

No API changes.
