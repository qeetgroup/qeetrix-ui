// @vitest-environment node
/**
 * Token governance — the rules the token source and its generated CSS have to keep.
 *
 * Three things are locked here:
 *
 *   1. the token graph (scripts/lib/tokens.mjs): layering, references, types, theme parity;
 *   2. the foundation's measurable promises: WCAG 2.2 AA for the pairs the semantic roles
 *      are designed for, in every registered theme, measured on the generated CSS the browser
 *      actually receives — var() chains followed, color-mix() mixed, translucent fills
 *      composited over the surface they sit on;
 *   3. the host-global surface of base.css, so a new rule on a consumer's document is a
 *      reviewed change to the list below rather than a line that slips in.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { converter, formatHex, parse, wcagContrast } from "culori";
import { beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error — plain ESM build tooling, no declarations.
import {
  loadTokenGraph,
  readThemeVariables,
  validateTokenGraph,
} from "../../scripts/lib/tokens.mjs";

type Color = { mode: string; alpha?: number; [channel: string]: number | string | undefined };
type Finding = { rule: string; token: string; theme: string | null; message: string };

const root = fileURLToPath(new URL("../..", import.meta.url));
const tokensCss = join(root, "src/styles/tokens.css");
const themes: { name: string; selector: string; colorScheme: string }[] = JSON.parse(
  readFileSync(join(root, "scripts/config/themes.json"), "utf8"),
).themes;

const rgb = converter("rgb");
const oklab = converter("oklab");

/** Every registered theme's variables, with the base theme's inherited underneath. */
function readThemes(css: string): Map<string, Map<string, string>> {
  const bySelector = new Map<string, Map<string, string>>();
  for (const block of css.matchAll(/(?:^|\n)([^\n{}]+?)\s*\{([\s\S]*?)\n\}/g)) {
    const selector = block[1].trim();
    const vars = bySelector.get(selector) ?? new Map<string, string>();
    for (const d of block[2].matchAll(/^\s*(--[a-z0-9-]+):\s*(.+?);\s*$/gm)) vars.set(d[1], d[2]);
    bySelector.set(selector, vars);
  }
  const base = bySelector.get(themes[0].selector) ?? new Map();
  return new Map(
    themes.map((t) => [
      t.name,
      new Map([...base, ...(t === themes[0] ? [] : (bySelector.get(t.selector) ?? []))]),
    ]),
  );
}

function resolve(vars: Map<string, string>, value: string): string {
  let out = value;
  for (let guard = 0; /var\(/.test(out) && guard < 50; guard++) {
    out = out.replace(/var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^()]*))?\)/g, (_, name, fallback) => {
      const hit = vars.get(name) ?? fallback;
      if (hit === undefined) throw new Error(`${name} is not defined`);
      return hit;
    });
  }
  return out;
}

const splitTopLevel = (s: string) => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  parts.push(current.trim());
  return parts;
};

/** A CSS colour expression, including `color-mix(in oklab, A p%, B)` with B a colour or transparent. */
function toColor(expression: string): Color {
  const expr = expression.trim();
  if (expr === "transparent") return { mode: "rgb", r: 0, g: 0, b: 0, alpha: 0 };
  const mix = /^color-mix\(\s*in oklab\s*,([\s\S]*)\)$/.exec(expr);
  if (!mix) {
    const parsed = parse(expr) as Color | undefined;
    if (!parsed) throw new Error(`not a colour: ${expr}`);
    return parsed;
  }
  const [a, b] = splitTopLevel(mix[1]).map((part) => {
    const m = /^(.*?)\s+(\d+(?:\.\d+)?)%$/.exec(part);
    return m ? { c: toColor(m[1]), p: Number(m[2]) / 100 } : { c: toColor(part), p: null };
  });
  const pa = a.p ?? (b.p === null ? 0.5 : 1 - b.p);
  const pb = 1 - pa;
  const la = oklab(a.c) as Color;
  const lb = oklab(b.c) as Color;
  const aa = la.alpha ?? 1;
  const ab = lb.alpha ?? 1;
  const alpha = aa * pa + ab * pb;
  const channel = (k: string) =>
    alpha === 0 ? 0 : ((la[k] as number) * aa * pa + (lb[k] as number) * ab * pb) / alpha;
  return { mode: "oklab", l: channel("l"), a: channel("a"), b: channel("b"), alpha };
}

