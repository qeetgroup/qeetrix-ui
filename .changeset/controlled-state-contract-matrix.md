---
"@qeetrix/ui": patch
---

**Added: the controlled/uncontrolled contract is now tested as a contract (`API-004`).**
`useControllableState` had a thorough unit suite and three components had hand-written
controlled/uncontrolled tests. Neither proves the thing that breaks applications: that *every*
stateful family behaves the same way. A component can hold the hook and still get it wrong, and
half the stateful families in `inputs/` and `pickers/` do not use the hook at all — they hand-roll
the same three lines, which is the drift a per-component spot check reproduces rather than catches.

`src/hooks/__tests__/use-controllable-state.test.tsx` asks five questions of eight families
(`OTPInput`, `Rating`, `AngleSlider`, `MaskInput`, `ColorPicker`, `Editable`, `TimePicker`,
`DatePicker`) from the outside, through a real interaction, as one table:

1. uncontrolled — `defaultValue` seeds it and the component owns it afterwards
2. controlled — the prop stays authoritative when the parent ignores the callback
3. notification — the callback fires **exactly once** per interaction, with the intended value
4. defaults are initial — a `defaultValue` that changes after mount is ignored
5. takeover — a `value` arriving mid-life takes over, and keeps authority afterwards

**All forty pass unchanged**, which is the honest result: the audit's finding was a coverage gap,
not a behaviour gap. What was missing was the guard, and reading a value back off the screen for
each family is what will catch the next hand-rolled copy that gets it wrong.

Also documented: the reverse transition. When `value` goes back to `undefined`, the hook falls back
to internal state that was never written while the prop was in charge — usually the original
`defaultValue` — so the control jumps backwards. React's own inputs behave the same way and warn;
this package logs nothing at runtime, so the behaviour is stated on the hook and pinned by three
tests instead. Pick one mode per mounted lifetime, or remount.

Deliberately out of scope: families with a required `value` and no uncontrolled mode at all
(`TagInput`, `MentionInput`, `CountryPicker`, `TimezonePicker`, `CurrencyInput`), for which three of
the five questions have no meaning. The matrix is authored in the test rather than generated from
the manifest, because only eighteen components declare a controlled axis there and none of the
hand-rolled ones do.
