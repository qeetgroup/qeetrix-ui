/**
 * Smoke-test example families in a real browser: every demo and the default inspector render of
 * each module, in light and dark, with console errors, React warnings and uncaught exceptions
 * collected. Screenshots go to the output directory for a human to look at.
 *
 *   bun run playground                                   # in another terminal
 *   bun playground/scripts/smoke.ts Button Badge Dialog  # families (manifest category names)
 *   bun playground/scripts/smoke.ts --all                # every family
 *
 * Options: --url=http://localhost:5199/  --out=<dir>  --themes=light,dark  --width=1280
 *          --motion=full|reduce (default full; `reduce` settles entrance animations on the first
 *          frame for steadier screenshots, and exercises the library under prefers-reduced-motion)
 * Exit code 1 when any family logged an error.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

interface ManifestShape {
  components: { slug: string; category: string }[];
}

const args = process.argv.slice(2);
const option = (name: string, fallback: string) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

const base = option("url", "http://localhost:5199/");
const out = option(
  "out",
  "/private/tmp/claude-502/-Users-a3097640-Desktop-QG-qeetrix/6e62b667-4d0e-40b7-990a-570082b6c752/scratchpad/ui-playground/smoke",
);
const themes = option("themes", "light,dark").split(",");
const width = Number(option("width", "1280"));
const reducedMotion = option("motion", "full") === "reduce" ? "reduce" : "no-preference";

const manifest = JSON.parse(
  readFileSync(new URL("../../component-manifest.json", import.meta.url), "utf8"),
) as ManifestShape;
const allFamilies = [...new Set(manifest.components.map((c) => c.category))].sort();
const requested = args.filter((arg) => !arg.startsWith("--"));
const familiesToCheck = args.includes("--all") ? allFamilies : requested;
const unknown = familiesToCheck.filter((family) => !allFamilies.includes(family));
if (unknown.length) {
  console.error(`Unknown families: ${unknown.join(", ")}`);
  process.exit(2);
}
if (familiesToCheck.length === 0) {
  console.error("Name one or more families, or pass --all.");
  process.exit(2);
}

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
let failures = 0;

for (const family of familiesToCheck) {
  for (const theme of themes) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion,
    });
    const problems: string[] = [];
    page.on("console", (message) => {
      const type = message.type();
      if (type !== "error" && type !== "warning") return;
      const textValue = message.text();
      // Vite's own dev-server chatter is not an example problem.
      if (textValue.includes("[vite]")) return;
      problems.push(`${type}: ${textValue.slice(0, 600)}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    await page.goto(`${base}#/frame/family/${family}?theme=${theme}`, { waitUntil: "networkidle" });
    await page
      .waitForSelector("[data-pg-module]", { timeout: 15_000 })
      .catch(() => problems.push("error: no module section rendered within 15s"));
    await page.waitForTimeout(800);
    // A dev-server reload (another edit landing) can put the frame back on its loading screen;
    // wait for the modules again rather than reporting a skeleton as "ok".
    if ((await page.locator("[data-pg-module]").count()) === 0) {
      await page
        .waitForSelector("[data-pg-module]", { timeout: 15_000 })
        .catch(() => problems.push("error: modules disappeared (reload?) and did not return"));
      await page.waitForTimeout(800);
    }
    const missing = await page.locator("text=/Missing examples for|failed to render/").count();
    if (missing) problems.push(`error: ${missing} module(s) missing or failed (see screenshot)`);
    const file = join(out, `${family}-${theme}.png`);
    await page.screenshot({ path: file, fullPage: true });
    if (problems.length) failures += 1;
    console.log(
      `${problems.length ? "FAIL" : "ok  "} ${family} (${theme}) → ${file}${problems.length ? `\n  ${problems.join("\n  ")}` : ""}`,
    );
    await page.close();
  }
}

await browser.close();
process.exit(failures ? 1 : 0);
