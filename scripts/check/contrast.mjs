/**
 * WCAG 2.1 AA contrast verification over the semantic token pairs, in every registered theme.
 *
 * These pairs are the ones that actually render. Every entry in the shadcn bridge — the only
 * tokens components consume — references a semantic token, so holding the semantic pairs to AA
 * holds the interface to AA. Before that indirection existed the bridge was authored against
 * primitives, and this gate measured a set of tokens nothing displayed: the dark primary button
 * scored 8.44 here while rendering a different pair entirely.
 *
 * Three tiers, and the difference between the last two is the point of this file:
 *
 *   TEXT_REQUIRED     blocking, 1.4.3. Text and focus affordances.
 *   NON_TEXT_REQUIRED blocking, 1.4.11. Boundaries and fills that are the only thing identifying
 *                     a control or its state. These pass today; the tier exists so they cannot
 *                     stop passing.
 *   KNOWN_1411_ISSUES reported, not blocking. Pairs that are *below* 3:1 right now. This used to
 *                     be an unexplained "ADVISORY" list of three entries with one shared comment,
 *                     which is how a gate reports six failing pairs and still prints a tick. Each
 *                     entry now has to name the surface it is on, what else conveys the
 *                     information, and — where nothing else does — say so plainly. The register is
 *                     validated in both directions: an entry that has climbed above its target
 *                     fails as stale (promote it), and a pair that is not in any tier is simply
 *                     not measured, which is why NON_TEXT_REQUIRED is the tier new pairs go in.
 *
 * So the gate blocks on regression, and the remaining gap is enumerated rather than averaged away.
 * Disabled text is exempt per WCAG.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { wcagContrast } from "culori";
import { loadThemeNames } from "../lib/themes.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const tokensPath = join(ROOT, "../../src/styles/tokens.json");

let tokens;
try {
  tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
} catch {
  console.error(
    `✗ ${tokensPath} not found. Run \`bun run --filter @qeetrix/ui build-tokens\` first.`,
  );
  process.exit(1);
}

const get = (theme, path) => path.split(".").reduce((node, seg) => node?.[seg], tokens[theme]);

const missing = [];

/**
 * A ratio, or `null` if either token is absent from this theme.
 *
 * Every semantic colour lives in a theme overlay rather than in a theme-agnostic layer, so a
 * newly registered theme that has not declared one yet resolves to `undefined` — and culori
 * throws on that with a stack trace pointing into node_modules. Reported as a named failure
 * instead: an incomplete theme is a real error, and it should say which token is missing.
 */
const ratio = (theme, fg, bg) => {
  const foreground = get(theme, fg);
  const background = get(theme, bg);
  for (const [path, value] of [
    [fg, foreground],
    [bg, background],
  ]) {
    if (typeof value !== "string") missing.push({ theme, path });
  }
  if (typeof foreground !== "string" || typeof background !== "string") return null;
  return wcagContrast(foreground, background);
};

const format = (value) => (value === null ? "  —  " : `${value.toFixed(2)} : 1`);

// [foregroundPath, backgroundPath, minRatio, label]
// Blocking: real text on the real surfaces it lands on, plus the focus affordance.
const TEXT_REQUIRED = [
  ["color.text.primary", "color.surface.canvas", 4.5, "body text on page"],
  ["color.text.primary", "color.surface.default", 4.5, "body text on card"],
  ["color.text.primary", "color.surface.elevated", 4.5, "body text on modal"],
  ["color.text.primary", "color.surface.rail", 4.5, "sidebar text on rail"],
  ["color.text.secondary", "color.surface.default", 4.5, "secondary text on card"],
  ["color.text.secondary", "color.surface.canvas", 4.5, "secondary text on page"],
  ["color.text.inverse", "color.surface.inverse", 4.5, "inverse text on tooltip"],
  ["color.text.tertiary", "color.surface.default", 3.0, "tertiary text (large/UI)"],
  ["color.text.tertiary", "color.surface.subtle", 3.0, "muted text on muted fill"],
  ["color.text.placeholder", "color.surface.default", 3.0, "placeholder text (UI floor)"],
  ["color.text.on-brand", "color.action.primary", 4.5, "button label on primary"],
  ["color.text.on-subtle", "color.surface.interactive", 4.5, "label on secondary/accent"],
  ["color.text.on-feedback", "color.feedback.error", 4.5, "label on error fill"],
  ["color.text.on-feedback", "color.feedback.success", 4.5, "label on success fill"],
  ["color.text.on-feedback", "color.feedback.warning", 4.5, "label on warning fill"],
  ["color.text.on-feedback", "color.feedback.info", 4.5, "label on info fill"],
  ["color.focus.ring", "color.surface.canvas", 3.0, "focus ring on page"],
  ["color.focus.ring", "color.surface.default", 3.0, "focus ring on card"],
  // Code syntax roles are text. CodeBlock and JSONTree sit on bg-muted/30 over a card, which is
  // lighter than surface.subtle in light and darker in dark, so the card is the honest surface to
  // hold them to. 4.5 because a payload is body copy, not decoration.
  ["color.syntax.key", "color.surface.default", 4.5, "syntax: object key"],
  ["color.syntax.string", "color.surface.default", 4.5, "syntax: string"],
  ["color.syntax.number", "color.surface.default", 4.5, "syntax: number"],
  ["color.syntax.literal", "color.surface.default", 4.5, "syntax: literal"],
];

