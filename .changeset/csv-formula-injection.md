---
"@qeetrix/ui": minor
---

**Fixed: `DataTable` CSV export could carry spreadsheet formulas (`SEC-002`).** Cells were quoted
for CSV structure but never neutralised, and quoting does not help — a spreadsheet evaluates a
quoted `=1+1` exactly as it evaluates a bare one. Any row value beginning with `=`, `+`, `-` or `@`,
or hiding one behind a leading tab or carriage return, executed on the machine of whoever opened the
file: `HYPERLINK` exfiltration, `cmd|` DDE, the usual set. Exported rows are the filtered dataset,
which in a multi-tenant product is untrusted by definition.

- **Formula cells are now prefixed with an apostrophe**, which every spreadsheet reads as "the rest
  of this cell is text". A leading tab or carriage return is treated as a risk in its own right,
  since those are the characters used to hide a formula lead from a first-character check, and the
  check is applied after leading whitespace so `  =1+1` cannot slip through.
- **Plain numbers are deliberately exempt.** `-5`, `+5` and `-2e10` begin with a formula character
  but are data; exporting them as text would break every sum in the resulting sheet. A value that
  merely starts like a number — `-2+3` — is still guarded.
- **`exportFormulaEscaping="none"` is the opt-out** for exports whose values are all trusted. The
  default is `"prefix"`.
- **Also fixed: a cell containing a lone carriage return corrupted the file.** `csvField` quoted on
  comma, quote and line feed but not on CR.

The export path had no tests at all before this — `URL.createObjectURL` does not exist in jsdom, so
calling it would have thrown. 22 tests now assert the downloaded bytes: the payload matrix, the
number exemptions, quoting round-trips, header cells, the opt-out, and a bare `-` (guarded, and
documented as deliberate rather than an oversight).

The apostrophe is a real trade-off rather than a free win: a consumer parsing the exported file
programmatically sees it, and some spreadsheets display it instead of hiding it. That is why the
opt-out is explicit and named after what it does.
