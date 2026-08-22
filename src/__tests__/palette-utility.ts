/**
 * The named-Tailwind-palette utility pattern, shared by the component regression guards.
 *
 * `scripts/check/token-usage.mjs` owns the enforcing copy of this expression; the
 * `palette-utility` rule in `token-governance.test.ts` asserts the two are character-identical,
 * so a component test cannot pass against a laxer pattern than the gate uses.
 *
 * A named palette class looks token-backed because it is a class name, but the palette is
 * deliberately absent from the runtime stylesheet — so a brand theme, the forced-colors mapping
 * and `check:contrast` all miss it. Only the semantic namespaces are governed.
 */
export const PALETTE_UTILITY =
  /\b(?:bg|text|border|fill|stroke|ring|outline|decoration|divide|accent|caret|placeholder|from|via|to|shadow)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(?:50|[1-9]\d{2})\b(?:\/\d{1,3})?/;
