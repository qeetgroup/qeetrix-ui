/**
 * The two accessibility guarantees the library makes globally rather than per component:
 * forced-colors remapping and reduced motion.
 *
 * Neither can be observed in jsdom — there is no forced-colors mode and no real media-query
 * evaluation — so what is asserted here is that the *mechanism* exists and is complete. That is
 * what makes it honest to record `forcedColors: pass` for a component that only ever paints with
 * bridge variables: the remapping covers every one of them, and `check:token-usage` guarantees
 * the component cannot paint with anything else.
 *
 * These two suites are the declared global evidence for the `forcedColors` and `reducedMotion`
 * dimensions (scripts/config/a11y-evidence.json), and `check:a11y` fails if either stops
 * existing or stops asserting. Their titles are therefore load-bearing.
 *
 * Everything is asserted against the *effective* stylesheet — the entry with its relative
 * `@import`s inlined — so which file a rule lives in is an implementation detail and moving it
 * cannot make a guarantee silently disappear. The entry is `styles.css`, the full one: these are
 * guarantees `@qeetrix/ui/styles.css` makes, and `@qeetrix/ui/core.css` deliberately does not —
 * a consumer that declines the host-global layer is taking responsibility for both of them.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

/**
 * The **effective** stylesheet: the entry with every relative `@import` inlined, in order.
 *
 * Reading `src/styles/index.css` directly was the wrong assertion. It coupled a guarantee
 * ("forced colors are remapped for the whole document") to a file name, so splitting the
 * globals out into `base.css` turned a green suite red without anything about the guarantee
 * changing — and, worse, the same coupling would let the block be *deleted* from one file and
 * added to another the entry does not import, with the suite none the wiser. Adding the
 * `core.css` opt-out moved the entry again, from `index.css` to `styles.css`, and this function
 * is why that cost nothing.
 *
 * Package `@import`s (`tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`) are not followed:
 * they are not this library's guarantees to make, and nothing here should pass because a
 * dependency happened to ship a rule.
 */
function effectiveStylesheet(entryPath: string, seen = new Set<string>()): string {
  const absolute = resolve(process.cwd(), entryPath);
  if (seen.has(absolute)) return "";
  seen.add(absolute);

  return readFileSync(absolute, "utf8").replace(
    /^[ \t]*@import\s+["'](\.[^"']+)["'][^;]*;/gm,
    (_match, specifier: string) => effectiveStylesheet(resolve(dirname(absolute), specifier), seen),
  );
}

const entry = effectiveStylesheet("src/styles/styles.css");
const runtime = read("src/styles/tokens.css");

/** The `@media (forced-colors: active)` block. */
const forcedColorsBlock = (() => {
  const start = entry.indexOf("@media (forced-colors: active)");
  expect(
    start,
    "the forced-colors block is missing from the effective stylesheet reached from src/styles/styles.css",
  ).toBeGreaterThan(-1);
  return entry.slice(start);
})();

/** Every unprefixed colour variable the bridge publishes — what components actually render. */
function bridgeColourVariables(): string[] {
  const root = /:root\s*\{([^}]*)\}/.exec(runtime)?.[1] ?? "";
  return [...root.matchAll(/^\s*(--[a-z0-9-]+):/gm)]
    .map((m) => m[1])
    .filter((name) => !name.startsWith("--qx-"))
    .filter((name) => name !== "--radius");
}

describe("forced colors", () => {
  /**
   * The categorical chart series, and the semantic data colours that sit alongside them, are
   * deliberately NOT remapped: eight series mapped onto system colours would be eight identical
   * lines. `forced-color-adjust: none` on the chart marks that as intentional, and
   * ChartDataTable is the non-colour alternative.
   */
  const DELIBERATELY_PRESERVED = [
    "--chart-1",
    "--chart-2",
    "--chart-3",
    "--chart-4",
    "--chart-5",
    "--chart-6",
    "--chart-7",
    "--chart-8",
    "--chart-positive",
    "--chart-negative",
    "--chart-warning",
  ];

  it("remaps every bridge colour a component can paint with", () => {
    // A variable left un-remapped keeps its authored colour in forced-colors mode, which is how a
    // control ends up invisible against the user's chosen background.
    const unmapped = bridgeColourVariables().filter(
      (name) =>
        !DELIBERATELY_PRESERVED.includes(name) &&
        !new RegExp(`^\\s*${name}:`, "m").test(forcedColorsBlock),
    );
    expect(unmapped).toEqual([]);
  });

  it("marks the preserved chart colours as intentional rather than forgotten", () => {
    // Without forced-color-adjust the browser overrides them anyway, so the exemption above
    // would be a lie.
    expect(forcedColorsBlock).toMatch(/\[data-slot="chart"\][\s\S]*?forced-color-adjust:\s*none/);
    for (const chrome of ["--chart-grid", "--chart-axis", "--chart-reference"]) {
      expect(forcedColorsBlock).toMatch(new RegExp(`^\\s*${chrome}:`, "m"));
    }
  });

  it("maps to system colour keywords, not to authored values", () => {
    for (const keyword of ["Canvas", "CanvasText", "ButtonText", "Highlight", "HighlightText"]) {
      expect(forcedColorsBlock).toContain(keyword);
    }
  });

  it("removes shadows, since a shadow-only affordance disappears in forced colors", () => {
    expect(forcedColorsBlock).toMatch(/box-shadow:\s*none\s*!important/);
  });

  it("keeps a visible focus indicator, at the focus token's width", () => {
    expect(forcedColorsBlock).toContain("outline: var(--qx-focus-outline-width) solid Highlight");
    expect(forcedColorsBlock).toContain("outline-offset: var(--qx-focus-offset)");
  });

  it("makes overlays opaque, so content behind cannot bleed through", () => {
    expect(forcedColorsBlock).toMatch(/dialog-overlay[\s\S]*?background:\s*Canvas\s*!important/);
  });

  it("opts controls into the system's own rendering", () => {
    expect(forcedColorsBlock).toContain("forced-color-adjust: auto");
  });
});

describe("reduced motion", () => {
  const block = (() => {
    const start = entry.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(
      start,
      "the reduced-motion block is missing from the effective stylesheet",
    ).toBeGreaterThan(-1);
    return entry.slice(start);
  })();

  it("collapses transitions and animations document-wide, not per component", () => {
    // One rule, so a component cannot forget. Scoped to `*` because the library owns the base
    // layer; a component that needs more than this uses usePrefersReducedMotion.
    expect(block).toMatch(/\*,\s*\n\s*\*::before,\s*\n\s*\*::after/);
    expect(block).toContain("animation-duration");
    expect(block).toContain("transition-duration");
  });

  it("drives the collapse from the motion token, not a hard-coded zero", () => {
    expect(block).toContain("var(--qx-motion-reduced-duration)");
    expect(runtime).toMatch(/--qx-motion-reduced-duration:\s*0ms/);
  });

  it("stops infinite animations after one pass", () => {
    expect(block).toMatch(/animation-iteration-count:\s*1\s*!important/);
  });

  it("keeps the duration non-zero so transitionend still fires", () => {
    // Base UI waits for the transition to end before unmounting an overlay. A true zero can drop
    // the event in some engines, which would leave the overlay mounted forever.
    expect(block).toContain("max(var(--qx-motion-reduced-duration), 0.01ms)");
  });

  it("disables smooth scrolling", () => {
    expect(block).toMatch(/scroll-behavior:\s*auto\s*!important/);
  });
});