// Blocking, WCAG 1.4.11 (3:1). Boundaries and fills that are the only thing distinguishing a
// control or a state. Everything here passes today in every theme; the tier's job is to make a
// token edit that drops one of them a build failure rather than a visual regression someone
// notices later.
const NON_TEXT_REQUIRED = [
  ["color.border.focused", "color.surface.canvas", 3.0, "focused border on page"],
  ["color.border.focused", "color.surface.default", 3.0, "focused border on card"],
  ["color.border.danger", "color.surface.canvas", 3.0, "invalid border on page"],
  ["color.border.danger", "color.surface.default", 3.0, "invalid border on card"],
  ["color.feedback.error", "color.surface.canvas", 3.0, "error fill boundary"],
  ["color.feedback.success", "color.surface.canvas", 3.0, "success fill boundary"],
  ["color.feedback.warning", "color.surface.canvas", 3.0, "warning fill boundary"],
  ["color.feedback.info", "color.surface.canvas", 3.0, "info fill boundary"],
];

// Reported, never blocking, and every entry has to justify itself. `themes` narrows an entry to
// the themes it is actually below target in — an entry that passes everywhere, or in a theme it
// does not claim, fails as stale.
const KNOWN_1411_ISSUES = [
  {
    pair: ["color.border.default", "color.surface.canvas"],
    min: 3.0,
    label: "hairline border on page",
    themes: ["light", "dark"],
    alternate: null,
    reason:
      "The resting boundary of a transparent-filled control (Input, Textarea, Select, Checkbox, " +
      "Radio, Combobox — 25 components render border-input) and of every decorative divider, " +
      "because --border and --input both reference color.border.default. For the dividers this " +
      "is outside 1.4.11: a rule between two rows is decoration, not a control. For the controls " +
      "it is a real gap with no alternate affordance in light, where component.input.background " +
      "is transparent — the focus ring and the invalid border are compliant, the resting state " +
      "is not. Closing it means splitting a color.border.control role out of " +
      "color.border.default and retargeting --input, which also drives 28 fill sites " +
      "(bg-input/30 and friends), so it is a coordinated design change and not a token tweak. " +
      "See docs/standards/theming.md § Non-text contrast for the measured candidate values.",
  },
  {
    pair: ["color.border.default", "color.surface.default"],
    min: 3.0,
    label: "hairline border on card",
    themes: ["light", "dark"],
    alternate: null,
    reason: "Same token and same gap as the page pair, measured on the card surface.",
  },
  {
    pair: ["color.border.strong", "color.surface.canvas"],
    min: 3.0,
    label: "strong border on page",
    themes: ["light", "dark"],
    alternate: "Structural separators, not control boundaries.",
    reason:
      "color.border.strong is the emphasis step for separators, table rules and card edges — " +
      "structure rather than a control. 1.4.11 covers information required to identify a " +
      "component or understand content; a heavier rule between two regions is neither, and the " +
      "regions it separates are identified by their own text and spacing.",
  },
  {
    pair: ["color.border.strong", "color.surface.default"],
    min: 3.0,
    label: "strong border on card",
    themes: ["light", "dark"],
    alternate: "Structural separators, not control boundaries.",
    reason: "Same role and same reasoning as the page pair, measured on the card surface.",
  },
  {
    pair: ["color.border.hover", "color.surface.canvas"],
    min: 3.0,
    label: "hover border on page",
    themes: ["light"],
    alternate: "Pointer cursor and a background change accompany every hover border.",
    reason:
      "Hover is a pointer-only, transient state that no assistive technology consumes, and it is " +
      "never the sole channel: the components that darken their border on hover also change " +
      "background and cursor. Listed because it is 0.41 short in light and worth revisiting " +
      "alongside color.border.default.",
  },
  {
    pair: ["color.action.primary", "color.surface.canvas"],
    min: 3.0,
    label: "primary fill boundary",
    themes: ["light"],
    alternate:
      "The tick/thumb glyph inside the fill is 4.5:1 against it, and the state is in aria-checked.",
    reason:
      "The brand fill marks the checked/on state of Checkbox, Radio and Switch and the surface " +
      "of a primary Button. At 2.83:1 in light it is 0.17 short, but the state is never carried " +
      "by the fill alone: the glyph on top of it clears 4.5:1 (see 'button label on primary'), " +
      "and aria-checked/aria-pressed carry it non-visually. Raising it would mean moving " +
      "color.brand.500, which is the brand itself and not this gate's decision.",
  },
  {
    pair: ["color.rating.filled", "color.surface.default"],
    min: 3.0,
    label: "rating fill on card",
    themes: ["light"],
    alternate:
      "The filled proportion of each icon is the value; aria-valuenow and the label state it.",
    reason:
      "A star rating encodes its value in how much of each icon is filled, against an unfilled " +
      "icon of the same shape — a shape difference, not a colour difference. The accessible name " +
      "states the number outright, and index.css remaps the fill to Highlight under " +
      "forced-colors so the proportion survives there too.",
  },
];