const over = (fg: Color, bg: Color): Color => {
  const f = rgb(fg) as Color;
  const b = rgb(bg) as Color;
  const a = f.alpha ?? 1;
  const mixChannel = (k: string) => (f[k] as number) * a + (b[k] as number) * (1 - a);
  return { mode: "rgb", r: mixChannel("r"), g: mixChannel("g"), b: mixChannel("b") };
};

/** "--a over --b": layers composited innermost-first onto an opaque base. */
function surface(vars: Map<string, string>, spec: string): Color {
  const layers = spec.split(/\s+over\s+/).map((v) => toColor(resolve(vars, `var(${v})`)));
  let acc = layers.pop() as Color;
  // A translucent surface (the dark tints, the selection wash) is designed to sit on a surface;
  // with none named, measure it where it is designed to sit: the theme's default surface.
  if ((rgb(acc).alpha ?? 1) < 1)
    acc = over(acc, toColor(resolve(vars, "var(--qx-color-surface-default)")));
  while (layers.length) acc = over(layers.pop() as Color, acc);
  return acc;
}

const contrast = (vars: Map<string, string>, fg: string, bg: string) =>
  wcagContrast(surface(vars, `${fg} over ${bg}`), surface(vars, bg));

const SURFACES = [
  "canvas",
  "default",
  "elevated",
  "overlay",
  "sunken",
  "subtle",
  "interactive",
  "interactive-hover",
  "brand-subtle",
  "brand-subtle-hover",
  "rail",
].map((s) => `--qx-color-surface-${s}`);
const BODY_TEXT = ["primary", "secondary", "tertiary", "placeholder"].map(
  (t) => `--qx-color-text-${t}`,
);

/** [foreground, background, minimum]. 4.5 is text; 3 is a control boundary, focus or chart mark. */
const AA_PAIRS: [string, string, number][] = [
  ...BODY_TEXT.flatMap((t) => SURFACES.map((s): [string, string, number] => [t, s, 4.5])),
  ...["link", "link-hover", "brand"].flatMap((t) =>
    SURFACES.map((s): [string, string, number] => [`--qx-color-text-${t}`, s, 4.5]),
  ),
  ...["", "-hover", "-active"].map((s): [string, string, number] => [
    "--qx-color-text-on-brand",
    `--qx-color-action-primary${s}`,
    4.5,
  ]),
  ...["", "-hover", "-active"].map((s): [string, string, number] => [
    "--qx-color-text-on-subtle",
    `--qx-color-surface-brand-subtle${s}`,
    4.5,
  ]),
  ...(["success", "warning", "error", "info"] as const).flatMap((s): [string, string, number][] => {
    const text = `--qx-color-text-${s === "error" ? "danger" : s}`;
    return [
      [text, "--qx-color-surface-default", 4.5],
      [text, "--qx-color-surface-canvas", 4.5],
      [text, `--qx-color-feedback-${s}-subtle over --qx-color-surface-default`, 4.5],
      ["--qx-color-text-on-feedback", `--qx-color-feedback-${s}`, 4.5],
    ];
  }),
  // the solid (strong) status fills and their labels — theme-invariant
  ["--qx-color-text-on-feedback-strong", "--qx-color-feedback-error-strong", 4.5],
  ["--qx-color-text-on-feedback-strong", "--qx-color-feedback-success-strong", 4.5],
  ["--qx-color-text-on-feedback-strong", "--qx-color-feedback-info-strong", 4.5],
  ["--qx-color-text-on-warning-strong", "--qx-color-feedback-warning-strong", 4.5],
  // the shadcn bridge, which is what most components actually paint with
  ["--foreground", "--background", 4.5],
  ["--card-foreground", "--card", 4.5],
  ["--popover-foreground", "--popover", 4.5],
  ["--primary-foreground", "--primary", 4.5],
  ["--secondary-foreground", "--secondary", 4.5],
  ["--accent-foreground", "--accent", 4.5],
  ["--muted-foreground", "--background", 4.5],
  ["--muted-foreground", "--card", 4.5],
  ["--muted-foreground", "--muted", 4.5],
  ["--muted-foreground", "--accent", 4.5],
  ...["destructive", "success", "warning", "info"].map((s): [string, string, number] => [
    `--${s}-foreground`,
    `--${s}`,
    4.5,
  ]),
  ["--sidebar-foreground", "--sidebar", 4.5],
  ["--sidebar-accent-foreground", "--sidebar-accent", 4.5],
  ["--sidebar-selected-foreground", "--sidebar-selected", 4.5],
  ["--sidebar-primary-foreground", "--sidebar-primary", 4.5],
  ["--sidebar-indicator", "--sidebar", 3],
  ["--sidebar-indicator", "--sidebar-selected", 3],
  // control boundaries and focus (WCAG 1.4.11)
  ...["--qx-color-border-control", "--input", "--ring", "--qx-color-border-brand"].flatMap((v) =>
    SURFACES.map((s): [string, string, number] => [v, s, 3]),
  ),
  [
    "--qx-component-input-border",
    "--qx-component-input-background over --qx-color-surface-default",
    3,
  ],
  [
    "--qx-color-text-primary",
    "--qx-component-input-background over --qx-color-surface-default",
    4.5,
  ],
  [
    "--qx-color-text-placeholder",
    "--qx-component-input-background over --qx-color-surface-default",
    4.5,
  ],
  // the selected tint on the lighter surfaces it also sits on (menus, popovers, the sidebar)
  ...["--qx-color-surface-overlay", "--qx-color-surface-elevated", "--sidebar"].flatMap(
    (base): [string, string, number][] => [
      ["--qx-color-text-on-subtle", `--qx-color-surface-brand-subtle over ${base}`, 4.5],
      ["--qx-color-text-brand", `--qx-color-surface-brand-subtle over ${base}`, 4.5],
      ["--qx-color-border-brand", `--qx-color-surface-brand-subtle over ${base}`, 3],
    ],
  ),
  // selected text stays readable
  [
    "--qx-color-text-primary",
    "--qx-color-selection-background over --qx-color-surface-default",
    4.5,
  ],
  ["--qx-color-text-link", "--qx-color-selection-background over --qx-color-surface-default", 4.5],
  // code and data
  ...["key", "string", "number", "literal", "punctuation", "comment"].flatMap((k) =>
    ["--qx-color-surface-subtle", "--qx-color-surface-sunken", "--muted"].map(
      (s): [string, string, number] => [`--syntax-${k}`, s, 4.5],
    ),
  ),
  ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((n) =>
    ["--qx-color-surface-default", "--qx-color-surface-canvas"].map(
      (s): [string, string, number] => [`--chart-${n}`, s, 3],
    ),
  ),
  ...["positive", "negative", "warning", "axis", "reference"].map((k): [string, string, number] => [
    `--chart-${k}`,
    "--qx-color-surface-default",
    3,
  ]),
];

