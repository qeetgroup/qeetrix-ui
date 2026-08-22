/**
 * bundle.mjs — the consumer-cost ratchet.
 *
 * `DEP-001` and `BUNDLE-001` were both "nobody has a number". Seven heavy libraries are runtime
 * dependencies of one package, the root barrel re-exports all of them, and the answer to "what
 * does a consumer pay" was an argument about ESM semantics rather than a measurement. This
 * script measures it: it bundles the package's entry points the way a consumer's bundler would
 * — Vite/Rolldown, production mode, minified, React external — and governs the result.
 *
 *   1. **measure** — minified and gzip bytes per entry, plus the third-party packages that
 *      survive into each bundle. Bundling from `src/` rather than `dist/` on purpose: the module
 *      graph is the same one `tsc` emits, and it means this gate needs no build step and cannot
 *      silently measure a stale `dist/`
 *   2. **tree-shaking** — `root/button-only` imports one component *through the root barrel* and
 *      is compared against `deep/button`, which imports the same component directly. The delta
 *      is what the barrel actually costs. Recording it is the point: "tree-shaking works" is a
 *      claim that has to keep being true after every refactor of src/index.ts
 *   3. **fonts** — the published font payload, and the files no `@font-face` references. Parsed
 *      from the stylesheet rather than listed here, so a new face ships its file automatically
 *   4. **the ratchet** — budgets are compared against the copy at git HEAD. A budget may shrink;
 *      raising one, or dropping an entry, fails. `--record` rewrites measurements and budgets
 *      together, which is the only way to raise one, and it shows up in a diff a human reads
 *
 * Deliberately not measured here: the packed tarball (it needs `bun run build`, so it belongs to
 * `check:package`) and the installed `node_modules` footprint (not deterministic across
 * registries or platforms — it is documented instead, in docs/governance/dependency-budgets.md).
 *
 *   node scripts/check/bundle.mjs            # measure and gate
 *   node scripts/check/bundle.mjs --record   # re-record measurements and budgets
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "../..");
const BASELINE_REPO_PATH = "scripts/config/bundle-baseline.json";
const BASELINE_PATH = join(ROOT, BASELINE_REPO_PATH);
const SRC = join(ROOT, "src");
const RECORD = process.argv.includes("--record");

/** Headroom allowed between a measurement and its budget. Matches scripts/check/performance.mjs. */
const MAX_HEADROOM = 1.25;
/** Peers a consumer already has; bundling them would measure React, not Qeetrix. */
const EXTERNAL = ["react", "react-dom", "react-dom/client", "react/jsx-runtime"];

/* ── Entry points ──────────────────────────────────────────────────────────────────────────
 * One per feature DEP-001 names, plus the barrel pair BUNDLE-001 asks for. `note` is written
 * into the baseline so a number is never recorded without saying what it is a number *of*.
 */
const ENTRIES = [
  {
    name: "root/all",
    entry: "src/index.ts",
    note: "The whole root barrel, nothing shaken. The ceiling: what a consumer pays only if tree-shaking fails completely.",
  },
  {
    name: "root/button-only",
    entry: "@fixture:button",
    note: "`import { Button } from '@qeetrix/ui'`, rendering one Button. Compare against deep/button: the difference is the barrel's real cost.",
  },
  {
    name: "deep/button",
    entry: "src/components/actions/button.tsx",
    note: "The same component imported directly, as the control for root/button-only.",
  },
  {
    name: "feature/chart",
    entry: "src/components/data-display/chart.tsx",
    note: "Recharts, and the d3 and redux-toolkit graph it pulls behind it.",
  },
  {
    name: "feature/data-table",
    entry: "src/components/data-display/data-table.tsx",
    note: "TanStack Table + TanStack Virtual, plus the Base UI menus the toolbar uses.",
  },
  {
    name: "feature/rich-text-editor",
    entry: "src/components/inputs/rich-text-editor.tsx",
    note: "TipTap starter kit and the ProseMirror packages under it — the most expensive feature in the package.",
  },
  {
    name: "feature/calendar",
    entry: "src/components/pickers/calendar.tsx",
    note: "react-day-picker, which brings date-fns.",
  },
  {
    name: "feature/carousel",
    entry: "src/components/data-display/carousel.tsx",
    note: "Embla.",
  },
  {
    name: "feature/resizable",
    entry: "src/components/layout/resizable.tsx",
    note: "react-resizable-panels.",
  },
  {
    name: "feature/qr-code",
    entry: "src/components/data-display/qr-code.tsx",
    note: "qrcode, which brings dijkstrajs.",
  },
  {
    name: "blocks",
    entry: "src/blocks/index.ts",
    note: "Every block. Blocks compose components, so this is mostly the components they use.",
  },
];

