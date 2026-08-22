---
"@qeetrix/ui": patch
---

**Fixed: `TimePicker.minuteStep` could hang the main thread (`INPUT-001`).** The minute column was
built by `for (let i = 0; i < 60; i += minuteStep)`. `minuteStep` is `number`, so `0` typechecks —
and `i += 0` never reaches 60, so the render never returns. A negative step is the same defect from
the other side. Reproduced as a genuine hang, not a slow render: no timer can interrupt a
synchronous loop, so the tab is gone. The prop reaches that loop from `TimePicker` and from
`DateTimePicker`, and both are covered.

- **The step is normalised once, at the choke point.** Anything that is not a finite number, and
  anything that rounds below `1`, becomes `1`; anything above `30` becomes `30`, because a step of
  60 leaves a minute column holding a single option. `NaN` and `Infinity` used to terminate but
  produce exactly that one-option column; `0.1` produced 600 options labelled with floating-point
  residue. Both are now ordinary steps.
- **`range` itself cannot loop forever any more**, whatever a future caller passes. It coerces its
  step to a positive integer before the loop rather than trusting the caller, so this bug class
  cannot come back through a second call site.
- **A non-divisor of 60 is honoured rather than rounded to a divisor.** 60 has few divisors and a
  consumer asking for `minuteStep={7}` meant it. The consequence is that a value the form already
  holds can fall between two options — and a `Select` cannot display a value it has no item for, so
  the minute column read as empty while the component believed it had a value. **The current
  minute is now always offered**, off-grid or not; changing minutes snaps back onto the grid. An
  out-of-range minute (`"09:99"`) is not offered, because no `Select` item can hold it.
- `DateTimePicker` forwards `minuteStep` unchanged. Note the one asymmetry: an invalid step there
  falls back to `1`, not to that component's default of `5`, so the rule is the same wherever you
  are.

Rejected values are corrected silently — this package logs nothing at runtime. Both normalisation
rules are documented on the props.

The audit listed `TimeRangePicker` among the affected components. It has no `minuteStep` prop and
no minute loop — it is a preset-plus-date-range picker — and it is unchanged.

17 tests cover the invalid-step matrix, the clamp at both ends, the off-grid value, and both entry
points. A regression would show up as a hung test file rather than a failed assertion; that is
noted in the suite, because a non-terminating render cannot be observed from inside the worker
running it.