let byTheme: Map<string, Map<string, string>>;

beforeAll(() => {
  // tokens.css is generated and gitignored; a fresh checkout has not built it yet.
  if (!existsSync(tokensCss)) execFileSync("node", ["scripts/build/tokens.mjs"], { cwd: root });
  byTheme = readThemes(readFileSync(tokensCss, "utf8"));
});

describe("token graph", () => {
  it("passes every rule in scripts/lib/tokens.mjs", () => {
    const graph = loadTokenGraph({ root });
    const findings: Finding[] = validateTokenGraph({
      graph,
      themeVariables: readThemeVariables(join(root, "src/styles/index.css")),
      themes: themes.map((t) => t.name),
    });
    expect(graph.tokens.size).toBeGreaterThan(500);
    expect(
      findings.map((f) => `${f.rule} ${f.token}${f.theme ? `@${f.theme}` : ""}: ${f.message}`),
    ).toEqual([]);
  });
});

describe("foundation contrast (WCAG 2.2 AA)", () => {
  for (const theme of themes) {
    it(`${theme.name}: every designed pair meets its minimum`, () => {
      const vars = byTheme.get(theme.name) as Map<string, string>;
      const failures = AA_PAIRS.map(([fg, bg, min]) => ({
        fg,
        bg,
        min,
        ratio: contrast(vars, fg, bg),
      }))
        .filter((r) => r.ratio < r.min)
        .map((r) => `${r.fg} on ${r.bg}: ${r.ratio.toFixed(2)}:1 < ${r.min}:1`);
      expect(failures).toEqual([]);
    });
  }
});