const problems = [];

/* ── Measurement ──────────────────────────────────────────────────────────────────────────*/

/** Bundle one entry and return its byte cost and the third-party packages inside it. */
async function measureEntry(entry) {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": `${SRC}/` } },
    build: {
      write: false,
      minify: true,
      target: "es2022",
      lib: { entry, formats: ["es"], fileName: "bundle" },
      rollupOptions: { external: EXTERNAL },
    },
  });
  const chunks = (Array.isArray(result) ? result[0].output : result.output).filter(
    (output) => output.type === "chunk",
  );
  const code = chunks.map((chunk) => chunk.code).join("\n");
  const packages = new Set();
  for (const chunk of chunks) {
    for (const id of Object.keys(chunk.modules ?? {})) {
      const match = id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
      if (match) packages.add(match[1]);
    }
  }
  return {
    minified: Buffer.byteLength(code),
    gzip: gzipSync(code, { level: 9 }).length,
    packages: [...packages].sort(),
  };
}

/** The fixture entry for the barrel comparison, written to a temp dir so it ships nothing. */
function writeBarrelFixture() {
  const dir = mkdtempSync(join(tmpdir(), "qeetrix-bundle-"));
  const file = join(dir, "root-button.tsx");
  writeFileSync(
    file,
    `import { Button } from "${join(SRC, "index")}";\n` +
      "export const App = () => <Button>Go</Button>;\n",
  );
  return file;
}

/** Font payload, split by whether any `@font-face` in the shipped stylesheets asks for it. */
function measureFonts() {
  const css = ["index.css", "base.css"]
    .map((name) => readFileSync(join(SRC, "styles", name), "utf8"))
    .join("\n");
  const referenced = new Set(
    [...css.matchAll(/url\("\.\.\/fonts\/([^"]+)"\)/g)].map((match) => match[1]),
  );
  const files = readdirSync(join(SRC, "fonts")).filter((name) =>
    statSync(join(SRC, "fonts", name)).isFile(),
  );
  const size = (name) => statSync(join(SRC, "fonts", name)).size;

  const unreferenced = files
    .filter((name) => !referenced.has(name) && !name.endsWith(".txt"))
    .sort();
  return {
    referencedFiles: [...referenced].sort(),
    referencedBytes: [...referenced].reduce((total, name) => total + size(name), 0),
    unreferencedFiles: unreferenced,
    unreferencedBytes: unreferenced.reduce((total, name) => total + size(name), 0),
    totalBytes: files.reduce((total, name) => total + size(name), 0),
  };
}

/* ── Run ──────────────────────────────────────────────────────────────────────────────────*/

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
} catch (error) {
  console.error(`\n✗ ${BASELINE_REPO_PATH} could not be read: ${error.message}`);
  process.exit(1);
}

const fixture = writeBarrelFixture();
const measured = {};
for (const { name, entry } of ENTRIES) {
  measured[name] = await measureEntry(entry === "@fixture:button" ? fixture : join(ROOT, entry));
}
const fonts = measureFonts();