const themes = loadThemeNames();
const registeredThemes = new Set(themes);

for (const issue of KNOWN_1411_ISSUES) {
  if (typeof issue.reason !== "string" || issue.reason.trim() === "") {
    console.error(`✗ known 1.4.11 issue "${issue.label}" has no reason.`);
    process.exit(1);
  }
  const unknown = (issue.themes ?? []).filter((theme) => !registeredThemes.has(theme));
  if (unknown.length > 0) {
    console.error(
      `✗ known 1.4.11 issue "${issue.label}" names theme "${unknown[0]}", which is not registered.`,
    );
    process.exit(1);
  }
}

let failures = 0;
const stale = [];
const outstanding = [];

const measure = (theme, fg, bg) => ratio(theme, fg, bg);

for (const theme of themes) {
  console.log(`\n${theme.toUpperCase()}`);
  for (const [fg, bg, min, label] of TEXT_REQUIRED) {
    const value = measure(theme, fg, bg);
    const ok = value !== null && value >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? "✔" : "✗"} ${label.padEnd(26)} ${format(value)}  (min ${min})`);
  }
  for (let series = 1; series <= 8; series++) {
    const value = ratio(theme, `color.data.categorical.${series}`, "color.surface.default");
    const ok = value !== null && value >= 3;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "✔" : "✗"} ${`chart series ${series}`.padEnd(26)} ${format(value)}  (min 3)`,
    );
  }
  for (const [role, min] of [
    ["axis", 4.5],
    ["reference", 3],
    ["positive", 3],
    ["negative", 3],
    ["warning", 3],
  ]) {
    const value = ratio(theme, `color.data.${role}`, "color.surface.default");
    const ok = value !== null && value >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? "✔" : "✗"} ${`chart ${role}`.padEnd(26)} ${format(value)}  (min ${min})`);
  }
  for (const [fg, bg, min, label] of NON_TEXT_REQUIRED) {
    const value = measure(theme, fg, bg);
    const ok = value !== null && value >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? "✔" : "✗"} ${label.padEnd(26)} ${format(value)}  (1.4.11 min ${min})`);
  }

  for (const issue of KNOWN_1411_ISSUES) {
    if (!(issue.themes ?? themes).includes(theme)) continue;
    const [fg, bg] = issue.pair;
    const value = measure(theme, fg, bg);
    if (value === null) {
      failures++;
      console.log(`  ✗ ${issue.label.padEnd(26)} ${format(value)}  (token missing in ${theme})`);
      continue;
    }
    if (value >= issue.min) {
      stale.push({ theme, issue, ratio: value });
      console.log(
        `  ✗ ${issue.label.padEnd(26)} ${format(value)}  (now meets ${issue.min} — stale)`,
      );
      continue;
    }
    outstanding.push({ theme, issue, ratio: value });
    console.log(
      `  ! ${issue.label.padEnd(26)} ${format(value)}  (known 1.4.11 gap, min ${issue.min})`,
    );
  }
}

if (outstanding.length > 0) {
  console.log("\nKNOWN 1.4.11 GAPS (reported, not blocking)");
  for (const { theme, issue, ratio } of outstanding) {
    console.log(`  ${theme}/${issue.label} — ${ratio.toFixed(2)} : 1, target ${issue.min}`);
    console.log(`    alternate affordance: ${issue.alternate ?? "NONE — this is a real gap"}`);
  }
}

if (stale.length > 0) {
  for (const { theme, issue, ratio } of stale) {
    console.error(
      `\n✗ "${issue.label}" now scores ${ratio.toFixed(2)} : 1 in ${theme}, at or above its ` +
        `${issue.min} target. Move it from KNOWN_1411_ISSUES to NON_TEXT_REQUIRED in ` +
        "scripts/check/contrast.mjs so it cannot regress, or drop the theme from its list.",
    );
  }
  process.exit(1);
}

if (missing.length > 0) {
  const unique = [...new Set(missing.map(({ theme, path }) => `${theme}/${path}`))].sort();
  console.error(
    `\n✗ ${unique.length} token(s) are not defined in every registered theme. Every semantic ` +
      "colour lives in a theme overlay, so a registered theme has to declare all of them:",
  );
  for (const entry of unique) console.error(`    ${entry}`);
}

if (failures > 0) {
  console.error(`\n✗ ${failures} required contrast check(s) failed.`);
  process.exit(1);
}

const gapsWithoutAlternate = outstanding.filter(({ issue }) => issue.alternate === null).length;
console.log(
  `\n✓ All required contrast checks pass — ${themes.length} theme(s), ` +
    `${TEXT_REQUIRED.length} text/focus pair(s) and ${NON_TEXT_REQUIRED.length} non-text ` +
    `pair(s) blocking${
      outstanding.length > 0
        ? `, ${outstanding.length} known 1.4.11 gap(s) registered (${gapsWithoutAlternate} with no alternate affordance)`
        : ""
    }.`,
);
