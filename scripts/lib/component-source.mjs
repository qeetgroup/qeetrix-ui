/**
 * component-source.mjs — derive the observable half of a component's contract from its source.
 *
 * Everything here is *evidence*, never a guess. Each capability resolves to one of three
 * answers:
 *
 *   supported      — the source demonstrably handles it
 *   not-applicable — the capability cannot apply (no motion to reduce, no colour to theme)
 *   unknown        — the concern is present but unhandled, or the signal is inconclusive
 *
 * `unknown` is the point of the exercise: it is the Phase 2 review backlog, and it is why the
 * generator never writes `false` for something it merely failed to find.
 *
 * The detection rules are data (`STATE_MARKERS`, `MOTION_MARKERS`, …) so they can be read,
 * reviewed and unit-tested rather than buried in control flow.
 *
 * @see docs/standards/component-manifest.md § Derived fields
 */

/**
 * Strip comments before matching.
 *
 * Every rule below is a search for evidence *in the code*. A doc comment that mentions
 * `Autoplay()` is documentation, not an autoplaying carousel, and counting it would report a
 * component as unreviewed for a concern it does not have.
 */
export function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Leave `https://` and the like alone: a real line comment is not preceded by a colon.
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

/** Motion driven from JavaScript, where a CSS media query cannot reach it. */
const SCRIPTED_MOTION_MARKERS = [
  /requestAnimationFrame/,
  /\.animate\(/,
  /behavior:\s*["']smooth["']/,
  /\bautoplay\b/i,
];

/** Tailwind logical-property utilities and direction variants: direction-agnostic layout. */
const LOGICAL_MARKERS = [
  /\b(?:ps|pe|ms|me)-/,
  /\b(?:start|end)-\d/,
  /\binset-inline/,
  /\bborder-(?:s|e)(?:-|\b)/,
  /\brounded-(?:s|e)(?:-|\b)/,
  /\btext-(?:start|end)\b/,
  /\b(?:rtl|ltr):/,
];

/** Physical counterparts. Present-but-unmirrored is a review, not a failure. */
const PHYSICAL_MARKERS = [
  /\b(?:pl|pr|ml|mr)-/,
  /\b(?:left|right)-(?!1\/2\b)\d/,
  /\bborder-(?:l|r)(?:-|\b)/,
  /\brounded-(?:l|r)(?:-|\b)/,
  /\btext-(?:left|right)\b/,
];

/** `left-0` and `right-0` together span the inline axis; neither edge is "the start". */
const spansBothEdges = (source) => /\bleft-0\b/.test(source) && /\bright-0\b/.test(source);

/** Something on screen moves. */
const MOTION_MARKERS = [
  /\btransition(?:-|\b)/,
  /\banimate-/,
  /\bduration-\d/,
  /\bdata-(?:starting|ending)-style\b/,
  /\bkeyframes\b/,
  /\btransition:/,
];

/** The user asked for less of it, and the component listens. */
const REDUCED_MOTION_MARKERS = [
  /usePrefersReducedMotion/,
  /\bmotion-(?:reduce|safe):/,
  /prefers-reduced-motion/,
];

/** The component sizes itself from the density scale. */
const DENSITY_MARKERS = [/--qx-density-/, /\buseDensity\b/, /data-qx-density/];

/** The component paints something, so it has a light/dark story to tell. */
const COLOUR_MARKERS = [
  /\b(?:bg|border|ring|shadow|fill|stroke|divide|outline|decoration|accent|caret)-[a-z]/,
  /\btext-(?:foreground|muted|primary|secondary|destructive|accent|card|popover|success|warning|error|info)/,
  /\bdark:/,
  /\bplaceholder:/,
];

/**
 * Unambiguous evidence that a component handles an interaction state.
 * Keys must exist in `INTERACTION_STATES` (src/contracts/states.ts).
 */
const STATE_MARKERS = {
  hover: [/\bhover:/, /data-\[?hover/],
  focus: [/\bfocus:/, /data-\[?focused/],
  "focus-visible": [/\bfocus-visible:/],
  active: [/\bactive:/, /data-\[?active/],
  disabled: [/\bdisabled:/, /aria-disabled/, /data-\[?disabled/, /\bdisabled\?:/],
  "read-only": [/\breadOnly\b/, /aria-readonly/, /data-\[?readonly/],
  loading: [/\bloading\?:/, /\bisLoading\b/, /data-\[?loading/, /\bloading=\{/],
  invalid: [/aria-invalid/, /data-\[?invalid/],
  required: [/aria-required/, /\brequired\?:/],
  checked: [/aria-checked/, /data-\[?checked/],
  indeterminate: [/\bindeterminate\b/],
  selected: [/aria-selected/, /data-\[?selected/],
  expanded: [/aria-expanded/, /data-\[?expanded/],
  open: [/data-\[?open/, /\bdefaultOpen\b/],
  busy: [/aria-busy/],
  dragging: [/data-\[?dragging/, /\bisDragging\b/, /\bonDragStart\b/],
  empty: [/\bempty:/, /data-\[?empty/],
};

const matchesAny = (source, patterns) => patterns.some((pattern) => pattern.test(source));

/** `"use client"` must be the first statement to open a client boundary. */
export function hasClientDirective(source) {
  const head = source.trimStart();
  return head.startsWith('"use client"') || head.startsWith("'use client'");
}

/**
 * Direction support.
 * Logical utilities are proof; physical-only layout is a review; no directional styling at all
 * cannot be wrong.
 */
export function deriveRtlSupport(source) {
  if (matchesAny(source, LOGICAL_MARKERS)) return "supported";
  if (matchesAny(source, PHYSICAL_MARKERS) && !spansBothEdges(source)) return "unknown";
  return "not-applicable";
}

/**
 * Theme support.
 * Colour in a Qeetrix component can only come from a semantic token — `token-usage` rejects raw
 * values and `contrast` holds every token pair to AA in both themes — so painting anything is
 * itself the evidence. A component that paints nothing has no theme surface.
 */
export function deriveDarkModeSupport(source) {
  return matchesAny(source, COLOUR_MARKERS) ? "supported" : "not-applicable";
}

/**
 * Density support: does the component consume the density system?
 *
 * `densityAware` is the set of CSS variables that resolve to a density metric through the token
 * graph, so a component reading `--qx-component-button-height` counts even though the word never
 * appears in its source.
 *
 * Deliberately two-valued. An earlier version reported `unknown` for any component with padding
 * that did not read a density metric, which flagged 102 of 145 — a Card, a Tooltip, a Badge.
 * That was not a review queue: whether a Card *should* shrink under `compact` is a design
 * decision, and a derived capability cannot answer it. What the source can answer is whether the
 * component participates today, so that is what this reports. Widening participation is tracked
 * in docs/standards/density.md; a component the design team has decided should participate and
 * does not yet is declared `unsupported` in the registry.
 */
export function deriveDensitySupport(source, densityAware = new Set()) {
  if (matchesAny(source, DENSITY_MARKERS)) return "supported";
  for (const variable of densityAware) {
    if (source.includes(`var(${variable})`)) return "supported";
  }
  return "not-applicable";
}

/**
 * Reduced-motion support.
 *
 * `src/styles/index.css` collapses every CSS transition and animation to the reduced-motion
 * duration token under `prefers-reduced-motion: reduce`, for the whole document. So CSS-driven
 * motion is covered by construction, and a component only needs its own handling when it drives
 * motion from JavaScript — where the media query cannot reach it.
 *
 *   supported      — handled explicitly, or the motion is CSS and the base rule collapses it
 *   unknown        — scripted motion with no explicit handling
 *   not-applicable — nothing moves
 */
export function deriveReducedMotionSupport(source) {
  if (matchesAny(source, REDUCED_MOTION_MARKERS)) return "supported";
  if (matchesAny(source, SCRIPTED_MOTION_MARKERS)) return "unknown";
  if (matchesAny(source, MOTION_MARKERS)) return "supported";
  return "not-applicable";
}

/** Server/client posture, straight from the directive. */
export function deriveSsrSupport(source) {
  return hasClientDirective(source) ? "client-boundary" : "server-safe";
}

/** The interaction states the source demonstrably handles, in vocabulary order. */
export function deriveStates(source, vocabulary) {
  return vocabulary.filter((state) => matchesAny(source, STATE_MARKERS[state] ?? []));
}

/** States the detector knows how to find — used to keep the vocabulary honest. */
export function detectableStates() {
  return Object.keys(STATE_MARKERS);
}

/**
 * Shape the `cva` groups into the manifest's `api` record.
 * `null` in means "the component does not use cva", which stays `null` out — not an empty
 * variant surface.
 */
export function deriveVariantContract(cvaGroups) {
  if (cvaGroups === null) return { variants: null, sizes: null, variantGroups: null };
  const groups = Object.keys(cvaGroups).sort();
  return {
    variants: cvaGroups.variant ?? null,
    sizes: cvaGroups.size ?? null,
    variantGroups: groups.length > 0 ? groups : null,
  };
}

/** Everything derivable from one component's source, in one call. */
export function describeComponentSource({ source: raw, cvaGroups, stateVocabulary, densityAware }) {
  const source = stripComments(raw);
  return {
    capabilities: {
      rtl: deriveRtlSupport(source),
      darkMode: deriveDarkModeSupport(source),
      density: deriveDensitySupport(source, densityAware),
      ssr: deriveSsrSupport(source),
      reducedMotion: deriveReducedMotionSupport(source),
    },
    states: deriveStates(source, stateVocabulary),
    api: deriveVariantContract(cvaGroups),
    /**
     * The legacy `@deprecated` marker, still read so source and registry cannot disagree.
     * Read from the raw source: it lives in a comment by definition.
     */
    deprecatedMarker: /@deprecated\b/.test(raw),
  };
}
