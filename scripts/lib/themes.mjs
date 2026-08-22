/**
 * The theme registry loader.
 *
 * Qeetrix themes are build-time artifacts: a directory of token overrides plus a registry entry
 * naming the CSS selector its variables are published under. Before this existed, the theme list
 * was the literal `["light", "dark"]` in three separate places — the token build, the graph
 * validator and the contrast gate — so a third `src/tokens/theme/<name>/` directory was silently
 * ignored by all three. Adding a theme meant editing code, which is what "theme extensibility is
 * closed" meant in practice.
 *
 * Now the single list is scripts/config/themes.json, and the directory set and the registry have
 * to agree: an unregistered directory and a registered directory that does not exist are both
 * hard errors, reported with the edit that fixes them. So a theme is either fully governed —
 * built, parity-checked, contrast-checked — or it fails loudly. There is no quiet middle.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const REGISTRY_PATH = join(PACKAGE_ROOT, "scripts/config/themes.json");
const THEME_ROOT = join(PACKAGE_ROOT, "src/tokens/theme");

/** Theme directories present on disk, in directory order. */
export function readThemeDirectories(root = THEME_ROOT) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * The registry, validated against the directories on disk.
 *
 * Throws rather than returning findings: every caller is a gate whose job stops making sense if
 * the theme list is wrong, and a half-built theme is worse than a failed build.
 */
export function loadThemeRegistry({ registryPath = REGISTRY_PATH, themeRoot = THEME_ROOT } = {}) {
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const themes = registry.themes ?? [];

  if (themes.length === 0) {
    throw new Error(`${registryPath} registers no themes — at least the base theme is required.`);
  }

  for (const [index, theme] of themes.entries()) {
    for (const field of ["name", "selector", "description"]) {
      if (typeof theme[field] !== "string" || theme[field].trim() === "") {
        throw new Error(
          `themes[${index}] in scripts/config/themes.json is missing a non-empty "${field}".`,
        );
      }
    }
  }

  const names = themes.map((theme) => theme.name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicates.length > 0) {
    throw new Error(`scripts/config/themes.json registers "${duplicates[0]}" more than once.`);
  }

  const directories = readThemeDirectories(themeRoot);
  const unregistered = directories.filter((name) => !names.includes(name));
  if (unregistered.length > 0) {
    throw new Error(
      `src/tokens/theme/${unregistered[0]}/ is not registered. Add an entry to ` +
        "scripts/config/themes.json with the CSS selector its variables belong under " +
        '(e.g. { "name": "' +
        unregistered[0] +
        '", "selector": "[data-qx-theme=\\"' +
        unregistered[0] +
        '\\"]", "description": "…" }) so the ' +
        "token build, check:tokens and check:contrast all cover it.",
    );
  }
  const missing = names.filter((name) => !directories.includes(name));
  if (missing.length > 0) {
    throw new Error(
      `scripts/config/themes.json registers "${missing[0]}" but src/tokens/theme/${missing[0]}/ ` +
        "does not exist. Create it or remove the entry.",
    );
  }

  return themes;
}

/** Registered theme names, base first. The base is the parity reference. */
export function loadThemeNames(options) {
  return loadThemeRegistry(options).map((theme) => theme.name);
}
