/**
 * The governance layer around tokens, themes, density and the published stylesheet.
 *
 * `tokens.test.ts` proves the token *graph* is well formed. This file proves the *gates* over it
 * are the ones the documentation claims, because four of the five gaps this covers were not bad
 * code — they were a gate that measured something adjacent to what it reported:
 *
 *   - `check:token-usage` matched raw hex but not the named Tailwind palette, so three components
 *     bypassed the semantic layer while the scan printed "0 violations".
 *   - the theme list was the literal `["light", "dark"]` in three files, so a third theme
 *     directory was built by nothing and checked by nothing.
 *   - `check:contrast` reported six sub-3:1 border pairs as unexplained advisories and exited 0.
 *   - `styles.css` applied ~20 host-global selectors with no enumeration anywhere.
 *
 * So the assertions here are deliberately about bytes and lists rather than behaviour: the
 * scanner's own regex, the registry files, and the selector set of the published stylesheet.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DENSITY_APPLICABILITY,
  DENSITY_METRICS,
  DERIVABLE_DENSITY_APPLICABILITY,
} from "@/contracts/density";
import { THEME_ATTRIBUTE, THEME_DARK_CLASS } from "@/contracts/theme";
import { PALETTE_UTILITY } from "./palette-utility";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
/**
 * Comment lines removed, so an assertion about code is not satisfied by prose.
 *
 * Line-based on purpose: a regex block-comment stripper eats `"primitive/**\/*.json"` — the `/*`
 * inside a glob literal opens a comment it never closes — and every comment in these files
 * starts its own line anyway.
 */
const code = (p: string) =>
  read(p)
    .split("\n")
    .filter((line) => !/^\s*(?:\/\/|\/\*|\*)/.test(line))
    .join("\n");

const scanner = read("scripts/check/token-usage.mjs");
const contrastGate = read("scripts/check/contrast.mjs");
const themeRegistry = JSON.parse(read("scripts/config/themes.json")) as {
  themes: { name: string; selector: string; description: string }[];
};
const manifest = JSON.parse(read("component-manifest.json")) as {
  components: { slug: string; capabilities: Record<string, string> }[];
};

// ── TOKEN-001 · the palette rule and its enforcing regex ──────────────────────────────────
describe("token-usage: named Tailwind palette utilities", () => {
  it("declares a palette-utility rule", () => {
    expect(scanner).toContain('id: "palette-utility"');
  });

  // The component guards in code-block/json-tree/rating import PALETTE_UTILITY. If that copy
  // drifted laxer than the gate's, those guards would pass on classes the gate rejects.
  it("uses the same expression the component guards assert against", () => {
    const inScanner = scanner.slice(scanner.indexOf('id: "palette-utility"'));
    const pattern = /pattern:\s*\n?\s*(\/(?:[^\n\\]|\\.)+\/[gimsuy]*)/.exec(inScanner);
    expect(pattern).not.toBeNull();
    const source = (pattern as RegExpExecArray)[1].replace(/\/[gimsuy]*$/, "").slice(1);
    expect(source).toBe(PALETTE_UTILITY.source);
  });

  // The rule has to reject a real palette class and accept the semantic role that replaced it.
  it.each([
    ["text-sky-700", true],
    ["dark:text-sky-400", true],
    ["fill-amber-400", true],
    ["bg-rose-500/20", true],
    ["border-neutral-200", true],
    ["text-syntax-key", false],
    ["fill-rating-filled", false],
    ["bg-muted", false],
    ["text-success", false],
    ["z-50", false],
    ["duration-300", false],
    ["gap-0.5", false],
    ["text-chart-1", false],
  ])("%s → violation: %s", (utility, expected) => {
    expect(PALETTE_UTILITY.test(utility)).toBe(expected);
  });

  // Nothing may add a palette utility back to production source. This duplicates the gate on
  // purpose: `bun run test` and `bun run check:token-usage` fail independently.
  it("finds no palette utility anywhere in production component source", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(resolve(ROOT, dir), { withFileTypes: true })) {
        const path = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          walk(path);
        } else if (/\.tsx?$/.test(entry.name) && !/\.(test|stories)\.tsx?$/.test(entry.name)) {
          const match = PALETTE_UTILITY.exec(read(path));
          if (match) offenders.push(`${path}: ${match[0]}`);
        }
      }
    };
    for (const root of ["src/components", "src/blocks", "src/providers"]) walk(root);
    expect(offenders).toEqual([]);
  });
});

