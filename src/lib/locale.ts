/**
 * The locale runtime: parsing numbers the way a locale *writes* them, and answering the two
 * calendar questions that are locale data rather than product policy.
 *
 * Formatting a number for a locale is one `Intl.NumberFormat` call and needs no help. Reading
 * one back does: a field that renders `1 234,56` to a French user and then accepts only
 * `1234.56` on input is a formatter, not a control. `Intl` has no parser, so every rule here is
 * recovered from `formatToParts` — asking the same CLDR data that did the formatting what it
 * used — rather than from a hand-written table of separators per locale.
 *
 * Everything is derived from `Intl`, cached per locale, and framework-free. No dependency is
 * added and no message catalogue is implied: these are numbers and weekdays, not strings.
 *
 * @see docs/standards/rtl.md § Numbers and calendars
 */

/** The characters a locale uses to punctuate a number, plus its digit set and grouping shape. */
interface NumberSymbols {
  /** Decimal separator, e.g. `.` in `en-IN`, `,` in `de-DE`, `٫` in `ar-EG`. */
  decimal: string;
  /**
   * Grouping separators, longest-first. More than one because a locale can group with a
   * character that also appears as ordinary whitespace: `fr-FR` groups with U+202F NARROW
   * NO-BREAK SPACE, and no keyboard produces it.
   */
  group: readonly string[];
  /**
   * How many digits may follow a group separator. `[3]` almost everywhere; `[2, 3]` for the
   * Indian lakh/crore system, where `1234567` is written `12,34,567`.
   *
   * Read from the formatter rather than assumed, because it is what makes rejecting `1.5` in
   * `de-DE` possible without also rejecting `12,34,567` in `en-IN`.
   */
  groupSizes: readonly number[];
  /** Minus sign, e.g. `-` in `en`, U+061C-prefixed in some Arabic locales. */
  minus: string;
  /**
   * The locale's ten digits in value order, when they are not ASCII — `١٢٣…` for `ar-EG`,
   * `१२३…` for `hi-IN-u-nu-deva`. Empty when the locale uses `0`-`9`.
   */
  digits: readonly string[];
}

/** Day-of-week index matching `Date.prototype.getDay()` — 0 is Sunday. */
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * `Intl` construction is not cheap and these are called per keystroke in a numeric field.
 * Keyed by the *requested* tag, which is what callers vary; a `Map` rather than an object so a
 * hostile locale string cannot collide with `Object.prototype`.
 */
const symbolCache = new Map<string, NumberSymbols>();
const weekStartCache = new Map<string, Weekday>();

/**
 * Space characters a keyboard or a paste can produce where a locale groups with a space.
 * Spelled as escapes on purpose: these are indistinguishable on screen, and a literal here
 * would be silently normalised to U+0020 by the next tool that touches the file.
 */
const SPACE_SEPARATORS = [
  "\u0020", // SPACE — what a keyboard produces
  "\u00a0", // NO-BREAK SPACE
  "\u202f", // NARROW NO-BREAK SPACE — what fr-FR actually groups with
  "\u2009", // THIN SPACE
  "\u2007", // FIGURE SPACE
];

