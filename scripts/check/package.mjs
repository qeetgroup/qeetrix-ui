/**
 * package.mjs — the consumer contract.
 *
 * Packs the real tarball and compiles real consumers against it. Everything a consumer can
 * legitimately import must resolve, everything internal must NOT, and the CSS entry must still
 * produce Tailwind output after the dist rewrite.
 *
 * Three properties this file exists to hold:
 *
 *   1. **The published path list is exactly the allowlist.** `"./components/*"` is a pattern, so
 *      it publishes whatever `dist/components/` contains. The allowlist
 *      (scripts/config/component-map.json + src/providers) is what may be there, and
 *      the packed tarball is audited against it — a stray compiled module is a failure, not a new
 *      public subpath.
 *   2. **Every published path resolves; every denied path is denied.** Both are asserted from a
 *      consumer, in ESM resolution and in TypeScript, including the `null` denials that keep
 *      family-nested implementation paths out of the contract.
 *   3. **Consumer passes fail closed.** A missing framework used to downgrade a whole integration
 *      pass to a warning and a zero exit, so "verified" could mean "did not run". The Vite and
 *      Tailwind passes are hermetic (this repo's own devDependencies) and always run; the Next.js
 *      RSC pass needs the sibling qeetrix-docs install and can only be skipped by asking for it
 *      with QEETRIX_SKIP_NEXT_CONSUMER=1.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
// Sibling clones under qeetrix/ — only the Next.js RSC pass still needs one.
const SIBLINGS = join(ROOT, "..");
const DOCS_ROOT = join(SIBLINGS, "qeetrix-docs");
const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const componentMap = JSON.parse(
  readFileSync(join(ROOT, "scripts/config/component-map.json"), "utf8"),
);

const families = Object.keys(componentMap);
const slugs = Object.values(componentMap).flat();
const providers = readdirSync(join(ROOT, "src/providers"))
  .filter((file) => file.endsWith(".tsx"))
  .map((file) => file.replace(/\.tsx$/, ""))
  .sort();
const hooks = ["use-media-query", "use-mobile", "use-motion", "use-prefers-reduced-motion"];
const libs = ["motion", "responsive", "token-values", "utils"];

/* ── 1. the export map is the allowlist ───────────────────────────────────────────────────── */

// The flat façade: @qeetrix/ui/components/<slug|family|name-provider> all resolve
// through one pattern, backed by the shims in scripts/build/subpath-shims.mjs.
const subpath = (base) => ({
  types: `${base}.d.ts`,
  import: `${base}.js`,
  default: `${base}.js`,
});

assert.deepEqual(packageJson.exports["./components/*"], subpath("./dist/components/*"));
assert.deepEqual(packageJson.exports["./components/ui/*"], subpath("./dist/components/ui/*"));
assert.deepEqual(packageJson.exports["./providers"], subpath("./dist/providers/index"));
assert.equal(packageJson.exports["./styles.css"], "./dist/styles/index.css");
assert.equal(packageJson.exports["./base.css"], "./dist/styles/base.css");
assert.equal(packageJson.exports["./qeetrix.css"], "./dist/styles/tokens.css");
assert.equal(packageJson.exports["./tokens.css"], "./dist/styles/tokens.raw.css");
assert.equal(packageJson.exports["./tokens.json"], "./dist/styles/tokens.json");
assert.equal(packageJson.exports["./manifest.json"], "./dist/component-manifest.json");
assert.equal(packageJson.exports["./i18n"], undefined, "the ./i18n entry point was removed");

