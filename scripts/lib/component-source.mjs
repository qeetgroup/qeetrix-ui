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
  return (
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Leave `https://` and the like alone: a real line comment is not preceded by a colon.
      .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1")
  );
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

/**
 * Motion this component drives from JavaScript.
 *
 * The document-wide `prefers-reduced-motion` rule in the base stylesheet collapses CSS
 * transitions and animations, and cannot touch a `requestAnimationFrame` loop, a
 * `scrollIntoView({ behavior: "smooth" })` or a carousel autoplay plugin. So this is the line
 * between "the global mechanism covers this component" and "this component has to handle it
 * itself, and prove that it does" — see scripts/config/a11y-evidence.json.
 *
 * Comments are stripped by the caller: a doc comment mentioning `requestAnimationFrame` is
 * documentation, not an animation.
 */
export function hasScriptedMotion(source) {
  return matchesAny(source, SCRIPTED_MOTION_MARKERS);
}

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
 * Two-valued, and the two values are `supported` and `unknown`. This function used to return
 * `not-applicable` for everything that did not read a density metric, on the argument that
 * whether a Card should shrink under `compact` is a design decision a derived capability cannot
 * answer. The argument is right; the conclusion was backwards. `not-applicable` *is* that design
 * decision — it says the component would look no different at any density and never should — so
 * emitting it from source inspection had 125 of 145 families asserting a decision nobody made.
 * And because the contract ratchet counts `unknown`, the manifest showed no backlog at all.
 *
 * `unknown` is what the source actually knows: this component does not participate today, and
 * nobody has said whether it should. A reviewed answer — `not-applicable` or `unsupported` — is
 * declared in src/manifests/component-registry.ts, where `check:contract` requires it to be.
 *
 * One thing this function cannot see, by construction: composition. `IconButton` renders
 * `Button size="icon"`, whose height *is* density-resolved, but the variable never appears in
 * icon-button.tsx. Four such wrappers are declared `supported` in the registry for that reason.
 * Following imports here would mean resolving which of a sibling's `cva` sizes the wrapper
 * actually asks for — Button's density-resolved height is on `default` and `icon` only, and
 * `CloseButton` pins `icon-sm`, which is literal — so the answer depends on a prop default, not
 * on an import. That is a review, and it is recorded as one.
 *
 * @see src/contracts/density.ts § DERIVABLE_DENSITY_APPLICABILITY
 * @see scripts/config/density-applicability.json
 * @see docs/standards/density.md § Applicability
 */
export function deriveDensitySupport(source, densityAware = new Set()) {
  if (matchesAny(source, DENSITY_MARKERS)) return "supported";
  for (const variable of densityAware) {
    if (source.includes(`var(${variable})`)) return "supported";
  }
  return "unknown";
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

/**
 * Is *this component* deprecated?
 *
 * Only top-level comments count — a block or line comment that starts in column 0. An
 * `@deprecated` tag indented inside an interface documents one **prop** going away, and reading
 * the whole file could not tell the two apart: a single deprecated `Carousel` message prop
 * flagged the entire component, which then failed `check:contract` for carrying a `stable`
 * status alongside a `deprecated` marker. The distinction is structural, so the detector reads
 * structure rather than widening the pattern.
 *
 * A module header comment (`pagination-bar.tsx`) and the JSDoc directly above an exported
 * `function` both sit in column 0, so both still count.
 */
export function hasDeprecationMarker(raw) {
  let topLevel = "";
  let inBlock = false;
  let blockIsTopLevel = false;

  for (const line of raw.split("\n")) {
    if (inBlock) {
      if (blockIsTopLevel) topLevel += `${line}\n`;
      if (line.includes("*/")) inBlock = false;
      continue;
    }
    const opensBlock = /^(\s*)\/\*/.exec(line);
    if (opensBlock) {
      blockIsTopLevel = opensBlock[1].length === 0;
      inBlock = !line.includes("*/");
      if (blockIsTopLevel) topLevel += `${line}\n`;
      continue;
    }
    if (line.startsWith("//")) topLevel += `${line}\n`;
  }

  return /@deprecated\b/.test(topLevel);
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
    deprecatedMarker: hasDeprecationMarker(raw),
  };
}
