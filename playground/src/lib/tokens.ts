import tokensCss from "../../../src/styles/tokens.css?raw";
import tokensJson from "../../../src/styles/tokens.json";

/**
 * The generated design tokens, read as data. `src/styles/tokens.json` is resolved per theme and
 * hot-reloads when `build:tokens` rewrites it, so the theme lab follows the foundation as it
 * changes; nothing here restates a value. The component bridge (`--background`, `--primary`, …)
 * is not in the JSON, so it is parsed out of the generated `tokens.css`.
 */

export type TokenValue = string | number;
export interface TokenTree {
  [key: string]: TokenValue | TokenTree;
}
export type Theme = "light" | "dark";

const data = tokensJson as unknown as Record<Theme, TokenTree> & { $description?: string };

export const tokenThemes: readonly Theme[] = ["light", "dark"];

export function tokenRoot(theme: Theme): TokenTree {
  return data[theme] ?? {};
}

/** The subtree at a dotted path, or `undefined`. */
export function subtree(theme: Theme, path: string): TokenTree | undefined {
  let node: TokenValue | TokenTree | undefined = tokenRoot(theme);
  for (const key of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[key];
  }
  return typeof node === "object" ? node : undefined;
}

/** The value at a dotted path (e.g. `color.text.primary`), stringified, or `undefined`. */
export function tokenValue(theme: Theme, path: string): string | undefined {
  const parts = path.split(".");
  const leaf = parts.pop();
  const parent = parts.length ? subtree(theme, parts.join(".")) : tokenRoot(theme);
  const value = leaf && parent ? parent[leaf] : undefined;
  return typeof value === "object" || value === undefined ? undefined : String(value);
}

export interface Leaf {
  /** Path segments below the queried root. */
  readonly path: readonly string[];
  readonly value: string;
}

/** Every leaf under a tree, depth first, in source order. */
export function leaves(tree: TokenTree | undefined, prefix: readonly string[] = []): Leaf[] {
  if (!tree) return [];
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "object"
      ? leaves(value, [...prefix, key])
      : [{ path: [...prefix, key], value: String(value) }],
  );
}

/** The generated CSS custom property for a token path: `color.text.primary` → `--qx-color-text-primary`. */
export function cssVarFor(path: string | readonly string[]): string {
  const parts = typeof path === "string" ? path.split(".") : path;
  return `--qx-${parts.join("-")}`;
}

/** Semantic colour roles (themed, consumed by components) versus primitive ramps. */
export const semanticColorGroups = [
  "text",
  "surface",
  "border",
  "action",
  "feedback",
  "focus",
  "overlay",
  "selection",
  "rating",
  "syntax",
  "data",
] as const;

/** Colour groups in tokens.json that are not semantic roles: primitive ramps and aliases. */
export function primitiveColorGroups(): string[] {
  const color = subtree("light", "color") ?? {};
  return Object.keys(color).filter(
    (group) => !(semanticColorGroups as readonly string[]).includes(group),
  );
}

/** Semantic groups present in the JSON, known ones first, unknown new ones appended. */
export function presentSemanticGroups(): string[] {
  const color = subtree("light", "color") ?? {};
  const known = semanticColorGroups.filter((group) => group in color);
  return known;
}

/* ── Component bridge (shadcn contract) ──────────────────────────────────────────────────── */

export interface BridgeVariable {
  readonly name: string;
  readonly light?: string;
  readonly dark?: string;
}

function blockDeclarations(css: string, selector: string): Map<string, string> {
  const declarations = new Map<string, string>();
  const pattern = new RegExp(`(^|\\n)${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "g");
  for (const match of css.matchAll(pattern)) {
    for (const line of (match[2] ?? "").split(";")) {
      const index = line.indexOf(":");
      if (index < 0) continue;
      const name = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      if (name.startsWith("--") && !name.startsWith("--qx-")) declarations.set(name, value);
    }
  }
  return declarations;
}

/** The unprefixed bridge variables (`--background`, `--primary`, …) per theme, from tokens.css. */
export function bridgeVariables(): BridgeVariable[] {
  const light = blockDeclarations(tokensCss, ":root");
  const dark = blockDeclarations(tokensCss, ".dark");
  const names = [...new Set([...light.keys(), ...dark.keys()])];
  return names.map((name) => ({ name, light: light.get(name), dark: dark.get(name) }));
}

/** Whether a token value looks like a colour (not a length, number, shadow or var()). */
export function isColorValue(value: string): boolean {
  return /^(oklch|oklab|rgb|hsl|hwb|lab|lch|color|color-mix|#)/i.test(value.trim());
}
