/**
 * WCAG 2.1 AA contrast verification over the generated semantic token pairs,
 * for both themes. Fails the build on any violation. Disabled text is exempt per WCAG.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { wcagContrast } from "culori";

const ROOT = dirname(fileURLToPath(import.meta.url));
const tokensPath = join(ROOT, "../src/styles/tokens.json");

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
// Blocking: real body text on real (neutral) surfaces — these must hold AA.
const REQUIRED = [
  ["color.text.primary", "color.surface.canvas", 4.5, "body text on page"],
  ["color.text.primary", "color.surface.default", 4.5, "body text on card"],
  ["color.text.primary", "color.surface.elevated", 4.5, "body text on modal"],
  ["color.text.secondary", "color.surface.default", 4.5, "secondary text on card"],
  ["color.text.inverse", "color.surface.inverse", 4.5, "inverse text on tooltip"],
  ["color.text.tertiary", "color.surface.default", 3.0, "tertiary text (large/UI)"],
  ["color.text.placeholder", "color.surface.default", 3.0, "placeholder text (UI floor)"],
  ["color.text.on-brand", "color.action.primary", 4.5, "button label on primary"],
  ["color.border.focused", "color.surface.canvas", 3.0, "focus ring on page"],
];

let failures = 0;

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
}


if (failures > 0) {
  console.error(`\n✗ ${failures} required contrast check(s) failed.`);
  process.exit(1);
}
console.log("\n✓ All required contrast checks pass (AA).");
