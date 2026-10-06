/**
 * Which check-glyph tone reads on a swatch: `light` swatches take the dark glyph, `dark` ones the
 * white glyph. Hex only (3, 4, 6 or 8 digits) — any other CSS colour (a `var()`, `oklch()`, a
 * keyword) cannot be resolved without layout, so it is `unknown`, and the caller draws a glyph
 * that reads on anything (dark with a light halo).
 *
 * The threshold is the luminance at which black and white text have equal WCAG contrast
 * (≈0.179), so the chosen glyph is always the higher-contrast of the two.
 */
function swatchTone(color: string): "light" | "dark" | "unknown" {
  const match = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color.trim());
  if (!match?.[1]) return "unknown";
  let hex = match[1];
  if (hex.length <= 4) {
    hex = [...hex].map((c) => c + c).join("");
  }
  const channel = (offset: number) => {
    const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.179 ? "light" : "dark";
}

export { swatchTone };
