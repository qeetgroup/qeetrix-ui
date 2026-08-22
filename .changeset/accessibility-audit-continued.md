---
"@qeetrix/ui": minor
---

**Accessibility audit continued — 16 → 78 of 145 components audited**, and eight defects fixed
that the audit surfaced. Additive throughout: three new optional props, no renames, no removals.

Fixed:

- **Slider rendered two thumbs for every single-value slider.** The thumb count fell back to
  `[min, max]`, so a `<Slider value={40} />` produced a duplicate slider in the accessibility
  tree, a phantom tab stop, and a second dot on the track. One thumb per value now, with
  regression tests for both the single and range cases.
- **NumberField's input had no accessible name.** `aria-label` landed on the Root wrapper and
  never reached the field. Forwarded, the same way Slider already did for its thumb.
- **SegmentedControl's radios shared no `name`**, so each was its own group of one — assistive
  technology announced "1 of 1" and the browser enforced no single-selection.
- **Stepper's active step existed only in a `data-state` attribute** — invisible to a screen
  reader. Now `aria-current="step"`.
- **Carousel's region had no accessible name**, so it was announced as an anonymous landmark —
  in fact an unnamed `<section>` is not exposed as a landmark at all. Named, with a `aria-label`
  prop and a sensible default.
- **StatusPill was indistinguishable from Badge**: it inherited Badge's `data-slot`, so a
  consumer could not target it. It has its own slot now.
- **ActionBar's toolbar label was hardcoded English** and unreachable — now an `aria-label` prop
  defaulting to the previous value.
- **OTPInput and Rating were controlled-only.** Both now accept `defaultValue` and manage their
  own state through `useControllableState`, like every other stateful component. Rating's
  interactivity no longer depends on an `onChange` being passed.

Also:

- **Test fixtures are typechecked.** `tsconfig.build.json` excludes tests, so nothing verified
  that a fixture matched the component it rendered — an `AuditEvent` fixture missing its required
  `eventId` rendered an empty heading and only axe noticed. `bun run typecheck:tests` now covers
  161 test files and is part of `verify`. It caught the OTPInput and Rating gaps above before a
  single test ran.
- **`aria-required-children` on Menubar recorded as a known issue.** Base UI renders its focus
  guards as direct children of the `role="menubar"` element, so an open menubar owns
  non-menuitem children. No supported workaround; asserted in a test so a Base UI fix surfaces.
- **Two more jsdom limitations recorded** rather than papered over: Base UI hides a Slider thumb
  until it has measured the track, which jsdom cannot do, so Slider's focus dimension is
  `partial` alongside Dialog's and AlertDialog's `inert` limitation.
- **63 new accessibility tests** across three suites — presentational semantics, native
  controls, and composites/overlays — bringing the total to 215 a11y assertions and 1149 tests.
