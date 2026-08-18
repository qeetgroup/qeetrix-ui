#!/usr/bin/env node
/**
 * Enforces token-backed styling in production Qeetrix components and blocks.
 * Domain values and third-party selector shims require narrow documented
 * exemptions in raw-value-exemptions.json.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), "raw-value-exemptions.json");
const JSON_OUTPUT = process.argv.includes("--json");
const SOURCE_ROOTS = [join(PACKAGE_ROOT, "src/components/ui"), join(PACKAGE_ROOT, "src/blocks")];
const CODE_FILE = /\.(?:ts|tsx)$/;
const EXCLUDED_FILE = /\.(?:test|stories)\.(?:ts|tsx)$/;

const RULES = [
  {
    id: "raw-color",
    message:
      "Use a semantic/primitive token; literal colors are allowed only as documented domain data.",
    pattern: /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch)\([^\n)]*\)/g,
  },
  {
    id: "arbitrary-z-index",
    message: "Use a semantic --qx-z-* token instead of an arbitrary z-index utility.",
    pattern: /\bz-\[[^\]\n]+\]/g,
  },
  {
    id: "arbitrary-shadow-color",
    message: "Use a --qx-shadow-* token instead of an arbitrary colored shadow utility.",
    pattern: /\bshadow-\[[^\]\n]*(?:#[0-9a-fA-F]{3,8}|(?:rgb|rgba|hsl|hsla|oklch)\()[^\]\n]*\]/g,
  },
  {
    id: "legacy-disabled-opacity",
    message: "Use opacity-disabled so disabled styling resolves from state.opacity.disabled.",
    pattern: /\bopacity-50\b/g,
  },
];

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (CODE_FILE.test(entry.name) && !EXCLUDED_FILE.test(entry.name)) yield path;
  }
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const exemptions = config.exemptions ?? [];
const usedExemptions = new Set();

function isExempt(file, rule, match) {
  return exemptions.some((entry, index) => {
    const matches =
      entry.file === file &&
      entry.rule === rule &&
      Array.isArray(entry.matches) &&
      (entry.matches.includes("*") || entry.matches.includes(match));
    if (matches) usedExemptions.add(index);
    return matches;
  });
}

const violations = [];
exemptions.forEach((entry, index) => {
  if (
    typeof entry.file !== "string" ||
    typeof entry.rule !== "string" ||
    !Array.isArray(entry.matches) ||
    !entry.matches.length ||
    typeof entry.reason !== "string" ||
    !entry.reason.trim()
  ) {
    violations.push({
      file: relative(PACKAGE_ROOT, CONFIG_PATH).replaceAll("\\", "/"),
      line: index + 1,
      column: 1,
      rule: "invalid-exemption",
      match: JSON.stringify(entry),
      message: "Every exemption requires file, rule, matches, and a non-empty reason.",
    });
  }
});
let scannedFiles = 0;
for (const root of SOURCE_ROOTS) {
  for (const path of walk(root)) {
    scannedFiles++;
    const file = relative(PACKAGE_ROOT, path).replaceAll("\\", "/");
    const lines = readFileSync(path, "utf8").split("\n");
    lines.forEach((line, lineIndex) => {
      for (const rule of RULES) {
        const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
        for (const result of line.matchAll(pattern)) {
          const match = result[0];
          if (isExempt(file, rule.id, match)) continue;
          violations.push({
            file,
            line: lineIndex + 1,
            column: (result.index ?? 0) + 1,
            rule: rule.id,
            match,
            message: rule.message,
          });
        }
      }
    });
  }
}

exemptions.forEach((entry, index) => {
  if (!usedExemptions.has(index)) {
    violations.push({
      file: relative(PACKAGE_ROOT, CONFIG_PATH).replaceAll("\\", "/"),
      line: index + 1,
      column: 1,
      rule: "stale-exemption",
      match: `${entry.file} [${entry.rule}]`,
      message: "Remove exemptions that no longer match production source.",
    });
  }
});

if (JSON_OUTPUT) {
  console.log(JSON.stringify({ scannedFiles, violations }, null, 2));
} else if (violations.length) {
  console.error(`Token usage scan failed: ${violations.length} violation(s).`);
  for (const violation of violations) {
    console.error(
      `  ${violation.file}:${violation.line}:${violation.column} [${violation.rule}] ${violation.match}`,
    );
    console.error(`    ${violation.message}`);
  }
} else {
  console.log(
    `Token usage scan passed: ${scannedFiles} production source files, ${usedExemptions.size} documented exemptions, 0 violations.`,
  );
}

if (violations.length) process.exit(1);
