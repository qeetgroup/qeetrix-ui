/**
 * The design-token architecture.
 *
 * Three groups of tests, for three different jobs:
 *
 *   1. **the rules**, against synthetic graphs — each rule has to fail on a graph built to
 *      break it. Testing only against the repository would pass whether or not the rule works,
 *      because the repository is currently clean.
 *   2. **the real graph** — the four layers, the ownership direction, theme parity, and the
 *      invariant that a component can never resolve a primitive at runtime.
 *   3. **the pilot components** — that every token they now read resolves to exactly the value
 *      the utility class it replaced resolved to, in both themes. That is what makes the
 *      migration provably non-visual.
 */
import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DENSITY_MODES, DENSITY_TOKEN_PREFIX } from "@/contracts/density";
import { DURATION, EASING, SHADOW, Z_INDEX } from "@/foundations/token-values";
import {
  buildTokenGraph,
  classifyFile,
  cssVariableFor,
  densityAwareVariables,
  loadTokenGraph,
  readReferences,
  readThemeVariables,
  TOKEN_LAYER_RULES,
  validateTokenGraph,
} from "../../scripts/lib/tokens.mjs";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const graph = loadTokenGraph({ root: ROOT });
const themeVariables = readThemeVariables(resolve(ROOT, "src/styles/index.css"));
const findings = validateTokenGraph({ graph, themeVariables });

/**
 * The full style entry with its relative `@import`s inlined.
 *
 * There are two entries now — `styles.css` (everything) and `index.css` (no host-global layer,
 * published as `@qeetrix/ui/core.css`) — so "what the stylesheet references" is a property of the
 * composition, not of one file. Package `@import`s are not followed: a dependency's variables are
 * not this library's to resolve.
 */
const effectiveEntry = ((entryPath: string, seen = new Set<string>()): string => {
  const inline = (path: string): string => {
    const absolute = resolve(ROOT, path);
    if (seen.has(absolute)) return "";
    seen.add(absolute);
    return read(path).replace(/^[ \t]*@import\s+["'](\.[^"']+)["'][^;]*;/gm, (_m, specifier) =>
      inline(relative(ROOT, resolve(dirname(absolute), specifier))),
    );
  };
  return inline(entryPath);
})("src/styles/styles.css");

const tokensJson = JSON.parse(read("src/styles/tokens.json"));
const runtimeCss = read("src/styles/tokens.css");
const rawCss = read("src/styles/tokens.raw.css");

type Findings = { rule: string; message: string; token: string }[];
const rules = (f: Findings) => f.map((x) => x.rule);

/** Validate a graph assembled from `path -> json` fixtures. */
function check(files: Record<string, unknown>): Findings {
  return validateTokenGraph({
    graph: buildTokenGraph({ files: files as Record<string, object> }),
  }) as Findings;
}

const colour = (value: string) => ({ $value: value, $type: "color" });
const dimension = (value: string) => ({ $value: value, $type: "dimension" });

