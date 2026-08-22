---
"@qeetrix/ui": patch
---

**Fixed: a `TimePicker` test asserted the opposite of its own name (`TEST-002`).** The suite
contained

```tsx
it("fires onValueChange when hour changes", async () => {
  const onValueChange = vi.fn();
  render(<TimePicker value="09:00" onValueChange={onValueChange} />);
  const hourSelect = screen.getByRole("combobox", { name: "Hours" });
  expect(hourSelect).not.toBeDisabled();
});
```

which never touched the Select and never looked at the mock. It could not fail if the component
emitted nothing, emitted the wrong string, or leaked the display hour cycle into the value. It is
replaced by twelve tests that drive the columns and assert what comes out — which is the
component's entire contract: a canonical 24-hour string whatever the dial shows.

Covered: picking an hour keeps the minutes and vice versa; seconds appear in the emitted value only
when `withSeconds` is set; no value yet means the first pick starts from midnight; a 24-hour value
renders correctly on the 12-hour dial including the midnight/noon `12` cases; picking `10` while the
period is already PM emits `22:30`, not `10:30`; changing the period moves the hour by twelve;
uncontrolled columns move and controlled ones do not; and a disabled picker cannot be opened, so it
emits nothing.

One thing to know if you write assertions against these triggers: the Select trigger's
`textContent` includes the chevron icon's own text fallback, so the new tests read digits only. A
`toBe("10:00")` against the raw text will not match.