describe("brand and ramps", () => {
  const primitives = JSON.parse(
    readFileSync(join(root, "src/tokens/primitive/color.json"), "utf8"),
  ).color;

  it("Qeet 500 is #F26D0E exactly; the primary action is Qeet Ember with white text in every theme", () => {
    expect(formatHex(toColor(primitives.qeet["500"].$value))).toBe("#f26d0e");
    const ember = formatHex(toColor(primitives.qeet["600"].$value));
    for (const theme of themes) {
      const vars = byTheme.get(theme.name) as Map<string, string>;
      expect(formatHex(toColor(resolve(vars, "var(--primary)")))).toBe(ember);
      expect(formatHex(toColor(resolve(vars, "var(--primary-foreground)")))).toBe("#ffffff");
    }
    // the brand orange itself cannot carry white text, which is why it is not the action fill
    expect(wcagContrast("#f26d0e", "#ffffff")).toBeLessThan(4.5);
  });

  it("dark mode is neutral near-black, not warm charcoal", () => {
    const vars = byTheme.get("dark") as Map<string, string>;
    for (const surface of ["canvas", "default", "elevated", "overlay", "sunken"]) {
      const c = oklab(toColor(resolve(vars, `var(--qx-color-surface-${surface})`))) as Color;
      expect(Math.hypot(c.a as number, c.b as number), surface).toBeLessThan(0.004);
      expect(c.l as number, surface).toBeLessThan(0.25);
    }
  });

  it("the brand ramp is Qeet's own, not an alias of another palette", () => {
    for (const [step, token] of Object.entries<{ $value: string }>(primitives.brand)) {
      if (step.startsWith("$")) continue;
      expect(token.$value).toBe(`{color.qeet.${step}}`);
    }
  });

  it.each(["qeet", "danger", "success", "warning", "info"])(
    "%s is a real ramp: no aliases, lightness strictly falling",
    (ramp) => {
      const steps = Object.entries<{ $value: string }>(primitives[ramp]).filter(
        ([k]) => !k.startsWith("$"),
      );
      expect(steps.length).toBeGreaterThanOrEqual(11);
      const lightness = steps.map(([, t]) => {
        expect(t.$value).not.toMatch(/\{/);
        return (oklab(toColor(t.$value)) as Color).l as number;
      });
      for (let i = 1; i < lightness.length; i++)
        expect(lightness[i]).toBeLessThan(lightness[i - 1]);
    },
  );
});

describe("theme-scoped values", () => {
  it.each([
    "--qx-elevation-raised",
    "--qx-elevation-overlay",
    "--qx-elevation-modal",
    "--qx-gradient-surface-fade",
  ])("%s is authored per theme, not inherited from light", (variable) => {
    const values = themes.map((t) => byTheme.get(t.name)?.get(variable));
    expect(values.every(Boolean)).toBe(true);
    expect(new Set(values).size).toBe(themes.length);
  });

  it("base.css declares each theme's native color-scheme", () => {
    const base = readFileSync(join(root, "src/styles/base.css"), "utf8");
    for (const t of themes) {
      const escaped = t.selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(base).toMatch(new RegExp(`${escaped}\\s*\\{\\s*color-scheme:\\s*${t.colorScheme};`));
    }
  });
});

describe("host-global surface of base.css", () => {
  /** The rules @qeetrix/ui/styles.css applies to the consumer's document. docs/standards/theming.md. */
  const HOST_GLOBAL = [
    ":root",
    ".dark",
    "*",
    "html",
    "body",
    "::selection",
    "h1, h2, h3, h4, h5, h6",
    'button, [role="button"], input, select, textarea, label, [data-slot="dropdown-menu-item"], [data-slot="dropdown-menu-label"], [data-slot="sidebar-menu-button"], [data-slot="sidebar-menu-sub-button"], [data-slot="sidebar-group-label"], [data-slot="breadcrumb-list"]',
    'button:not(:disabled), [role="button"]:not(:disabled)',
    '[data-slot="skeleton"]',
    '[data-slot="skeleton"]::after',
    "@keyframes qx-shimmer",
    "@media (prefers-reduced-motion: reduce)",
    // `forced-color-adjust: auto` on native controls: a layered default since the integration
    // pass, so a component's own opt-out wins without `!` (theming.md § Forced colours).
    "@media (forced-colors: active)",
  ];

  it("is exactly the reviewed list", () => {
    const css = readFileSync(join(root, "src/styles/base.css"), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    const layer = css.slice(css.indexOf("@layer base"));
    const selectors: string[] = [];
    let depth = 0;
    let buffer = "";
    for (const ch of layer) {
      if (ch === "{") {
        if (depth === 1)
          selectors.push(
            buffer
              .trim()
              .replace(/\s+/g, " ")
              .replace(/\s*,\s*/g, ", "),
          );
        depth++;
        buffer = "";
      } else if (ch === "}") {
        depth--;
        buffer = "";
        if (depth === 0) break;
      } else if (ch === ";") buffer = "";
      else buffer += ch;
    }
    expect(selectors).toEqual(HOST_GLOBAL);
  });
});