// ─────────────────────────────────────────────────────────────────────────────────────────
describe("token rules", () => {
  it("accepts primitive → semantic → component", () => {
    expect(
      check({
        "src/tokens/primitive/color.json": { color: { blue: { "500": colour("#00f") } } },
        "src/tokens/semantic/color.json": { paint: { action: colour("{color.blue.500}") } },
        "src/tokens/component/button.json": {
          component: { button: { background: colour("{paint.action}") } },
        },
      }),
    ).toEqual([]);
  });

  it("rejects a component reaching past semantic into a primitive", () => {
    const found = check({
      "src/tokens/primitive/color.json": { color: { blue: { "500": colour("#00f") } } },
      "src/tokens/component/button.json": {
        component: { button: { background: colour("{color.blue.500}") } },
      },
    });
    expect(rules(found)).toContain("layer");
    expect(found[0].message).toContain("component → primitive is not allowed");
  });

  it("rejects a semantic token reaching forward into a component", () => {
    const found = check({
      "src/tokens/component/button.json": {
        component: { button: { background: colour("#00f") } },
      },
      "src/tokens/semantic/color.json": {
        paint: { action: colour("{component.button.background}") },
      },
    });
    expect(rules(found)).toContain("layer");
  });

  it("rejects one component coupling to another", () => {
    const found = check({
      "src/tokens/semantic/color.json": { paint: { surface: colour("#fff") } },
      "src/tokens/component/dialog.json": {
        component: { dialog: { background: colour("{paint.surface}") } },
      },
      "src/tokens/component/card.json": {
        component: { card: { background: colour("{component.dialog.background}") } },
      },
    });
    expect(rules(found)).toContain("cross-component");
    expect(found.find((f) => f.rule === "cross-component")?.message).toContain(
      "components share meaning through a semantic token",
    );
  });

  it("allows a component to reference its own tokens", () => {
    expect(
      check({
        "src/tokens/primitive/color.json": { color: { blue: { "500": colour("#00f") } } },
        "src/tokens/semantic/color.json": { paint: { action: colour("{color.blue.500}") } },
        "src/tokens/component/button.json": {
          component: {
            button: {
              background: colour("{paint.action}"),
              "background-hover": colour("{component.button.background}"),
            },
          },
        },
      }),
    ).toEqual([]);
  });

  it("detects a reference to a token that does not exist", () => {
    const found = check({
      "src/tokens/semantic/color.json": { paint: { action: colour("{color.nope.500}") } },
    });
    expect(rules(found)).toContain("missing-reference");
  });

  it("detects a circular reference and names the chain", () => {
    const found = check({
      "src/tokens/semantic/color.json": {
        paint: { a: colour("{paint.b}"), b: colour("{paint.c}"), c: colour("{paint.a}") },
      },
    });
    const circular = found.find((f) => f.rule === "circular");
    expect(circular).toBeDefined();
    expect(circular?.message).toContain("paint.a");
    expect(circular?.message).toContain("paint.b");
    expect(circular?.message).toContain("paint.c");
  });

  it("detects a self-reference", () => {
    expect(
      rules(check({ "src/tokens/semantic/color.json": { paint: { a: colour("{paint.a}") } } })),
    ).toContain("circular");
  });

  it("rejects a reference across incompatible types", () => {
    const found = check({
      "src/tokens/primitive/space.json": { space: { "4": dimension("16px") } },
      "src/tokens/semantic/color.json": { paint: { action: colour("{space.4}") } },
    });
    expect(rules(found)).toContain("type");
    expect(found.find((f) => f.rule === "type")?.message).toContain("expects a color");
  });

  it("allows a colour inside a gradient's stops", () => {
    expect(
      check({
        "src/tokens/primitive/color.json": { color: { blue: { "500": colour("#00f") } } },
        "src/tokens/primitive/gradient.json": {
          gradient: {
            brand: {
              $type: "gradient",
              $value: { angle: "90deg", stops: [{ color: "{color.blue.500}", position: 0 }] },
            },
          },
        },
      }),
    ).toEqual([]);
  });

  it("detects a path used as both a token and a group", () => {
    const found = check({
      "src/tokens/theme/light/bridge.json": { input: colour("#fff") },
      "src/tokens/component/input.json": { input: { background: colour("#fff") } },
    });
    expect(rules(found)).toContain("path-collision");
    expect(found.find((f) => f.rule === "path-collision")?.message).toContain("without an error");
  });

  it("rejects an undocumented literal above the primitive layer", () => {
    const found = check({
      "src/tokens/semantic/color.json": { paint: { action: colour("#00f") } },
    });
    expect(rules(found)).toContain("raw-value");
  });

  it("allows a documented literal, including one documented by its group", () => {
    expect(
      check({
        "src/tokens/semantic/layer.json": {
          z: { $description: "The stacking ladder.", modal: { $value: "1400", $type: "number" } },
        },
      }),
    ).toEqual([]);
  });

  it("rejects a non-kebab segment and a physical direction", () => {
    const found = check({
      "src/tokens/semantic/space.json": {
        inset: { $description: "d", Left: dimension("4px"), left: dimension("4px") },
      },
    });
    const naming = found.filter((f) => f.rule === "naming").map((f) => f.message);
    expect(naming.join()).toContain("not kebab-case");
    expect(naming.join()).toContain("physical direction");
  });

  it("requires component tokens to live under component.*", () => {
    const found = check({
      "src/tokens/component/button.json": {
        button: { $description: "d", corner: dimension("4px") },
      },
    });
    expect(found.find((f) => f.rule === "naming")?.message).toContain('"component.*" namespace');
  });

  it("rejects a dark token with no base value", () => {
    const found = check({
      "src/tokens/theme/dark/semantic.json": { paint: { $description: "d", a: colour("#000") } },
    });
    expect(found.find((f) => f.rule === "theme-parity")?.message).toContain("has no base value");
  });

  it("rejects a token whose type changes between themes", () => {
    const found = check({
      "src/tokens/theme/light/semantic.json": { paint: { $description: "d", a: colour("#fff") } },
      "src/tokens/theme/dark/semantic.json": {
        paint: { $description: "d", a: dimension("4px") },
      },
    });
    expect(found.find((f) => f.rule === "theme-parity")?.message).toContain(
      "is a color in light but a dimension in dark",
    );
  });

  describe("deprecation", () => {
    const deprecated = (replacement: string | null) => ({
      $value: "#00f",
      $type: "color",
      $extensions: {
        "qeetrix.deprecated": { since: "1.1.0", reason: "renamed for clarity", replacement },
      },
    });

    it("accepts a complete record pointing at a live token", () => {
      expect(
        check({
          "src/tokens/primitive/color.json": {
            color: { old: deprecated("color.new"), new: colour("#00f") },
          },
        }),
      ).toEqual([]);
    });

    it("rejects a replacement that does not exist", () => {
      const found = check({
        "src/tokens/primitive/color.json": { color: { old: deprecated("color.nope") } },
      });
      expect(found.find((f) => f.rule === "deprecation")?.message).toContain(
        "which is not a token",
      );
    });

    it("rejects a replacement that is itself deprecated", () => {
      const found = check({
        "src/tokens/primitive/color.json": {
          color: {
            old: deprecated("color.mid"),
            mid: deprecated("color.new"),
            new: colour("#00f"),
          },
        },
      });
      expect(found.map((f) => f.message).join()).toContain("which is also deprecated");
    });

    it("requires an explicit decision about a replacement", () => {
      const found = check({
        "src/tokens/primitive/color.json": {
          color: {
            old: {
              $value: "#00f",
              $type: "color",
              $extensions: { "qeetrix.deprecated": { since: "1.1.0", reason: "r" } },
            },
          },
        },
      });
      expect(found.find((f) => f.rule === "deprecation")?.message).toContain(
        "use null to state that there is no successor",
      );
    });

    it("stops a live token from pointing at a deprecated one", () => {
      const found = check({
        "src/tokens/primitive/color.json": {
          color: { old: deprecated(null), new: colour("{color.old}") },
        },
      });
      expect(found.find((f) => f.rule === "deprecation")?.message).toContain(
        "references the deprecated token color.old",
      );
    });
  });

  it("warns when a colour is defined only in the base theme", () => {
    const found = check({
      "src/tokens/theme/light/semantic.json": { paint: { $description: "d", a: colour("#fff") } },
    });
    expect(found.find((f) => f.rule === "theme-parity")?.message).toContain("dark mode inherits");
  });
});

