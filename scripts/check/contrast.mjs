/**
 * WCAG 2.1 AA contrast verification over the semantic token pairs, in both themes.
 *
 * These pairs are the ones that actually render. Every entry in the shadcn bridge — the only
 * tokens components consume — references a semantic token, so holding the semantic pairs to AA
 * holds the interface to AA. Before that indirection existed the bridge was authored against
 * primitives, and this gate measured a set of tokens nothing displayed: the dark primary button
 * scored 8.44 here while rendering a different pair entirely.
 *
 * Two tiers:
 *   REQUIRED  — blocking. Text and focus affordances that must hold AA.
 *   ADVISORY  — reported, never blocking. Ratios worth knowing about where the remedy is a
 *               visual decision rather than a defect (a decorative hairline whose affordance is
 *               carried by fill and focus ring as well).
 *
 * Disabled text is exempt per WCAG.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { wcagContrast } from "culori";

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

// [foregroundPath, backgroundPath, minRatio, label]
// Blocking: real text on the real surfaces it lands on, plus the focus affordance.
const REQUIRED = [
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
];

// Reported, never blocking. Qeetrix hairlines are deliberately subtle — a field's boundary is
// carried by its fill and its focus ring as well as its border — so raising these is a visual
// decision, not a bug fix. Tracked here so the trade-off stays visible.
const ADVISORY = [
  ["color.border.default", "color.surface.canvas", 3.0, "border on page (1.4.11)"],
  ["color.border.default", "color.surface.default", 3.0, "border on card (1.4.11)"],
  ["color.border.strong", "color.surface.canvas", 3.0, "strong border on page"],
];

let failures = 0;
let advisories = 0;

for (const theme of ["light", "dark"]) {
  console.log(`\n${theme.toUpperCase()}`);
  for (const [fg, bg, min, label] of REQUIRED) {
    const ratio = wcagContrast(get(theme, fg), get(theme, bg));
    const ok = ratio >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? "✔" : "✗"} ${label.padEnd(26)} ${ratio.toFixed(2)} : 1  (min ${min})`);
  }
  const dataSurface = get(theme, "color.surface.default");
  for (let series = 1; series <= 8; series++) {
    const ratio = wcagContrast(get(theme, `color.data.categorical.${series}`), dataSurface);
    const ok = ratio >= 3;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "✔" : "✗"} ${`chart series ${series}`.padEnd(26)} ${ratio.toFixed(2)} : 1  (min 3)`,
    );
  }
  for (const [role, min] of [
    ["axis", 4.5],
    ["reference", 3],
    ["positive", 3],
    ["negative", 3],
    ["warning", 3],
  ]) {
    const ratio = wcagContrast(get(theme, `color.data.${role}`), dataSurface);
    const ok = ratio >= min;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "✔" : "✗"} ${`chart ${role}`.padEnd(26)} ${ratio.toFixed(2)} : 1  (min ${min})`,
    );
  }

  for (const [fg, bg, min, label] of ADVISORY) {
    const ratio = wcagContrast(get(theme, fg), get(theme, bg));
    const ok = ratio >= min;
    if (!ok) advisories++;
    console.log(
      `  ${ok ? "✔" : "·"} ${label.padEnd(26)} ${ratio.toFixed(2)} : 1  (advisory ${min})`,
    );
  }
}

if (failures > 0) {
  console.error(`\n✗ ${failures} required contrast check(s) failed.`);
  process.exit(1);
}
console.log(
  `\n✓ All required contrast checks pass (AA)${
    advisories > 0 ? ` — ${advisories} advisory pair(s) below target, see ADVISORY above` : ""
  }.`,
);
