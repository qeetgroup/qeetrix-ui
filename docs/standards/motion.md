# Motion

Motion has a small vocabulary on purpose. Five durations, five curves, and one rule about
respecting the user.

---

## The vocabulary

```text
motion.duration.instant     0ms      no transition
motion.duration.fast        150ms    hover, focus, colour changes
motion.duration.normal      200ms    the default for anything visible
motion.duration.slow        300ms    entering and leaving overlays
motion.duration.deliberate  400ms    a change the user should notice

motion.easing.standard      cubic-bezier(0.4, 0, 0.2, 1)   in-and-out; most things
motion.easing.enter         cubic-bezier(0, 0, 0.2, 1)     decelerating; arriving
motion.easing.exit          cubic-bezier(0.4, 0, 1, 1)     accelerating; leaving
motion.easing.emphasized    cubic-bezier(0.4, 0, 0.6, 1)   sharper; emphasis
motion.easing.linear        linear                          progress, spinners
```

Every one of these aliases a value the library already used — the semantic layer named the
existing curves, it did not introduce new timings. The primitive names (`duration.standard`,
`easing.decelerate`) remain, and so do the `ease-standard` / `ease-decelerate` /
`ease-accelerate` / `ease-sharp` utilities.

New code should prefer the role: `ease-enter` reads as intent, `ease-decelerate` as mechanics.

---

## From CSS

```tsx
className="transition-colors duration-fast ease-standard"
className="transition-transform duration-slow ease-enter"
```

`duration-*` and `ease-*` are mapped in `@theme` from the motion tokens, so there is nothing to
import.

## From TypeScript

```ts
import { transition, DURATION, EASING } from "@qeetrix/ui";

transition("opacity", { duration: "fast", easing: "decelerate" });
// → "opacity 150ms cubic-bezier(0, 0, 0.2, 1)"
```

`DURATION` values are numbers in milliseconds — for `setTimeout`, or for a library that wants a
number. Reach for `transition()` when a style has to be built in JavaScript; prefer the utility
classes otherwise.

---

## Reduced motion

`prefers-reduced-motion: reduce` is a request, and honouring it is not optional.

The token layer provides the collapse target:

```text
motion.reduced.duration  → 0ms
motion.reduced.easing    → linear
```

Three ways to respect it, in order of preference:

**1. The Tailwind variant** — best for a component that animates in CSS.

```tsx
className="transition-transform duration-slow motion-reduce:transition-none"
```

**2. The hook** — when the decision is in JavaScript.

```tsx
import { usePrefersReducedMotion } from "@qeetrix/ui";

const reduced = usePrefersReducedMotion();
<Marquee speed={reduced ? 0 : 40} />;
```

`useMotion()` wraps this and returns duration/easing already collapsed, so a component does not
branch on the boolean itself.

**3. A media query in `index.css`** — only for a global affordance that cannot be expressed
per component. The skeleton shimmer is the one instance:

```css
@media (prefers-reduced-motion: reduce) {
  [data-slot="skeleton"]::after { animation: none; }
}
```

**Do not** write a `prefers-reduced-motion` media query inside a component. That is the pattern
that leaves half the library honouring the preference and half ignoring it.

---

## Current state

The manifest records what each component actually does:
`bun run check:contract --verbose` lists `reducedMotion` as `unknown` for 72 components — they
animate and nothing collapses it. That is the honest count, and it is the largest single item on
the Phase 3 list. Four components handle it today (`marquee`, `rolling-number` and the two
skeleton paths).

When adding motion to a component, wire the reduced-motion path in the same change. It is one
variant.

---

## Guidance

- **Transition properties, not `all`.** `transition-colors`, `transition-transform`. `all`
  animates layout by accident.
- **Enter and exit differ.** Arriving decelerates (`ease-enter`), leaving accelerates
  (`ease-exit`). Base UI's `data-starting-style` / `data-ending-style` are where those hook in.
- **Nothing over 400ms** without a reason. `linger` (600ms) exists as a primitive for
  attention-seeking affordances; it is not a transition duration.
- **Motion is not feedback.** If the only signal that something happened is an animation, the
  reduced-motion path has no signal at all.