/** Bidi formatting controls. Invisible, and they travel with copied RTL text. */
const BIDI_CONTROLS = /[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g;

/**
 * The number symbols and grouping shape `locale` writes with.
 *
 * `undefined` means the runtime default, the same convention `Intl` itself uses. An
 * unparseable tag falls back to the runtime default rather than throwing, because this is
 * reached from render paths.
 */
function numberSymbols(locale?: string): NumberSymbols {
  const key = locale ?? "";
  const cached = symbolCache.get(key);
  if (cached) return cached;

  const resolved = computeNumberSymbols(locale);
  symbolCache.set(key, resolved);
  return resolved;
}

function computeNumberSymbols(locale?: string): NumberSymbols {
  let format: Intl.NumberFormat;
  try {
    format = new Intl.NumberFormat(locale);
  } catch {
    format = new Intl.NumberFormat();
  }

  // -1234567.5 exercises every part at once: the sign, grouping twice (so Indian lakh
  // grouping is visible as two differently-sized groups), and the decimal.
  const parts = format.formatToParts(-1234567.5);
  const first = (type: Intl.NumberFormatPartTypes) => parts.find((p) => p.type === type)?.value;

  const separator = first("group");
  const groups = new Set<string>();
  if (separator) {
    groups.add(separator);
    // A locale that groups with any kind of space must accept the others too.
    if (SPACE_SEPARATORS.includes(separator)) {
      for (const space of SPACE_SEPARATORS) groups.add(space);
    }
  }

  // Integer chunks in order. The first is the leading chunk (any width); the rest are the
  // grouped ones, and their widths are the only ones a typed separator has to match.
  const chunks: string[] = [];
  for (const part of parts) {
    if (part.type === "integer") chunks.push(part.value);
    if (part.type === "decimal") break;
  }
  const groupSizes = [...new Set(chunks.slice(1).map((chunk) => chunk.length))].sort();

  return {
    decimal: first("decimal") ?? ".",
    // Longest first so a multi-character separator is stripped before its first character is.
    group: [...groups].sort((a, b) => b.length - a.length),
    groupSizes: groupSizes.length > 0 ? groupSizes : [3],
    minus: first("minusSign") ?? "-",
    digits: localeDigits(format),
  };
}

/**
 * The locale's digit glyphs, or an empty list when they are ASCII.
 *
 * Formatting each value on its own is the only reliable way to read a numbering system's
 * glyphs out of `Intl`: the numbering system appears in the resolved options, but the glyph
 * table is not exposed.
 */
function localeDigits(format: Intl.NumberFormat): readonly string[] {
  const digits: string[] = [];
  let ascii = true;
  for (let value = 0; value < 10; value += 1) {
    const glyph = format.format(value).replace(/[^\p{Nd}]/gu, "");
    if (glyph.length !== 1) return [];
    digits.push(glyph);
    if (glyph !== String(value)) ascii = false;
  }
  return ascii ? [] : digits;
}

/**
 * Parse a number the way `locale` writes it. `Number.NaN` when the input is not a number in
 * that locale — never a silently truncated or rescaled value.
 *
 * ```ts
 * parseLocaleNumber("1.234,56", "de-DE");  // 1234.56
 * parseLocaleNumber("1 234,56", "fr-FR");  // 1234.56 — a typed space, not U+202F
 * parseLocaleNumber("١٢٣٤٫٥", "ar-EG");    // 1234.5
 * parseLocaleNumber("12,34,567", "en-IN"); // 1234567 — lakh grouping
 * parseLocaleNumber("1.5", "de-DE");       // NaN — "." groups in German, and never by one
 * parseLocaleNumber("1,2,3", "en-US");     // NaN
 * ```
 *
 * The strictness is the point. `Number.parseFloat("1,2,3")` returns `1` and
 * `"1.5".replace(".","")` returns `15`; both are how a currency field silently charges the
 * wrong amount. A group separator must be followed by exactly as many digits as the locale
 * actually groups by, so a German `1.5` is rejected rather than read as fifteen.
 *
 * Not handled, by design: currency symbols and percent signs (strip them first — their
 * placement is itself locale data), and compact notation (`1.2M`).
 */
function parseLocaleNumber(input: string, locale?: string): number {
  if (typeof input !== "string") return Number.NaN;

  const symbols = numberSymbols(locale);
  let text = input.replace(BIDI_CONTROLS, "").trim();
  if (!text) return Number.NaN;

  // Digits first: everything after this reasons about ASCII, so a locale that uses both its
  // own glyphs and ASCII ones (most of them, in practice) needs no special case.
  if (symbols.digits.length === 10) {
    text = text.replace(/\p{Nd}/gu, (glyph) => {
      const value = symbols.digits.indexOf(glyph);
      return value >= 0 ? String(value) : glyph;
    });
  }

  let negative = false;
  for (const sign of [symbols.minus, "-", "−"]) {
    if (sign && text.startsWith(sign)) {
      negative = true;
      text = text.slice(sign.length).trim();
      break;
    }
  }
  // Accounting style: several locales' currency formats write a negative as (1.234,56).
  if (text.startsWith("(") && text.endsWith(")")) {
    negative = true;
    text = text.slice(1, -1).trim();
  }

  // Split off the fraction. The locale's own decimal separator wins; ASCII "." is accepted as
  // a second spelling only where it is unambiguous — that is, where it does not also group.
  const dotGroups = symbols.group.includes(".");
  const decimals = [symbols.decimal, ...(symbols.decimal !== "." && !dotGroups ? ["."] : [])];
  let integer = text;
  let fraction: string | undefined;
  for (const mark of decimals) {
    const at = text.indexOf(mark);
    if (at < 0) continue;
    // A second occurrence of any decimal mark is not a number in any locale.
    if (text.indexOf(mark, at + mark.length) >= 0) return Number.NaN;
    integer = text.slice(0, at);
    fraction = text.slice(at + mark.length);
    break;
  }
  if (fraction !== undefined && !/^\d*$/.test(fraction)) return Number.NaN;

  const digits = ungroup(integer, symbols);
  if (digits === undefined) return Number.NaN;
  if (digits === "" && !fraction) return Number.NaN;

  const value = Number(`${digits || "0"}.${fraction || "0"}`);
  return negative ? -value : value;
}

/**
 * Strip `symbols`' group separators from an integer string, or `undefined` if the grouping is
 * not one this locale would ever produce.
 *
 * Ungrouped input is fine — `1234567` is what people type — but a separator that *is* present
 * has to separate groups of a plausible size, which is what distinguishes a German thousands
 * dot from a decimal point typed by someone who does not know the convention.
 */
function ungroup(integer: string, symbols: NumberSymbols): string | undefined {
  if (/^\d*$/.test(integer)) return integer;
  if (symbols.group.length === 0) return undefined;

  // Split on any of the locale's separators at once, longest-first so a multi-character
  // separator is consumed whole.
  const pattern = new RegExp(symbols.group.map(escapeRegExp).join("|"), "g");
  const chunks = integer.split(pattern);
  if (chunks.length < 2) return undefined;

  const [lead, ...grouped] = chunks;
  if (!/^\d+$/.test(lead ?? "")) return undefined;
  if (lead.length > Math.max(...symbols.groupSizes)) return undefined;
  for (const chunk of grouped) {
    if (!/^\d+$/.test(chunk)) return undefined;
    if (!symbols.groupSizes.includes(chunk.length)) return undefined;
  }
  return chunks.join("");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * First day of the week for `locale`, as a `getDay()` index.
 *
 * Sunday in `en-US`, Monday in `en-GB` and most of Europe, Saturday in `ar-EG`. Read from
 * `Intl.Locale`'s week info where the runtime has it (a `getWeekInfo()` method in newer
 * engines, a `weekInfo` getter in older ones), which reports ISO indices where 1 is Monday and
 * 7 is Sunday — converted here to the `Date` convention so callers never mix the two.
 *
 * Falls back to Monday, the ISO-8601 default, when the runtime cannot answer.
 *
 * This is *locale data*, not product policy. A scheduling product that lets a user pick their
 * own week start should take that as a prop and use this only as the initial value.
 */
function localeWeekStart(locale?: string): Weekday {
  const key = locale ?? "";
  const cached = weekStartCache.get(key);
  if (cached !== undefined) return cached;

  const resolved = computeWeekStart(locale);
  weekStartCache.set(key, resolved);
  return resolved;
}

function computeWeekStart(locale?: string): Weekday {
  try {
    const tag = locale ?? new Intl.NumberFormat().resolvedOptions().locale;
    const info = new Intl.Locale(tag) as Intl.Locale & {
      getWeekInfo?: () => { firstDay?: number };
      weekInfo?: { firstDay?: number };
    };
    const week = typeof info.getWeekInfo === "function" ? info.getWeekInfo() : info.weekInfo;
    const firstDay = week?.firstDay;
    // ISO: 1 = Monday … 7 = Sunday. `getDay()`: 0 = Sunday … 6 = Saturday.
    if (typeof firstDay === "number" && firstDay >= 1 && firstDay <= 7) {
      return (firstDay % 7) as Weekday;
    }
  } catch {
    // Invalid tag, or an engine with neither shape of the API — fall through.
  }
  return 1;
}

export type { NumberSymbols, Weekday };
export { localeWeekStart, numberSymbols, parseLocaleNumber };
