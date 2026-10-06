import { type Color, clampChroma, converter, formatHex, parse, wcagContrast } from "culori";

/**
 * Colour maths for the theme lab, on culori: parse token values (oklch, color-mix…), composite
 * translucent colours over the surface they sit on, and compute WCAG 2.x contrast.
 */

const toRgb = converter("rgb");

let probe: HTMLElement | null = null;

/**
 * A token value as a culori colour. Values culori cannot parse (`color-mix()`, `var()`, system
 * colours) are resolved by the browser through a detached probe's computed `color`.
 */
export function resolveColor(value: string | undefined | null): Color | undefined {
  if (!value) return undefined;
  const direct = parse(value);
  if (direct) return direct;
  if (typeof document === "undefined") return undefined;
  if (!probe) {
    probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    document.body.append(probe);
  }
  probe.style.color = "";
  probe.style.color = value;
  if (!probe.style.color) return undefined;
  return parse(getComputedStyle(probe).color);
}

/** `fg` composited over `bg` (both opaque results). */
export function composite(fg: Color, bg: Color): Color {
  const top = toRgb(fg);
  const bottom = toRgb(bg);
  if (!top || !bottom) return fg;
  const alpha = top.alpha ?? 1;
  if (alpha >= 1) return top;
  const channel = (key: "r" | "g" | "b") =>
    Number(top[key] ?? 0) * alpha + Number(bottom[key] ?? 0) * (1 - alpha);
  return { mode: "rgb", r: channel("r"), g: channel("g"), b: channel("b") };
}

/** WCAG contrast of two token values; translucent foregrounds are composited over `bg`. */
export function contrastOf(fgValue: string, bgValue: string, base?: string): number | null {
  const bgRaw = resolveColor(bgValue);
  const baseColor = resolveColor(base) ?? { mode: "rgb", r: 1, g: 1, b: 1 };
  const fgRaw = resolveColor(fgValue);
  if (!fgRaw || !bgRaw) return null;
  const bg = composite(bgRaw, baseColor);
  const fg = composite(fgRaw, bg);
  return wcagContrast(fg, bg);
}

/** `#RRGGBB` for display; out-of-gamut values are chroma-clamped to sRGB first. */
export function hexOf(value: string | Color | undefined): string {
  const color = typeof value === "string" ? resolveColor(value) : value;
  if (!color) return "—";
  return (formatHex(clampChroma(color, "oklch")) ?? "—").toUpperCase();
}

export function formatRatio(ratio: number | null): string {
  return ratio === null ? "—" : `${ratio.toFixed(2)}:1`;
}

export const thresholds = {
  aa: 4.5,
  aaLarge: 3,
  nonText: 3,
  aaa: 7,
} as const;