/** Budget for a fresh measurement: the value plus 10%, rounded up to whole KiB. */
const budgetFor = (value) => Math.ceil((value * 1.1) / 1024) * 1024;

if (RECORD) {
  baseline.recorded = new Date().toISOString().slice(0, 10);
  baseline.entries = {};
  for (const { name, entry, note } of ENTRIES) {
    // Budgets are derived from the new measurement, not clamped to the old budget: a `--record`
    // that produced a budget below its own measurement would write a baseline the gate then
    // refuses. Raising one is legitimate and reviewable — the ratchet against HEAD is what makes
    // it visible, and the changeset is where it has to be justified.
    baseline.entries[name] = {
      entry:
        entry === "@fixture:button" ? "generated fixture — see scripts/check/bundle.mjs" : entry,
      note,
      packages: measured[name].packages,
      metrics: {
        minified: {
          measured: measured[name].minified,
          budget: budgetFor(measured[name].minified),
        },
        gzip: { measured: measured[name].gzip, budget: budgetFor(measured[name].gzip) },
      },
    };
  }
  baseline.fonts = {
    referenced: { files: fonts.referencedFiles.length, bytes: fonts.referencedBytes },
    unreferenced: {
      files: fonts.unreferencedFiles,
      bytes: fonts.unreferencedBytes,
      status: baseline.fonts?.unreferenced?.status ?? "recorded",
    },
    total: { measured: fonts.totalBytes, budget: budgetFor(fonts.totalBytes) },
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
  // `JSON.stringify` keeps every array multi-line and Biome collapses short ones, so a bare
  // `--record` would leave the repository failing `bun run lint`. Formatting here means the flag
  // produces a diff a reviewer can read rather than one they have to reformat first.
  try {
    execFileSync(join(ROOT, "node_modules/.bin/biome"), ["check", "--write", BASELINE_REPO_PATH], {
      cwd: ROOT,
      stdio: "ignore",
    });
  } catch {
    console.warn("  (biome not available — run `bunx biome check --write` on the baseline)");
  }
  console.log(`\n✓ recorded ${ENTRIES.length} entries into ${BASELINE_REPO_PATH}`);
  process.exit(0);
}

/* ── 1. shape and budgets ─────────────────────────────────────────────────────────────────*/

for (const { name } of ENTRIES) {
  const entry = baseline.entries?.[name];
  if (!entry) {
    problems.push(`${name}: measured but not recorded — run \`--record\` and review the diff`);
    continue;
  }
  for (const metric of ["minified", "gzip"]) {
    const record = entry.metrics?.[metric];
    const now = measured[name][metric];
    if (!Number.isInteger(record?.budget)) {
      problems.push(`${name}.${metric}: no integer budget recorded`);
      continue;
    }
    if (now > record.budget) {
      problems.push(
        `${name}.${metric}: ${now} B exceeds the budget of ${record.budget} B ` +
          `(recorded at ${record.measured} B). Either it got cheaper somewhere else or this is a ` +
          "regression a consumer pays for",
      );
    } else if (record.budget > Math.ceil(now * MAX_HEADROOM)) {
      problems.push(
        `${name}.${metric}: budget ${record.budget} B is more than ` +
          `${Math.round((MAX_HEADROOM - 1) * 100)}% above the ${now} B it now measures — ` +
          "`--record` it down; slack nobody has to meet is not a budget",
      );
    }
  }
}

for (const name of Object.keys(baseline.entries ?? {})) {
  if (!ENTRIES.some((entry) => entry.name === name)) {
    problems.push(`${name}: recorded but no longer measured — dropping an entry drops a guarantee`);
  }
}

/* ── 2. the barrel actually shakes ────────────────────────────────────────────────────────*/

const barrel = measured["root/button-only"];
const direct = measured["deep/button"];
const overhead = barrel.gzip - direct.gzip;
const limit = baseline.treeShaking?.maxBarrelOverheadGzipBytes;
if (!Number.isInteger(limit)) {
  problems.push("treeShaking.maxBarrelOverheadGzipBytes is not recorded");
} else if (overhead > limit) {
  problems.push(
    `importing Button through the root barrel now costs ${overhead} B gzip more than importing ` +
      `it directly, over the ${limit} B allowed. Something in src/index.ts has become ` +
      "unshakeable — a side effect, a re-exported value used at module scope, or a `const enum`",
  );
}
const HEAVY = [
  "recharts",
  "@tiptap/core",
  "prosemirror-view",
  "@tanstack/react-table",
  "react-day-picker",
  "embla-carousel",
  "qrcode",
];
for (const heavy of HEAVY) {
  if (barrel.packages.includes(heavy)) {
    problems.push(
      `root/button-only still contains ${heavy}. A consumer rendering one Button would ship it`,
    );
  }
}

/* ── 3. fonts ─────────────────────────────────────────────────────────────────────────────*/

const recordedFonts = baseline.fonts ?? {};
if (fonts.totalBytes > (recordedFonts.total?.budget ?? 0)) {
  problems.push(
    `fonts: ${fonts.totalBytes} B exceeds the budget of ${recordedFonts.total?.budget} B`,
  );
}
const knownUnreferenced = new Set(recordedFonts.unreferenced?.files ?? []);
for (const name of fonts.unreferencedFiles) {
  if (!knownUnreferenced.has(name)) {
    problems.push(
      `fonts: ${name} is published but no @font-face references it. Either add the face or do ` +
        "not ship the file — a font nobody can use is pure install cost",
    );
  }
}
for (const name of knownUnreferenced) {
  if (!fonts.unreferencedFiles.includes(name)) {
    problems.push(
      `fonts: ${name} is recorded as unreferenced but is now referenced or gone — ` +
        "`--record` the list",
    );
  }
}

/* ── 4. the ratchet ───────────────────────────────────────────────────────────────────────*/

let previous = null;
try {
  previous = JSON.parse(
    execFileSync("git", ["show", `HEAD:${BASELINE_REPO_PATH}`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  );
} catch {
  // No committed predecessor. The rules above still apply.
}

if (previous?.entries) {
  for (const [name, entry] of Object.entries(previous.entries)) {
    const current = baseline.entries?.[name];
    if (!current) {
      problems.push(`${name}: recorded at HEAD and gone now — say so in the changeset`);
      continue;
    }
    for (const metric of ["minified", "gzip"]) {
      const before = entry.metrics?.[metric]?.budget;
      const after = current.metrics?.[metric]?.budget;
      if (Number.isInteger(before) && Number.isInteger(after) && after > before) {
        problems.push(
          `${name}.${metric}: budget raised ${before} → ${after} B. Budgets only shrink. If the ` +
            "growth is deliberate, it is a reviewed decision — write it in the changeset",
        );
      }
    }
  }
}

/* ── report ───────────────────────────────────────────────────────────────────────────────*/

const kib = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

if (problems.length > 0) {
  console.error("\n✗ bundle budgets:\n");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    `\n  ${BASELINE_REPO_PATH} records what the entry points measured on the date in it.` +
      "\n  Re-measure and re-record with `node scripts/check/bundle.mjs --record`.\n",
  );
  process.exit(1);
}

for (const { name } of ENTRIES) {
  console.log(
    `  ${name.padEnd(26)} ${kib(measured[name].minified).padStart(10)} min  ` +
      `${kib(measured[name].gzip).padStart(9)} gzip`,
  );
}
console.log(
  `\n✓ bundle budgets — ${ENTRIES.length} entries within budget, the root barrel costs ` +
    `${overhead} B gzip over a deep import, font payload ${kib(fonts.totalBytes)} ` +
    `(${kib(fonts.unreferencedBytes)} of it unreferenced and recorded as such).`,
);
