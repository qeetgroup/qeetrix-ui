// @vitest-environment node
//
// Pure `Intl` work: no DOM is involved, so this runs without one. That is also a regression
// guard — a locale helper that reached for `document` would fail here rather than in a
// consumer's server render.
import { describe, expect, it } from "vitest";

import { localeWeekStart, numberSymbols, parseLocaleNumber } from "@/lib/locale";

/**
 * The space characters these tests assert against, spelled as escapes.
 *
 * `fr-FR` groups with U+202F, which is indistinguishable from U+0020 on screen and in a
 * diff. Written as a literal it is silently normalised to a plain space by the next editor
 * or formatter that touches the file — at which point these tests still pass and prove
 * nothing.
 */
const NNBSP = "\u202f";
const NBSP = "\u00a0";
const SPACE = "\u0020";

describe("numberSymbols", () => {
  it("reads the separators the locale actually formats with", () => {
    expect(numberSymbols("en-US")).toMatchObject({ decimal: ".", minus: "-" });
    expect(numberSymbols("en-US").group).toContain(",");
    expect(numberSymbols("de-DE")).toMatchObject({ decimal: "," });
    expect(numberSymbols("de-DE").group).toContain(".");
  });

  it("accepts every kind of space where a locale groups with one", () => {
    const { group } = numberSymbols("fr-FR");
    // The locale's real separator, plus the one a keyboard produces.
    expect(group).toContain(NNBSP);
    expect(group).toContain(SPACE);
    expect(group).toContain(NBSP);
  });

  it("orders group separators longest-first", () => {
    const { group } = numberSymbols("fr-FR");
    const lengths = group.map((g) => g.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
  });

  it("records the locale's own digits, and nothing when they are ASCII", () => {
    expect(numberSymbols("en-US").digits).toEqual([]);
    expect(numberSymbols("ar-EG").digits).toEqual([
      "٠",
      "١",
      "٢",
      "٣",
      "٤",
      "٥",
      "٦",
      "٧",
      "٨",
      "٩",
    ]);
  });

  it("reads the Indian grouping shape rather than assuming groups of three", () => {
    // 1234567 is "12,34,567" in en-IN, so a group may hold two digits as well as three.
    expect(numberSymbols("en-IN").groupSizes).toEqual([2, 3]);
    expect(numberSymbols("de-DE").groupSizes).toEqual([3]);
  });

  it("falls back to the runtime default for an unparseable tag instead of throwing", () => {
    expect(() => numberSymbols("!!! not a locale !!!")).not.toThrow();
    expect(numberSymbols("!!! not a locale !!!").decimal).toBeTruthy();
  });

  it("returns the same object for repeated lookups", () => {
    // Called per keystroke in a numeric field; a fresh Intl.NumberFormat each time is not free.
    expect(numberSymbols("de-DE")).toBe(numberSymbols("de-DE"));
  });
});

describe("parseLocaleNumber", () => {
  it("parses the locale's own spelling of a number", () => {
    expect(parseLocaleNumber("1,234.56", "en-US")).toBe(1234.56);
    expect(parseLocaleNumber("1.234,56", "de-DE")).toBe(1234.56);
    expect(parseLocaleNumber(`1${NNBSP}234,56`, "fr-FR")).toBe(1234.56);
    expect(parseLocaleNumber("12,34,567.5", "en-IN")).toBe(1234567.5);
  });

  it("accepts a typed space where the locale groups with a narrow one", () => {
    // Nobody has U+202F on a keyboard; rejecting the space would make the field unusable.
    expect(parseLocaleNumber(`1${SPACE}234,56`, "fr-FR")).toBe(1234.56);
    expect(parseLocaleNumber(`1${NBSP}234,56`, "fr-FR")).toBe(1234.56);
  });

  it("parses the locale's own digits", () => {
    expect(parseLocaleNumber("١٢٣٤٫٥", "ar-EG")).toBe(1234.5);
    expect(parseLocaleNumber("١٬٢٣٤", "ar-EG")).toBe(1234);
    // Devanagari digits, via the numbering-system extension.
    expect(parseLocaleNumber("१२३", "hi-IN-u-nu-deva")).toBe(123);
  });

  it("still accepts ASCII digits in a non-ASCII locale", () => {
    // Most Arabic-locale keyboards produce ASCII digits.
    expect(parseLocaleNumber("1234", "ar-EG")).toBe(1234);
  });

  it("rejects a decimal point where the locale groups with one", () => {
    // The whole reason this function exists. `"1.5".replace(".","")` is 15, and
    // `Number.parseFloat("1.5")` is 1.5 — in German neither is defensible, so neither is
    // guessed. 1.5 is not valid German for anything.
    expect(parseLocaleNumber("1.5", "de-DE")).toBeNaN();
    expect(parseLocaleNumber("1.50", "de-DE")).toBeNaN();
    // Three digits after the separator is a real thousands group, and is accepted.
    expect(parseLocaleNumber("1.500", "de-DE")).toBe(1500);
  });

  it("rejects group separators that group by the wrong amount", () => {
    expect(parseLocaleNumber("1,2,3", "en-US")).toBeNaN();
    expect(parseLocaleNumber("1,23", "en-US")).toBeNaN();
    expect(parseLocaleNumber("1234,567", "en-US")).toBeNaN();
    // Whereas Indian grouping legitimately uses two.
    expect(parseLocaleNumber("1,23,456", "en-IN")).toBe(123456);
  });

  it("returns NaN rather than a truncated value for junk", () => {
    // Number.parseFloat("12abc") is 12; that is how a bad paste becomes a wrong charge.
    for (const input of ["12abc", "abc", "", "   ", "1.2.3", "--5", "1,,234", ".", "1e5x"]) {
      expect(parseLocaleNumber(input, "en-US")).toBeNaN();
    }
  });

  it("handles signs, including the accounting parentheses form", () => {
    expect(parseLocaleNumber("-1,234.5", "en-US")).toBe(-1234.5);
    expect(parseLocaleNumber("−1234.5", "en-US")).toBe(-1234.5); // U+2212 MINUS SIGN
    expect(parseLocaleNumber("(1,234.50)", "en-US")).toBe(-1234.5);
    expect(parseLocaleNumber("(1.234,50)", "de-DE")).toBe(-1234.5);
  });

  it("strips the bidi controls that travel with copied RTL text", () => {
    // U+200F RIGHT-TO-LEFT MARK, U+2066/U+2069 isolates. Invisible in a field, and fatal to
    // a naive parser.
    expect(parseLocaleNumber("\u200f1234.5\u200f", "en-US")).toBe(1234.5);
    expect(parseLocaleNumber("\u20661234\u2069", "en-US")).toBe(1234);
  });

  it("accepts a bare integer and a bare fraction", () => {
    expect(parseLocaleNumber("1234567", "en-US")).toBe(1234567);
    expect(parseLocaleNumber("0.5", "en-US")).toBe(0.5);
    expect(parseLocaleNumber(".5", "en-US")).toBe(0.5);
    expect(parseLocaleNumber("5.", "en-US")).toBe(5);
    expect(parseLocaleNumber("0", "en-US")).toBe(0);
  });

  it("distinguishes zero from empty", () => {
    // `Number("")` is 0, which would make an empty field read as a real zero.
    expect(parseLocaleNumber("0", "en-US")).toBe(0);
    expect(parseLocaleNumber("", "en-US")).toBeNaN();
  });

  it("round-trips whatever Intl.NumberFormat produced, for every locale it supports", () => {
    const value = 1234567.89;
    for (const locale of ["en-US", "en-IN", "de-DE", "fr-FR", "ar-EG", "hi-IN-u-nu-deva"]) {
      const formatted = new Intl.NumberFormat(locale).format(value);
      expect(parseLocaleNumber(formatted, locale)).toBeCloseTo(value, 2);
    }
  });

  it("rejects a non-string without throwing", () => {
    expect(parseLocaleNumber(undefined as unknown as string, "en-US")).toBeNaN();
    expect(parseLocaleNumber(5 as unknown as string, "en-US")).toBeNaN();
  });
});

describe("localeWeekStart", () => {
  it("reports the locale's first weekday as a getDay() index", () => {
    expect(localeWeekStart("en-US")).toBe(0); // Sunday
    expect(localeWeekStart("en-GB")).toBe(1); // Monday
    expect(localeWeekStart("de-DE")).toBe(1);
    expect(localeWeekStart("ar-EG")).toBe(6); // Saturday
  });

  it("never returns 7, the ISO spelling of Sunday", () => {
    // ISO counts 1..7 from Monday; `Date.prototype.getDay()` counts 0..6 from Sunday.
    // Leaking the ISO value would put Sunday one day past the end of the week.
    for (const locale of ["en-US", "en-GB", "ar-EG", "fa-IR", "he-IL", "ja-JP", "pt-BR"]) {
      const day = localeWeekStart(locale);
      expect(day).toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThanOrEqual(6);
    }
  });

  it("falls back to Monday for a tag it cannot read", () => {
    expect(localeWeekStart("!!! not a locale !!!")).toBe(1);
  });

  it("caches per locale", () => {
    expect(localeWeekStart("en-GB")).toBe(localeWeekStart("en-GB"));
  });
});