describe("token plumbing", () => {
  it("classifies a file by its location", () => {
    expect(classifyFile("src/tokens/primitive/color.json")).toEqual({
      layer: "primitive",
      theme: null,
      bridge: false,
    });
    expect(classifyFile("src/tokens/semantic/motion.json").layer).toBe("semantic");
    expect(classifyFile("src/tokens/component/button.json").layer).toBe("component");
    expect(classifyFile("src/tokens/theme/dark/semantic.json")).toEqual({
      layer: "semantic",
      theme: "dark",
      bridge: false,
    });
    expect(classifyFile("src/tokens/theme/light/bridge.json")).toEqual({
      layer: "component",
      theme: "light",
      bridge: true,
    });
  });

  it("derives the emitted variable name, prefixed except for the bridge", () => {
    expect(cssVariableFor(["color", "text", "on-brand"], false)).toBe("--qx-color-text-on-brand");
    expect(cssVariableFor(["primary"], true)).toBe("--primary");
  });

  it("reads references out of aliases, css vars and composite values", () => {
    expect(readReferences("{color.blue.500}").aliases).toEqual([
      { ref: "color.blue.500", field: null },
    ]);
    expect(readReferences("var(--qx-color-action-primary)").cssVars[0].ref).toBe(
      "--qx-color-action-primary",
    );
    expect(readReferences({ stops: [{ color: "{color.blue.500}" }] }).aliases[0]).toEqual({
      ref: "color.blue.500",
      field: "color",
    });
  });

  it("declares a dependency rule for every layer, flowing one way", () => {
    for (const [layer, allowed] of Object.entries(
      TOKEN_LAYER_RULES as Record<string, readonly string[]>,
    )) {
      expect(allowed.length, `${layer} has no rule`).toBeGreaterThan(0);
    }
    expect(TOKEN_LAYER_RULES.primitive).toEqual(["primitive"]);
    expect(TOKEN_LAYER_RULES.semantic).not.toContain("component");
    expect(TOKEN_LAYER_RULES.component).not.toContain("primitive");
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────
describe("the real token graph", () => {
  it("has no violations", () => {
    expect(findings.map((f) => `${f.rule}: ${f.token} — ${f.message}`)).toEqual([]);
  });

  it("is populated at all four layers", () => {
    const count = (layer: string) =>
      [...graph.tokens.values()].filter((t: { layer: string }) => t.layer === layer).length;
    expect(count("primitive")).toBeGreaterThan(100);
    expect(count("semantic")).toBeGreaterThan(50);
    expect(count("component")).toBeGreaterThan(20);
  });

  it("routes every bridge token through the semantic layer", () => {
    const bridge = [...graph.tokens.values()].filter((t: { bridge: boolean }) => t.bridge);
    expect(bridge.length).toBeGreaterThan(40);
    const primitiveBacked = bridge.filter(
      (t: { aliases: { ref: string }[] }) =>
        !t.aliases.every(({ ref }) => {
          const target = [...graph.tokens.values()].find((c: { key: string }) => c.key === ref) as
            | { layer: string }
            | undefined;
          return target?.layer === "semantic";
        }),
    );
    expect(primitiveBacked.map((t: { key: string }) => t.key)).toEqual([]);
  });
});

describe("what the runtime can resolve", () => {
  // The invariant behind "components must not depend on primitive values": the primitives are
  // not published to the stylesheet components render against, so the dependency is impossible
  // rather than merely discouraged.
  it("publishes the semantic and component layers to the style entry", () => {
    for (const variable of [
      "--qx-color-action-primary",
      "--qx-color-surface-default",
      "--qx-elevation-raised",
      "--qx-motion-easing-standard",
      "--qx-focus-ring-width",
      "--qx-state-opacity-disabled",
      "--qx-component-button-primary-background",
      "--qx-component-input-background",
    ]) {
      expect(runtimeCss, `${variable} must be resolvable`).toContain(`${variable}:`);
    }
  });

  it("withholds the primitive layer from the style entry", () => {
    for (const variable of [
      "--qx-color-neutral-500",
      "--qx-color-orange-500",
      "--qx-shadow-rest",
    ]) {
      expect(runtimeCss).not.toContain(`${variable}:`);
    }
    // …while the full export still carries them, for consumers that want the ramps.
    expect(rawCss).toContain("--qx-color-neutral-500:");
  });

  it("resolves every --qx-* variable the style entry references", () => {
    // The full entry, so a variable referenced only by the host-global layer is still checked.
    const entry = effectiveEntry;
    const referenced = new Set([...entry.matchAll(/var\((--qx-[a-z0-9-]+)/g)].map((m) => m[1]));
    const unresolved = [...referenced].filter((v) => !runtimeCss.includes(`${v}:`));
    // The marquee variables are supplied per element as inline styles, by design.
    expect(unresolved).toEqual(["--qx-marquee-duration", "--qx-marquee-gap"]);
  });

  it("declares each variable once per selector", () => {
    for (const block of runtimeCss.split("}").slice(0, -1)) {
      const names = [...block.matchAll(/^\s*(--[a-zA-Z0-9-]+):/gm)].map((m) => m[1]);
      expect(new Set(names).size, `duplicate declaration in ${block.slice(0, 40)}`).toBe(
        names.length,
      );
    }
  });
});

// ── CSS-001 · two published entries, one body ────────────────────────────────────────────
describe("published stylesheet entries", () => {
  const core = read("src/styles/index.css");
  const full = read("src/styles/styles.css");

  /**
   * The opt-out is a composition, not a copy.
   *
   * `styles.css` is the entry every consumer already imports and its behaviour is unchanged;
   * `index.css` is the same stylesheet with `base.css` left out, published as
   * `@qeetrix/ui/core.css`. The failure this suite exists to catch is the obvious one: someone
   * "simplifies" the two-line entry by inlining it, or by copying the `@theme` block, and the two
   * entries start to drift. Only one file may declare the theme mapping.
   */
  it("composes the full entry from the core plus the host-global layer, in that order", () => {
    const imports = [...full.matchAll(/^\s*@import\s+"(\.[^"]+)"/gm)].map((m) => m[1]);
    expect(imports).toEqual(["./index.css", "./base.css"]);
  });

  it("keeps the host-global layer out of the core entry", () => {
    // `@qeetrix/ui/core.css` exists to give a consumer the components without these rules. If
    // index.css imports base.css again, the opt-out is a lie that still compiles.
    expect(core).not.toContain('@import "./base.css"');
    expect(core).not.toContain("@layer base {");
    expect(core).not.toContain("forced-colors: active");
  });

  it("declares the theme mapping in exactly one of them", () => {
    expect(core).toContain("@theme inline {");
    expect(full).not.toContain("@theme");
    // …and the fonts too, so a font is never requested twice by one compilation.
    expect((full.match(/@font-face/g) ?? []).length).toBe(0);
    expect((core.match(/@font-face/g) ?? []).length).toBeGreaterThan(0);
  });

  it("keeps every @import contiguous at the top of the full entry", () => {
    // CSS only honours `@import` before any other rule, so appending base.css below one would
    // silently drop the entire host-global layer with no error anywhere.
    const withoutComments = full.replace(/\/\*[\s\S]*?\*\//g, "");
    const lastImport = withoutComments.lastIndexOf("@import");
    const firstOtherRule = withoutComments.search(/^\s*(?!@import)(?:@|[.:[*a-z#])/im);
    expect(lastImport).toBeGreaterThan(-1);
    expect(firstOtherRule === -1 || lastImport < firstOtherRule).toBe(true);
  });

  it("scans the package for utilities from the core, so both entries emit them", () => {
    // postbuild rewrites this one directive for dist. Two copies would mean one gets rewritten
    // and the other ships scanning `.tsx` files the tarball does not contain.
    expect((full.match(/@source/g) ?? []).length).toBe(0);
    expect((core.match(/@source /g) ?? []).length).toBe(1);
  });
});

describe("foundations mirror the token source", () => {
  it("derives motion values from the motion tokens", () => {
    expect(DURATION.standard).toBe(Number.parseInt(tokensJson.light.duration.standard, 10));
    expect(EASING.standard).toBe(tokensJson.light.easing.standard);
    // The semantic roles must not invent timings the primitives do not have.
    for (const value of Object.values(tokensJson.light.motion.duration)) {
      expect(Object.values(tokensJson.light.duration)).toContain(value);
    }
    for (const value of Object.values(tokensJson.light.motion.easing)) {
      expect(Object.values(tokensJson.light.easing)).toContain(value);
    }
  });

  it("collapses motion to nothing under the reduced-motion role", () => {
    expect(tokensJson.light.motion.reduced.duration).toBe(tokensJson.light.duration.instant);
  });

  it("derives the stacking ladder and elevation from tokens", () => {
    expect(Z_INDEX.modal).toBe(Number(tokensJson.light.z.modal));
    expect(Z_INDEX.skipNav).toBeGreaterThan(Z_INDEX.modal);
    expect(SHADOW.rest).toBe(tokensJson.light.shadow.rest);
    expect(tokensJson.light.elevation.raised).toBe(tokensJson.light.shadow.rest);
    expect(tokensJson.light.elevation.modal).toBe(tokensJson.light.shadow.modal);
  });

  it("keeps the focus contract intact after re-layering onto the stroke scale", () => {
    expect(tokensJson.light.focus["ring-width"]).toBe("3px");
    expect(tokensJson.light.focus["outline-width"]).toBe("2px");
    expect(tokensJson.light.focus.offset).toBe("2px");
    expect(tokensJson.light.focus["ring-style"]).toBe("solid");
  });

  it("exposes a density metric for every mode the provider supports", () => {
    for (const metric of ["control-height", "row-height", "cell-padding-y", "field-gap"]) {
      for (const mode of [...DENSITY_MODES, "default"]) {
        expect(tokensJson.light.density[metric][mode], `${metric}.${mode}`).toBeTruthy();
      }
      expect(runtimeCss).toContain(`${DENSITY_TOKEN_PREFIX}${metric}-default:`);
    }
    for (const mode of DENSITY_MODES) {
      expect(runtimeCss).toContain(`[data-qx-density="${mode}"]`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────
describe("pilot components", () => {
  /** Resolve a `--qx-*`/`--x` variable to its literal value in one theme. */
  function resolveVar(name: string, theme: "light" | "dark"): string {
    // The capture before `{` picks up the generated file's banner comment as well, so take the
    // last line of it as the selector.
    const blocks = [...runtimeCss.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({
      selector: (m[1].trim().split("\n").pop() ?? "").trim(),
      body: m[2],
    }));
    const scopes = theme === "dark" ? [":root", ".dark"] : [":root"];
    let value: string | null = null;
    for (const block of blocks) {
      if (!scopes.includes(block.selector)) continue;
      const match = new RegExp(`${name}:\\s*([^;]+);`).exec(block.body);
      if (match) value = match[1].trim();
    }
    if (value === null) throw new Error(`${name} is not declared for ${theme}`);
    const nested = /^var\((--[a-zA-Z0-9-]+)\)$/.exec(value);
    if (nested) return resolveVar(nested[1], theme);
    return value.replace(/var\((--[a-zA-Z0-9-]+)\)/g, (_, v) => resolveVar(v, theme));
  }

  // Each pair is "the component token now read" vs "the bridge variable the utility class used
  // to resolve to". Equality in both themes is what makes the migration non-visual.
  const EQUIVALENT: [string, string][] = [
    ["--qx-component-button-primary-background", "--primary"],
    ["--qx-component-button-primary-foreground", "--primary-foreground"],
    ["--qx-component-card-background", "--card"],
    ["--qx-component-card-foreground", "--card-foreground"],
    ["--qx-component-dialog-background", "--popover"],
    ["--qx-component-dialog-foreground", "--popover-foreground"],
    ["--qx-component-dialog-border", "--border"],
    ["--qx-component-input-border", "--input"],
    ["--qx-component-badge-default-background", "--primary"],
    ["--qx-component-badge-default-foreground", "--primary-foreground"],
  ];

  it.each(["light", "dark"] as const)(
    "resolves every migrated token to the value it replaced (%s)",
    (theme) => {
      for (const [componentToken, bridgeVariable] of EQUIVALENT) {
        expect(resolveVar(componentToken, theme), `${componentToken} in ${theme}`).toBe(
          resolveVar(bridgeVariable, theme),
        );
      }
    },
  );

  it("gives the input a theme-varying fill, so the component needs no dark: variant", () => {
    expect(resolveVar("--qx-component-input-background", "light")).toBe("transparent");
    expect(resolveVar("--qx-component-input-background", "dark")).not.toBe("transparent");
    expect(read("src/components/inputs/input.tsx")).not.toContain("dark:bg-");
  });

  it("keeps the focus ring on the same colour as the bridge ring", () => {
    for (const theme of ["light", "dark"] as const) {
      expect(resolveVar("--qx-component-input-border-focus", theme)).toBe(
        resolveVar("--ring", theme),
      );
    }
  });

  it("reads corners from the ramp, so the --radius knob still retunes them", () => {
    for (const token of [
      "--qx-component-button-corner",
      "--qx-component-card-corner",
      "--qx-component-dialog-corner",
      "--qx-component-input-corner",
      "--qx-component-badge-corner",
    ]) {
      expect(runtimeCss).toMatch(new RegExp(`${token}:\\s*var\\(--radius-`));
    }
  });

  it("keeps density derivable through the token graph after migration", () => {
    // Button and Input read --qx-component-*-height rather than --qx-density-* directly. The
    // manifest must still record them as density-aware, or migrating a component to a component
    // token silently downgrades what the library reports about it.
    const aware = densityAwareVariables(graph) as Set<string>;
    expect(aware.has("--qx-component-button-height")).toBe(true);
    expect(aware.has("--qx-component-input-height")).toBe(true);
    expect(aware.has("--qx-component-card-background")).toBe(false);

    const manifest = JSON.parse(read("component-manifest.json")) as {
      components: { slug: string; capabilities: { density: string } }[];
    };
    const density = (slug: string) =>
      manifest.components.find((c) => c.slug === slug)?.capabilities.density;
    expect(density("button")).toBe("supported");
    expect(density("input")).toBe("supported");
  });

  it("has the pilots reference component tokens rather than the bridge directly", () => {
    const pilots = {
      "src/components/actions/button.tsx": "button-primary-background",
      "src/components/inputs/input.tsx": "input-background",
      "src/components/surfaces/card.tsx": "card-background",
      "src/components/surfaces/dialog.tsx": "dialog-background",
      "src/components/data-display/badge.tsx": "badge-default-background",
    };
    for (const [file, token] of Object.entries(pilots)) {
      expect(read(file), file).toContain(`var(--qx-component-${token})`);
    }
  });
});
