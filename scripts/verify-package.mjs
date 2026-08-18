import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPOSITORY_ROOT = join(ROOT, "..", "..");
const STORY_ROOT = join(REPOSITORY_ROOT, "apps", "qeetrix-story");
const DOCS_ROOT = join(REPOSITORY_ROOT, "apps", "qeetrix-docs");
const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const primitiveExport = {
  types: "./dist/components/ui/*.d.ts",
  import: "./dist/components/ui/*.js",
  default: "./dist/components/ui/*.js",
};
const providerExport = {
  types: "./dist/components/*-provider.d.ts",
  import: "./dist/components/*-provider.js",
  default: "./dist/components/*-provider.js",
};

assert.deepEqual(packageJson.exports["./components/*"], primitiveExport);
assert.deepEqual(packageJson.exports["./components/ui/*"], primitiveExport);
assert.deepEqual(packageJson.exports["./components/*-provider"], providerExport);
assert.equal(packageJson.exports["./brands/*"], "./dist/styles/brands/*.css");
assert.equal(packageJson.exports["./brands/*.css"], "./dist/styles/brands/*.css");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      [`${command} ${args.join(" ")} failed with exit code ${result.status}`, result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result.stdout;
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
    "dist/index.css",
    "dist/components/ui/access-review.js",
    "dist/components/ui/audit-event.js",
    "dist/components/ui/button.js",
    "dist/components/ui/button.d.ts",
    "dist/components/ui/chart.d.ts",
    "dist/components/ui/security-item.js",
    "dist/components/theme-provider.js",
    "dist/components/theme-provider.d.ts",
    "dist/styles/brands/qeet-id.css",
  ]) {
    assert.ok(files.includes(requiredFile), `packed tarball is missing ${requiredFile}`);
  }
  assert.equal(files.some((file) => file.startsWith("src/")), false, "source files leaked into pack");

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
import { ChartDataTable as CanonicalChartDataTable } from "@qeetrix/ui/components/chart";
import { DataTable as CanonicalDataTable } from "@qeetrix/ui/components/data-table";
import { FieldControl as CanonicalFieldControl } from "@qeetrix/ui/components/field";
import { FormErrorSummary as CanonicalFormErrorSummary } from "@qeetrix/ui/components/form";
import { SecurityItem as CanonicalSecurityItem } from "@qeetrix/ui/components/security-item";
import { ThemeProvider } from "@qeetrix/ui/components/theme-provider";
import { Button as LegacyButton } from "@qeetrix/ui/components/ui/button";

assert.equal(RootButton, CanonicalButton);
assert.equal(CanonicalButton, LegacyButton);
assert.equal(AccessReview, CanonicalAccessReview);
assert.equal(AuditEvent, CanonicalAuditEvent);
assert.equal(AuditLog, CanonicalAuditLog);
assert.equal(ChartDataTable, CanonicalChartDataTable);
assert.equal(DataTable, CanonicalDataTable);
assert.equal(FieldControl, CanonicalFieldControl);
assert.equal(FormErrorSummary, CanonicalFormErrorSummary);
assert.equal(SecurityItem, CanonicalSecurityItem);
assert.equal(typeof ThemeProvider, "function");

for (const specifier of [
  "@qeetrix/ui/brands/qeet-id",
  "@qeetrix/ui/brands/qeet-id.css",
]) {
  assert.ok(existsSync(fileURLToPath(import.meta.resolve(specifier))), specifier);
}

const internalError = await import("@qeetrix/ui/dist/components/ui/button.js").then(
  () => null,
  (error) => error,
);
assert.equal(internalError?.code, "ERR_PACKAGE_PATH_NOT_EXPORTED");
`,
  );
  run(process.execPath, [join(consumerRoot, "runtime.mjs")], consumerRoot);

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
import { DataTable } from "@qeetrix/ui/components/data-table";
import { ThemeProvider } from "@qeetrix/ui/components/theme-provider";
import { Button as LegacyButton } from "@qeetrix/ui/components/ui/button";

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
void [
  accessItem,
  auditProps,
  buttonProps,
  chartTableProps,
  rootButton,
  legacyButton,
  securityProps,
  tableState,
  summaryProps,
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

  const typescriptCli = join(REPOSITORY_ROOT, "node_modules", "typescript", "bin", "tsc");
  run(process.execPath, [typescriptCli, "-p", "tsconfig.bundler.json"], consumerRoot);
  run(process.execPath, [typescriptCli, "-p", "tsconfig.nodenext.json"], consumerRoot);

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
import "@qeetrix/ui/brands/qeet-id.css";
document.body.dataset.qeetrixLoaded = String(
  typeof Button === "function" && typeof AccessReview === "function",
);
`,
  );
  const viteCli = join(STORY_ROOT, "node_modules", "vite", "bin", "vite.js");
  assert.ok(existsSync(viteCli), "Vite CLI is unavailable");
  run(process.execPath, [viteCli, "build"], consumerRoot);
  assert.ok(existsSync(join(consumerRoot, "dist", "index.html")), "Vite did not emit index.html");

  const nextRoot = join(temporaryRoot, "next-consumer");
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
    linkDependency(nextRoot, dependency, join(REPOSITORY_ROOT, "node_modules"));
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
  const nextCli = join(DOCS_ROOT, "node_modules", "next", "dist", "bin", "next");
  assert.ok(existsSync(nextCli), "Next CLI is unavailable");
  run(process.execPath, [nextCli, "build", "--webpack"], nextRoot);
  assert.ok(existsSync(join(nextRoot, ".next", "BUILD_ID")), "Next did not emit a build");

  console.log(
    `[package] verified ${files.length} packed files, ESM, Bundler/NodeNext types, Vite, Next RSC, CSS aliases, and blocked internals`,
  );
} finally {
  if (process.env.QEETRIX_KEEP_PACKAGE_FIXTURE === "1") {
    console.error(`[package] preserved fixture at ${temporaryRoot}`);
  } else {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}