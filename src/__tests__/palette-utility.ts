/**
 * The named-Tailwind-palette utility pattern, shared by the component regression guards.
 *
 * It backs the regression assertions in the Rating, CodeBlock and JsonTree suites. The scan
 * that applied it to every component (scripts/check/token-usage.mjs) was removed in 01dce7a.
 *
 * A named palette class looks token-backed because it is a class name, but the palette is
 * deliberately absent from the runtime stylesheet — so a brand theme, the forced-colors mapping
 * and the contrast test all miss it. Only the semantic namespaces are governed.
 */
export const PALETTE_UTILITY =
  /\b(?:bg|text|border|fill|stroke|ring|outline|decoration|divide|accent|caret|placeholder|from|via|to|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(?:50|[1-9]\d{2})\b(?:\/\d{1,3})?/;
