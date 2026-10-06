/**
 * Screenshot every playground page in light and dark, and report console errors, React
 * warnings and uncaught exceptions per page.
 *
 *   bun run playground                # or a preview of playground:build
 *   bun playground/scripts/shoot.ts   # --url=http://localhost:5199/ --out=<dir> --only=qa,overview
 *
 * Exit code 1 when any page logged an error.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

const base = option("url", "http://localhost:5199/");
const out = option(
  "out",
  "/private/tmp/claude-502/-Users-a3097640-Desktop-QG-qeetrix/6e62b667-4d0e-40b7-990a-570082b6c752/scratchpad/ui-playground",
);
const only = option("only", "").split(",").filter(Boolean);
const width = Number(option("width", "1440"));
const fullPage = !args.includes("--viewport");
/** Also write the full page as 1600px-tall segments (`<name>-<theme>.<n>.png`) for review. */
const segments = args.includes("--segments");

const pages: { name: string; hash: string; wait?: string; settle?: number }[] = [
  { name: "overview", hash: "#/" },
  { name: "components", hash: "#/components", settle: 2500 },
  { name: "components-filtered", hash: "#/components?family=Button", settle: 1500 },
  { name: "inspector-button", hash: "#/components/button", settle: 2500 },
  { name: "inspector-data-table", hash: "#/components/data-table", settle: 3000 },
  { name: "inspector-dialog-demos", hash: "#/components/dialog?view=demos", settle: 2500 },
  { name: "foundations", hash: "#/foundations", settle: 3500 },
  { name: "qa", hash: "#/qa", settle: 5000 },
  { name: "qa-compact", hash: "#/qa?density=compact", settle: 5000 },
  { name: "pattern-qeet-id-users", hash: "#/patterns/qeet-id-users", settle: 3000 },
  { name: "pattern-qeet-pay-invoices", hash: "#/patterns/qeet-pay-invoices", settle: 3000 },
  { name: "pattern-security", hash: "#/patterns/security", settle: 3000 },
  { name: "pattern-sign-in", hash: "#/patterns/sign-in", settle: 3000 },
];

mkdirSync(join(out, "segments"), { recursive: true });
const browser = await chromium.launch();
let failures = 0;

for (const theme of ["light", "dark"] as const) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: theme,
    deviceScaleFactor: 1,
  });
  await context.addInitScript((value) => {
    try {
      window.localStorage.setItem("qeetrix-ui-playground:theme", value);
    } catch {}
  }, theme);
  for (const entry of pages) {
    if (only.length && !only.includes(entry.name)) continue;
    const page = await context.newPage();
    const problems: string[] = [];
    page.on("console", (message) => {
      const type = message.type();
      if (type !== "error" && type !== "warning") return;
      const text = message.text();
      if (text.includes("[vite]")) return;
      problems.push(`${type}: ${text.slice(0, 500)}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    await page.goto(`${base}${entry.hash}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(entry.settle ?? 1500);
    if (fullPage) {
      // Bring lazy previews in: scroll to the bottom in steps, then back up.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1200);
    }
    const file = join(out, `${entry.name}-${theme}.png`);
    await page.screenshot({ path: file, fullPage });
    if (fullPage && segments) {
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0, index = 0; y < height; y += 1600, index += 1) {
        await page.screenshot({
          path: join(out, "segments", `${entry.name}-${theme}.${index}.png`),
          fullPage: true,
          clip: { x: 0, y, width, height: Math.min(1600, height - y) },
        });
      }
    }
    if (problems.length) failures += 1;
    console.log(
      `${problems.length ? "FAIL" : "ok  "} ${entry.name} (${theme}) → ${file}${problems.length ? `\n  ${[...new Set(problems)].slice(0, 12).join("\n  ")}` : ""}`,
    );
    await page.close();
  }
  await context.close();
}

await browser.close();
process.exit(failures ? 1 : 0);