// Wildcards that used to publish undocumented internals. `./hooks/*` made
// useControllableState public; `./lib/*` and `./providers/*` published whatever compiled.
for (const pattern of ["./hooks/*", "./lib/*", "./providers/*", "./blocks/*"]) {
  assert.equal(
    packageJson.exports[pattern],
    undefined,
    `${pattern} is a wildcard export: it publishes every module in that directory, including ` +
      "ones nobody decided to support. Enumerate the supported modules instead.",
  );
}
for (const [key, expected] of [
  ...providers.map((name) => [`./providers/${name}`, `./dist/providers/${name}`]),
  ...hooks.map((name) => [`./hooks/${name}`, `./dist/hooks/${name}`]),
  ...libs.map((name) => [`./lib/${name}`, `./dist/lib/${name}`]),
]) {
  assert.deepEqual(packageJson.exports[key], subpath(expected), `${key} must be exported`);
}
// Denials. More specific than "./components/*", so Node picks them first.
assert.equal(packageJson.exports["./components/index"], null);
for (const family of families) {
  assert.equal(
    packageJson.exports[`./components/${family}/*`],
    null,
    `./components/${family}/* must be denied — the family a component lives in is an ` +
      "implementation detail, and publishing it would make moving a file a breaking change",
  );
}

function run(command, args, cwd, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      ...extraEnv,
    },
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      [
        `${command} ${args.join(" ")} failed with exit code ${result.status}`,
        result.stdout,
        result.stderr,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout;
}

/** For the negative cases: the command must fail, and fail for the stated reason. */
function runExpectingFailure(command, args, cwd, because) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: process.env });
  if (result.error) throw result.error;
  assert.notEqual(result.status, 0, `${because}\n${result.stdout}\n${result.stderr}`);
  return `${result.stdout}\n${result.stderr}`;
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function inventory(directory, base = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory() ? inventory(entryPath, base) : [relative(base, entryPath)];
  });
}

function linkPackage(consumerRoot, packageRoot) {
  const scopeRoot = join(consumerRoot, "node_modules", "@qeetrix");
  mkdirSync(scopeRoot, { recursive: true });
  cpSync(packageRoot, join(scopeRoot, "ui"), { recursive: true });
}