// ── THEME-001 · the build-time theme registry ─────────────────────────────────────────────
describe("theme registry", () => {
  it("registers exactly the theme directories that exist", () => {
    const directories = readdirSync(resolve(ROOT, "src/tokens/theme"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(themeRegistry.themes.map((t) => t.name).sort()).toEqual(directories);
  });

  it("puts the base theme first and gives every theme a selector and a reason", () => {
    expect(themeRegistry.themes[0]?.name).toBe("light");
    expect(themeRegistry.themes[0]?.selector).toBe(":root");
    for (const theme of themeRegistry.themes) {
      expect(theme.selector.trim()).not.toBe("");
      expect(theme.description.trim()).not.toBe("");
    }
  });

  it("keeps the dark theme on the class ThemeProvider toggles", () => {
    const dark = themeRegistry.themes.find((t) => t.name === "dark");
    expect(dark?.selector).toBe(`.${THEME_DARK_CLASS}`);
  });

  // The three consumers must read the registry rather than a literal list — that literal is what
  // made a third theme directory invisible to the build, to parity and to contrast.
  it.each(["scripts/build/tokens.mjs", "scripts/check/tokens.mjs", "scripts/check/contrast.mjs"])(
    "%s reads the registry instead of hard-coding the theme list",
    (file) => {
      const source = code(file);
      expect(source).toMatch(/from "\.\.\/lib\/themes\.mjs"/);
      expect(source).toMatch(/loadTheme(?:Names|Registry)\(/);
      // The specific shape that made a third theme invisible: iterating a literal pair.
      expect(source).not.toMatch(/for\s*\(\s*const\s+[^)]*\bof\s*\[\s*"light"/);
    },
  );

  it("emits every registered theme into the generated stylesheet", () => {
    const css = read("src/styles/tokens.css");
    for (const theme of themeRegistry.themes) {
      expect(css).toContain(`${theme.selector} {`);
    }
  });

  it("documents the brand-theme selector convention as a contract constant", () => {
    expect(THEME_ATTRIBUTE).toBe("data-qx-theme");
    expect(read("docs/standards/theming.md")).toContain(THEME_ATTRIBUTE);
  });
});

// ── CONTRAST-001 · the non-text tier and the exception register ───────────────────────────
describe("contrast gate", () => {
  it("has a blocking non-text (1.4.11) tier", () => {
    expect(contrastGate).toContain("const NON_TEXT_REQUIRED = [");
  });

  it("replaced the unexplained advisory list with a validated register", () => {
    expect(contrastGate).toContain("const KNOWN_1411_ISSUES = [");
    expect(contrastGate).not.toContain("const ADVISORY = [");
  });

  // A gate whose exceptions can go stale is a gate that stops meaning anything. The register is
  // validated in both directions, and the failure message has to say what to do.
  it("fails a stale exception and says how to promote it", () => {
    expect(contrastGate).toContain("stale.push");
    expect(contrastGate).toContain("Move it from KNOWN_1411_ISSUES to NON_TEXT_REQUIRED");
  });

  it("holds the code-syntax roles to AA as text, in every theme", () => {
    for (const role of ["key", "string", "number", "literal"]) {
      expect(contrastGate).toContain(`"color.syntax.${role}", "color.surface.default", 4.5`);
    }
  });
});

// ── DENSITY-001 · applicability is a claim, not a derivation ──────────────────────────────
describe("density applicability", () => {
  it("separates what source can derive from what review has to declare", () => {
    expect([...DENSITY_APPLICABILITY]).toEqual([
      "supported",
      "unsupported",
      "not-applicable",
      "unknown",
    ]);
    // The whole defect: `not-applicable` was derived. It is a design claim, so it may only be
    // declared. `unsupported` likewise.
    expect([...DERIVABLE_DENSITY_APPLICABILITY]).toEqual(["supported", "unknown"]);
    for (const value of DERIVABLE_DENSITY_APPLICABILITY) {
      expect(DENSITY_APPLICABILITY).toContain(value);
    }
    expect(DERIVABLE_DENSITY_APPLICABILITY).not.toContain("not-applicable");
  });

  it("only ever reports a value from the vocabulary", () => {
    for (const component of manifest.components) {
      expect(DENSITY_APPLICABILITY).toContain(component.capabilities.density);
    }
  });

  /**
   * The per-slug lock the aggregate ratchet cannot provide.
   *
   * `check:contract` counts `unknown` capabilities in total, so one component can lose density
   * support while another gains it and the count is unchanged. This list is the set of families
   * that read a density metric today; a component dropping out fails here by name.
   *
   * Growing the list is the expected direction — add the slug when a component starts consuming
   * density. Shrinking it is the regression.
   */
  const DENSITY_SUPPORTED = [
    "autocomplete",
    "button",
    "color-picker",
    "combobox",
    "country-picker",
    // Thin wrappers that inherit the metric: Input's height, or Button's `icon` size. Declared
    // in the registry rather than derived — see scripts/config/density-applicability.json.
    "currency-input",
    "data-table",
    "field",
    "icon-button",
    "input",
    "input-group",
    "mask-input",
    "menubar",
    "native-select",
    "navigation-menu",
    "number-field",
    "password-input",
    "select",
    "sidebar",
    "table",
    "tabs",
    "timezone-picker",
    "toggle",
    "toolbar",
  ];

  it("keeps every component that participates in density participating", () => {
    const supported = new Set(
      manifest.components.filter((c) => c.capabilities.density === "supported").map((c) => c.slug),
    );
    const lost = DENSITY_SUPPORTED.filter((slug) => !supported.has(slug));
    expect(lost).toEqual([]);
  });

  it("names any newly density-aware component in the lock list", () => {
    const gained = manifest.components
      .filter((c) => c.capabilities.density === "supported")
      .map((c) => c.slug)
      .filter((slug) => !DENSITY_SUPPORTED.includes(slug));
    expect(gained).toEqual([]);
  });

  it("publishes every contract metric under both the mode and the default name", () => {
    const css = read("src/styles/tokens.css");
    for (const metric of DENSITY_METRICS) {
      expect(css).toContain(`--qx-density-${metric}-default:`);
      expect(css).toContain(`--qx-density-${metric}:`);
    }
  });
});

// ── CSS-001 · the published stylesheet's host-global blast radius ─────────────────────────
describe("published stylesheet", () => {
  const base = read("src/styles/base.css");
  const index = read("src/styles/index.css");
  // The host-global layer is now declinable: `styles.css` is the full entry and `index.css` is
  // the same stylesheet without base.css, published as `@qeetrix/ui/core.css`. So "the entry that
  // imports the globals" is styles.css; index.css is asserted below to be free of them, which is
  // what makes the opt-out real. Composition and contiguity: src/__tests__/tokens.test.ts.
  const full = read("src/styles/styles.css");

  it("imports the host-global layer from the compatibility entry", () => {
    expect(full).toContain('@import "./base.css";');
    // Every @import has to stay contiguous at the top: CSS only honours @import before any other
    // rule, so appending the host-global layer at the bottom of the entry would silently drop it.
    const entry = full.replace(/\/\*[\s\S]*?\*\//g, "");
    const lastImport = entry.lastIndexOf("@import");
    const firstOtherRule = entry.search(/^\s*(?!@import)(?:@|[.:[*a-z#])/im);
    expect(lastImport).toBeGreaterThan(-1);
    // -1 means the entry is nothing but @imports, which is the strongest form of contiguous.
    expect(firstOtherRule === -1 || lastImport < firstOtherRule).toBe(true);
  });

  it("leaves no host-global rule behind in the entry", () => {
    expect(index).not.toContain("@layer base {");
    expect(index).not.toContain("forced-colors: active");
  });

  /**
   * The enumerated blast radius.
   *
   * Every selector below is applied to the *host document* by `@qeetrix/ui/styles.css` — not to a
   * Qeetrix component. Adding one is a decision about someone else's application, so it has to be
   * added here too. Documented in docs/standards/theming.md § What styles.css does to your
   * document; scoping the set is a breaking change and deliberately not attempted here.
   */
  const HOST_GLOBAL_SELECTORS = [
    "*",
    "*,\n    *::before,\n    *::after",
    "html",
    "body",
    "::selection",
    "h1,\n  h2,\n  h3,\n  h4,\n  h5,\n  h6",
    'button:not(:disabled),\n  [role="button"]:not(:disabled)',
    ":focus-visible",
    ":root,\n  .dark",
  ];

  it("applies exactly the reviewed set of host-global selectors", () => {
    for (const selector of HOST_GLOBAL_SELECTORS) {
      expect(base).toContain(`${selector} {`);
    }
  });

  it("keeps every element-level rule inside base.css, never in index.css", () => {
    // A bare element selector at the start of a line in the entry would be a new host-global rule
    // that escaped the enumeration above.
    const escaped = index
      .split("\n")
      .filter((line) =>
        /^(?:html|body|h[1-6]|button|input|select|textarea|label|a|p|ul|ol|li)\b/.test(line),
      );
    expect(escaped).toEqual([]);
  });

  it("restyles host buttons and headings — recorded so consumers can find out from a test", () => {
    expect(base).toMatch(/h1,\n {2}h2,[\s\S]*?font-heading/);
    expect(base).toMatch(/button,[\s\S]*?font-family: var\(--font-ui\)/);
  });
});