function linkDependency(consumerRoot, dependency, sourceNodeModules) {
  const target = join(consumerRoot, "node_modules", ...dependency.split("/"));
  if (existsSync(target)) {
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(join(sourceNodeModules, ...dependency.split("/")), target, "dir");
}

const temporaryRoot = mkdtempSync(join(tmpdir(), "qeetrix-package-contract-"));

try {
  const packRoot = join(temporaryRoot, "pack");
  const extractRoot = join(temporaryRoot, "extract");
  const consumerRoot = join(temporaryRoot, "consumer");
  mkdirSync(packRoot, { recursive: true });
  mkdirSync(extractRoot, { recursive: true });
  mkdirSync(consumerRoot, { recursive: true });

  run("bun", ["pm", "pack", "--destination", packRoot], ROOT);
  const archives = readdirSync(packRoot).filter((file) => file.endsWith(".tgz"));
  assert.equal(archives.length, 1, "expected exactly one packed tarball");
  run("tar", ["-xzf", join(packRoot, archives[0]), "-C", extractRoot], ROOT);

  const packedRoot = join(extractRoot, "package");
  const files = inventory(packedRoot);
  for (const requiredFile of [
    "package.json",
    "dist/index.js",
    "dist/index.d.ts",
    // CSS entry + generated tokens. Everything the entry @imports is checked separately,
    // transitively, below — a hand-kept list is exactly what lets the next stylesheet split
    // ship a tarball that installs cleanly and silently drops every rule it forgot.
    "dist/styles/index.css",
    "dist/styles/tokens.css",
    "dist/styles/tokens.raw.css",
    "dist/styles/tokens.json",
    "dist/component-manifest.json",
    // canonical family source
    "dist/components/Button/button.js",
    "dist/components/AccessReview/access-review.js",
    // flat façade
    "dist/components/button.js",
    "dist/components/button.d.ts",
    "dist/components/chart.d.ts",
    "dist/components/access-review.js",
    // family group imports
    "dist/components/Button.js",
    "dist/components/Button.d.ts",
    // legacy pre-1.0 path
    "dist/components/ui/button.js",
    "dist/components/ui/button.d.ts",
    // providers (moved out of components/, both paths must resolve)
    "dist/providers/theme-provider.js",
    "dist/components/theme-provider.js",
    "dist/components/theme-provider.d.ts",
  ]) {
    assert.ok(files.includes(requiredFile), `packed tarball is missing ${requiredFile}`);
  }
  assert.equal(
    files.some((file) => file.startsWith("src/")),
    false,
    "source files leaked into pack",
  );

  // Whatever the published entry @imports has to be in the tarball, transitively. A stylesheet
  // that imports a file the tarball does not contain still installs and still resolves — it just
  // silently drops every rule in the missing file. base.css, which carries the document
  // defaults, the resets, reduced-motion and the whole forced-colors remap, is one @import away
  // from being that file.
  const styleImports = (relative, seen = new Set()) => {
    if (seen.has(relative)) return seen;
    seen.add(relative);
    const directory = dirname(relative);
    const contents = readFileSync(join(packedRoot, relative), "utf8");
    for (const [, specifier] of contents.matchAll(/@import\s+["']([^"']+)["']/g)) {
      // Bare specifiers are packages (tailwindcss, tw-animate-css, shadcn) — the consumer's
      // resolver finds those. Only relative imports have to travel with us.
      if (!specifier.startsWith(".")) continue;
      styleImports(join(directory, specifier), seen);
    }
    return seen;
  };
  const requiredStyles = [...styleImports("dist/styles/index.css")];
  for (const stylesheet of requiredStyles) {
    assert.ok(
      files.includes(stylesheet),
      `dist/styles/index.css @imports ${stylesheet}, which is not in the packed tarball — the ` +
        "published stylesheet would resolve and silently drop every rule in it",
    );
  }
  assert.ok(
    requiredStyles.includes("dist/styles/base.css"),
    "dist/styles/index.css no longer imports base.css — the host-global layer is not published",
  );

  // The pattern export publishes every file at the root of dist/components. That set must be
  // exactly the allowlist plus the denied barrel — otherwise a compiled module became a
  // supported import path without anyone deciding it should be.
  const facade = files
    .filter((file) => /^dist\/components\/[^/]+\.(js|d\.ts)$/.test(file))
    .map((file) => file.replace(/^dist\/components\//, ""));
  const expectedFacade = new Set(
    [...slugs, ...families, ...providers, "index"].flatMap((name) => [
      `${name}.js`,
      `${name}.d.ts`,
    ]),
  );
  const strayFacade = facade.filter((file) => !expectedFacade.has(file));
  assert.deepEqual(
    strayFacade,
    [],
    `dist/components publishes ${strayFacade.length} path(s) that are not on the allowlist: ` +
      `${strayFacade.join(", ")}`,
  );
  const missingFacade = [...expectedFacade].filter((file) => !facade.includes(file));
  assert.deepEqual(missingFacade, [], `the flat façade is missing ${missingFacade.join(", ")}`);

  linkPackage(consumerRoot, packedRoot);
  for (const dependency of [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
  ]) {
    linkDependency(consumerRoot, dependency, join(ROOT, "node_modules"));
  }
  for (const dependency of ["@types/react", "@types/react-dom"]) {
    const target = join(consumerRoot, "node_modules", ...dependency.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(ROOT, "node_modules", ...dependency.split("/")), target, {
      recursive: true,
      dereference: true,
    });
  }
  linkDependency(consumerRoot, "csstype", join(ROOT, "node_modules"));
  writeJson(join(consumerRoot, "package.json"), { private: true, type: "module" });

  /* ── 2. every published path resolves, every denied path is denied ─────────────────────── */

  const published = [
    "@qeetrix/ui",
    "@qeetrix/ui/brand",
    "@qeetrix/ui/providers",
    ...providers.map((name) => `@qeetrix/ui/providers/${name}`),
    ...slugs.map((slug) => `@qeetrix/ui/components/${slug}`),
    ...slugs.map((slug) => `@qeetrix/ui/components/ui/${slug}`),
    ...families.map((family) => `@qeetrix/ui/components/${family}`),
    ...providers.map((name) => `@qeetrix/ui/components/${name}`),
    ...hooks.map((name) => `@qeetrix/ui/hooks/${name}`),
    ...libs.map((name) => `@qeetrix/ui/lib/${name}`),
    "@qeetrix/ui/styles.css",
    "@qeetrix/ui/base.css",
    "@qeetrix/ui/qeetrix.css",
    "@qeetrix/ui/tokens.css",
    "@qeetrix/ui/tokens.json",
    "@qeetrix/ui/manifest.json",
    "@qeetrix/ui/package.json",
  ];
  const denied = [
    // family-nested implementation paths — the flat specifier is the contract
    ...families.map((family) => `@qeetrix/ui/components/${family}/button`),
    "@qeetrix/ui/components/Button/button",
    "@qeetrix/ui/components/AccessReview/access-review",
    "@qeetrix/ui/components/Button/index",
    // blocks were removed in the enterprise architecture migration
    "@qeetrix/ui/blocks",
    "@qeetrix/ui/blocks/auth",
    // the components barrel duplicates the root entry point
    "@qeetrix/ui/components/index",
    // internal hooks and modules that a wildcard used to publish
    "@qeetrix/ui/hooks/use-controllable-state",
    "@qeetrix/ui/lib/token-values-internal",
    "@qeetrix/ui/internal/portal",
    "@qeetrix/ui/contracts/layers",
    "@qeetrix/ui/manifests/component-registry",
    "@qeetrix/ui/foundations/token-values",
    // reaching past the export map entirely
    "@qeetrix/ui/dist/components/Button/button.js",
    "@qeetrix/ui/dist/index.js",
  ];

  writeFileSync(
    join(consumerRoot, "runtime.mjs"),
    `import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  AccessReview,
  AuditEvent,
  AuditLog,
  Button as RootButton,
  ChartDataTable,
  DataTable,
  FieldControl,
  FormErrorSummary,
  SecurityItem,
} from "@qeetrix/ui";
import { AccessReview as CanonicalAccessReview } from "@qeetrix/ui/components/access-review";
import { AuditEvent as CanonicalAuditEvent, AuditLog as CanonicalAuditLog } from "@qeetrix/ui/components/audit-event";
import { Button as CanonicalButton } from "@qeetrix/ui/components/button";
import { Button as GroupButton } from "@qeetrix/ui/components/Button";
import { ThemeProvider as ProvidersEntryThemeProvider } from "@qeetrix/ui/providers";
import { ThemeProvider as ProvidersDeepThemeProvider } from "@qeetrix/ui/providers/theme-provider";
import { ChartDataTable as CanonicalChartDataTable } from "@qeetrix/ui/components/chart";
import { DataTable as CanonicalDataTable } from "@qeetrix/ui/components/data-table";
import { FieldControl as CanonicalFieldControl } from "@qeetrix/ui/components/field";
import { FormErrorSummary as CanonicalFormErrorSummary } from "@qeetrix/ui/components/form";
import { SecurityItem as CanonicalSecurityItem } from "@qeetrix/ui/components/security-item";
import { ThemeProvider } from "@qeetrix/ui/components/theme-provider";
import { Button as LegacyButton } from "@qeetrix/ui/components/ui/button";
import { cn } from "@qeetrix/ui/lib/utils";

assert.equal(RootButton, CanonicalButton);
assert.equal(CanonicalButton, LegacyButton);
assert.equal(CanonicalButton, GroupButton);
assert.equal(ThemeProvider, ProvidersEntryThemeProvider);
assert.equal(ThemeProvider, ProvidersDeepThemeProvider);
assert.equal(AccessReview, CanonicalAccessReview);
assert.equal(AuditEvent, CanonicalAuditEvent);
assert.equal(AuditLog, CanonicalAuditLog);
assert.equal(ChartDataTable, CanonicalChartDataTable);
assert.equal(DataTable, CanonicalDataTable);
assert.equal(FieldControl, CanonicalFieldControl);
assert.equal(FormErrorSummary, CanonicalFormErrorSummary);
assert.equal(SecurityItem, CanonicalSecurityItem);
assert.equal(typeof ThemeProvider, "function");
assert.equal(typeof cn, "function");

// Every published path resolves to a file that exists. A shim that was never generated, or a
// component whose category moved without its façade, fails here rather than at a consumer.
const published = ${JSON.stringify(published, null, 2)};
for (const specifier of published) {
  let resolved;
  try {
    resolved = fileURLToPath(import.meta.resolve(specifier));
  } catch (error) {
    throw new Error(\`published path does not resolve: \${specifier} (\${error.code ?? error.message})\`);
  }
  assert.ok(existsSync(resolved), \`published path resolves to a missing file: \${specifier}\`);
}

// …and nothing else does. These are internals: publishing them would make every file move a
// semver event. Bun and Node report a blocked subpath with different error codes.
const denied = ${JSON.stringify(denied, null, 2)};
for (const specifier of denied) {
  let resolved = null;
  try {
    resolved = import.meta.resolve(specifier);
  } catch {
    continue;
  }
  throw new Error(\`internal path is published: \${specifier} → \${resolved}\`);
}

for (const specifier of [
  "@qeetrix/ui/styles.css",
  "@qeetrix/ui/qeetrix.css",
  "@qeetrix/ui/tokens.css",
  "@qeetrix/ui/tokens.json",
]) {
  assert.ok(existsSync(fileURLToPath(import.meta.resolve(specifier))), specifier);
}

const internalError = await import("@qeetrix/ui/dist/components/Button/button.js").then(
  () => null,
  (error) => error,
);
assert.ok(internalError, "a dist/ path must not be importable");

console.log(\`[package] \${published.length} published paths resolve, \${denied.length} internal paths blocked\`);
`,
  );
  const resolutionReport = run(process.execPath, [join(consumerRoot, "runtime.mjs")], consumerRoot);

  writeFileSync(
    join(consumerRoot, "consumer.tsx"),
    `import type { ComponentProps } from "react";
import type {
  AccessReviewItem,
  AuditEventProps,
  ChartDataTableProps,
  DataTableState,
  FormErrorSummaryProps,
  SecurityItemProps,
} from "@qeetrix/ui";
import {
  AccessReview,
  AuditEvent,
  Button as RootButton,
  ChartDataTable,
  FieldControl,
  FormErrorSummary,
  SecurityItem,
} from "@qeetrix/ui";
import { Button as CanonicalButton } from "@qeetrix/ui/components/button";
import { Badge } from "@qeetrix/ui/components/Badge";
import { DataTable } from "@qeetrix/ui/components/data-table";
import { ThemeProvider } from "@qeetrix/ui/components/theme-provider";
import { DensityProvider } from "@qeetrix/ui/providers";
import { Button as LegacyButton } from "@qeetrix/ui/components/ui/button";
import { cn } from "@qeetrix/ui/lib/utils";
import { useMediaQuery } from "@qeetrix/ui/hooks/use-media-query";

const buttonProps: ComponentProps<typeof CanonicalButton> = { children: "Save" };
const rootButton: typeof CanonicalButton = RootButton;
const legacyButton: typeof CanonicalButton = LegacyButton;
const tableState: DataTableState = { pagination: { pageIndex: 0, pageSize: 25 } };
const summaryProps: FormErrorSummaryProps = {
  errors: [{ controlId: "email", message: "Enter an email" }],
};
const accessItem: AccessReviewItem = { id: "logs.read", label: "Read logs", state: "granted" };
const auditProps: AuditEventProps = {
  eventId: "evt_1",
  actor: "Ada",
  action: "signed in",
  timestamp: "2026-08-18",
};
const chartTableProps: ChartDataTableProps<Record<string, unknown>> = {
  caption: "Data",
  data: [],
  columns: [],
};
const securityProps: SecurityItemProps = { title: "Passkey", status: "verified" };
const classes: string = cn("a", false && "b");
void [
  Badge,
  DensityProvider,
  accessItem,
  auditProps,
  buttonProps,
  chartTableProps,
  classes,
  rootButton,
  legacyButton,
  securityProps,
  tableState,
  summaryProps,
  useMediaQuery,
  AccessReview,
  AuditEvent,
  ChartDataTable,
  DataTable,
  FieldControl,
  FormErrorSummary,
  SecurityItem,
  ThemeProvider,
];
`,
  );

  // TypeScript must agree with Node about what is internal: a path the runtime blocks but the
  // compiler resolves would still look supported in an editor.
  writeFileSync(
    join(consumerRoot, "denied.ts"),
    `import { Button } from "@qeetrix/ui/components/Button/button";
import { useControllableState } from "@qeetrix/ui/hooks/use-controllable-state";
void [Button, useControllableState];
`,
  );

  const sharedCompilerOptions = {
    target: "ES2022",
    strict: true,
    jsx: "react-jsx",
    skipLibCheck: true,
    noEmit: true,
  };
  writeJson(join(consumerRoot, "tsconfig.bundler.json"), {
    compilerOptions: {
      ...sharedCompilerOptions,
      module: "ESNext",
      moduleResolution: "Bundler",
    },
    include: ["consumer.tsx"],
  });
  writeJson(join(consumerRoot, "tsconfig.nodenext.json"), {
    compilerOptions: {
      ...sharedCompilerOptions,
      module: "NodeNext",
      moduleResolution: "NodeNext",
    },
    include: ["consumer.tsx"],
  });
  writeJson(join(consumerRoot, "tsconfig.denied.json"), {
    compilerOptions: {
      ...sharedCompilerOptions,
      module: "ESNext",
      moduleResolution: "Bundler",
    },
    include: ["denied.ts"],
  });

  const typescriptCli = join(ROOT, "node_modules", "typescript", "bin", "tsc");
  run(process.execPath, [typescriptCli, "-p", "tsconfig.bundler.json"], consumerRoot);
  run(process.execPath, [typescriptCli, "-p", "tsconfig.nodenext.json"], consumerRoot);
  const deniedTypes = runExpectingFailure(
    process.execPath,
    [typescriptCli, "-p", "tsconfig.denied.json"],
    consumerRoot,
    "TypeScript resolved an internal subpath that the export map denies",
  );
  assert.match(
    deniedTypes,
    /Cannot find module '@qeetrix/ui/components/Button/button'/,
    "expected the category-nested path to be unresolvable for TypeScript",
  );
  assert.match(
    deniedTypes,
    /Cannot find module '@qeetrix\/ui\/hooks\/use-controllable-state'/,
    "expected the internal hook to be unresolvable for TypeScript",
  );

  /* ── 3. framework consumers ────────────────────────────────────────────────────────────── */

  mkdirSync(join(consumerRoot, "src"), { recursive: true });
  writeFileSync(
    join(consumerRoot, "index.html"),
    '<!doctype html><html><body><script type="module" src="/src/main.ts"></script></body></html>\n',
  );
  writeFileSync(
    join(consumerRoot, "src", "main.ts"),
    `import { AccessReview } from "@qeetrix/ui/components/access-review";
import { Button } from "@qeetrix/ui/components/button";
import "@qeetrix/ui/styles.css";
document.body.dataset.qeetrixLoaded = String(
  typeof Button === "function" && typeof AccessReview === "function",
);
`,
  );
  // The published stylesheet is a Tailwind v4 entry point, and until now no consumer pass ran
  // Tailwind over it at all: the fixture had no plugin, so `@import "tailwindcss"` was inlined
  // unprocessed and a stylesheet that produced nothing would still have "passed".
  writeFileSync(
    join(consumerRoot, "vite.config.ts"),
    `import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({ plugins: [tailwindcss()] });
`,
  );
  for (const dependency of ["vite", "@tailwindcss/vite", "tailwindcss"]) {
    linkDependency(consumerRoot, dependency, join(ROOT, "node_modules"));
  }
  const viteCli = join(ROOT, "node_modules", "vite", "bin", "vite.js");
  assert.ok(
    existsSync(viteCli),
    "vite is not installed in this repository — the consumer bundler pass cannot run. It is a " +
      "devDependency of the test runner; run `bun install`.",
  );
  run(process.execPath, [viteCli, "build"], consumerRoot);
  assert.ok(existsSync(join(consumerRoot, "dist", "index.html")), "Vite did not emit index.html");

  const assetsDir = join(consumerRoot, "dist", "assets");
  assert.ok(existsSync(assetsDir), "the consumer build emitted no assets");
  const emittedCss = readdirSync(assetsDir)
    .filter((file) => file.endsWith(".css"))
    .map((file) => readFileSync(join(assetsDir, file), "utf8"))
    .join("\n");
  assert.ok(emittedCss.length > 0, "the consumer build emitted no CSS at all");
  assert.match(emittedCss, /--qx-/, "the design tokens are missing from the consumer stylesheet");
  // Tailwind must find the packaged components as candidate sources. Measured: deleting the
  // `@source` line from the published stylesheet takes this output from ~176 KB to ~33 KB and
  // drops the component utilities, so this is the assertion that a consumer actually receives
  // component styles rather than tokens and preflight only.
  assert.match(
    emittedCss,
    /\.inline-flex\s*\{/,
    "Tailwind generated no component utility from the packed stylesheet — a consumer would " +
      "render Qeetrix components unstyled, with no build error anywhere",
  );
  // The @source rewrite itself, asserted on the bytes that ship rather than inferred from the
  // compiled CSS: the dist tree contains no .tsx, so the published entry must not claim to scan
  // it. (Both globs happen to produce the same output today, because the emitted .d.ts files
  // sit beside the .js and match `*.ts` — the rewrite is a correctness statement, not a
  // load-bearing one, and this is the assertion that keeps it honest.)
  const packedEntry = readFileSync(join(packedRoot, "dist/styles/index.css"), "utf8");
  assert.match(
    packedEntry,
    /@source "\.\.\/\*\*\/\*\.js";/,
    "the packed CSS entry lost its @source",
  );
  assert.doesNotMatch(
    packedEntry,
    /@source "\.\.\/\*\*\/\*\.\{ts,tsx\}";/,
    "the packed CSS entry still points @source at sources that are not published",
  );

  const skipNext = process.env.QEETRIX_SKIP_NEXT_CONSUMER === "1";
  const nextCliPath = join(DOCS_ROOT, "node_modules", "next", "dist", "bin", "next");
  const nextAvailable = existsSync(nextCliPath);
  if (!nextAvailable && !skipNext) {
    throw new Error(
      "the Next.js RSC consumer pass cannot run: no installed next at " +
        `${nextCliPath}. Clone and install qeetrix-docs next to this repo, or run with ` +
        "QEETRIX_SKIP_NEXT_CONSUMER=1 to state deliberately that server-component support is " +
        "going unverified in this run.",
    );
  }
  if (!nextAvailable) {
    console.warn(
      "\n[package] ⚠⚠ SKIPPED the Next.js RSC pass (QEETRIX_SKIP_NEXT_CONSUMER=1) — server\n" +
        "[package] ⚠⚠ component and 'use client' boundary regressions are NOT covered by this run.\n",
    );
  }

  const nextRoot = join(temporaryRoot, "next-consumer");
  if (nextAvailable) {
    mkdirSync(join(nextRoot, "app"), { recursive: true });
    linkPackage(nextRoot, packedRoot);
    for (const dependency of [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.peerDependencies ?? {}),
    ]) {
      linkDependency(nextRoot, dependency, join(ROOT, "node_modules"));
    }
    for (const dependency of ["next", "react", "react-dom"]) {
      linkDependency(nextRoot, dependency, join(DOCS_ROOT, "node_modules"));
    }
    linkDependency(nextRoot, "typescript", join(DOCS_ROOT, "node_modules"));
    for (const dependency of ["@types/node", "@types/react", "@types/react-dom"]) {
      const target = join(nextRoot, "node_modules", ...dependency.split("/"));
      mkdirSync(dirname(target), { recursive: true });
      cpSync(join(DOCS_ROOT, "node_modules", ...dependency.split("/")), target, {
        recursive: true,
        dereference: true,
      });
    }
    for (const dependency of ["csstype", "undici-types"]) {
      linkDependency(nextRoot, dependency, join(ROOT, "node_modules"));
    }
    writeJson(join(nextRoot, "package.json"), {
      private: true,
      type: "module",
      dependencies: {
        "@qeetrix/ui": packageJson.version,
        next: "16.2.6",
        react: "19.2.7",
        "react-dom": "19.2.7",
      },
      devDependencies: {
        "@types/node": "22.19.19",
        "@types/react": "19.2.17",
        "@types/react-dom": "19.2.3",
        typescript: "6.0.3",
      },
    });
    writeJson(join(nextRoot, "tsconfig.json"), {
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "dom.iterable", "esnext"],
        module: "esnext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        isolatedModules: true,
        plugins: [{ name: "next" }],
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    });
    writeFileSync(
      join(nextRoot, "next-env.d.ts"),
      '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
    );
    writeFileSync(
      join(nextRoot, "app", "layout.tsx"),
      `import type * as React from "react";

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return <html lang="en"><body>{children}</body></html>;
  }
  `,
    );
    writeFileSync(
      join(nextRoot, "app", "client-fixture.tsx"),
      `"use client";
  import * as React from "react";
    import { AccessReview } from "@qeetrix/ui/components/access-review";
    import { AuditEvent, AuditLog } from "@qeetrix/ui/components/audit-event";
  import { CountryPicker } from "@qeetrix/ui/components/country-picker";
  import { TimeSince } from "@qeetrix/ui/components/time-since";
  import { TimezonePicker } from "@qeetrix/ui/components/timezone-picker";

  export function ClientFixture() {
    const [country, setCountry] = React.useState("");
    const [timezone, setTimezone] = React.useState("");
    return <div>
      <AccessReview items={[]} />
      <AuditLog aria-label="Audit history">
        <AuditEvent eventId="evt_1" actor="Ada" action="signed in" timestamp="2026-08-18" />
      </AuditLog>
      <CountryPicker value={country} onChange={setCountry} />
      <TimezonePicker value={timezone} onChange={setTimezone} />
      <TimeSince value="2026-01-01T00:00:00.000Z" refreshIntervalMs={0} />
    </div>;
  }
  `,
    );
    writeFileSync(
      join(nextRoot, "app", "page.tsx"),
      `import { Alert, AlertDescription, AlertTitle } from "@qeetrix/ui/components/alert";
  import { Badge } from "@qeetrix/ui/components/badge";
  import { SecurityItem } from "@qeetrix/ui/components/security-item";
  import { ClientFixture } from "./client-fixture";

  export default function Page() {
    return <main><Alert><AlertTitle>Ready</AlertTitle><AlertDescription>Server-safe.</AlertDescription></Alert><Badge>Stable</Badge><SecurityItem title="Passkey" status="verified" /><ClientFixture /></main>;
  }
  `,
    );
    run(process.execPath, [nextCliPath, "build", "--webpack"], nextRoot);
    assert.ok(existsSync(join(nextRoot, ".next", "BUILD_ID")), "Next did not emit a build");
  }

  console.log(
    `[package] verified ${files.length} packed files — ESM, Bundler/NodeNext types, flat + legacy ` +
      `+ family group subpaths, providers, hooks, lib, ${requiredStyles.length} @import-ed ` +
      "stylesheets, CSS entry points, denied internals " +
      `(runtime + types), Vite + Tailwind output${nextAvailable ? ", Next RSC" : ""}\n` +
      `${resolutionReport.trim()}`,
  );
} finally {
  if (process.env.QEETRIX_KEEP_PACKAGE_FIXTURE === "1") {
    console.error(`[package] preserved fixture at ${temporaryRoot}`);
  } else {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}
