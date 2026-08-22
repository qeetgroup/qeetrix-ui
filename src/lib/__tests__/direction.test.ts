import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ARROW_KEYS,
  directionForLocale,
  directionFromDom,
  inlineAxisSign,
  keyForLogicalDirection,
  logicalDirectionForKey,
  sequentialArrowKeys,
} from "@/lib/direction";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("dir");
});

describe("directionForLocale", () => {
  it.each([
    ["ar", "rtl"],
    ["ar-EG", "rtl"],
    ["he-IL", "rtl"],
    ["fa", "rtl"],
    ["ur-PK", "rtl"],
    ["ckb-IQ", "rtl"],
    ["dv", "rtl"],
    ["en-US", "ltr"],
    ["de-DE", "ltr"],
    ["hi-IN", "ltr"],
    ["ja-JP", "ltr"],
  ] as const)("reports %s as %s", (locale, expected) => {
    expect(directionForLocale(locale)).toBe(expected);
  });

  it("lets a script subtag override the language's default direction", () => {
    // Punjabi in Gurmukhi reads left-to-right; in the Arabic script it does not. A
    // language-only table gets exactly this pair wrong.
    expect(directionForLocale("pa-IN")).toBe("ltr");
    expect(directionForLocale("pa-Arab-PK")).toBe("rtl");
    expect(directionForLocale("ks-Deva-IN")).toBe("ltr");
    expect(directionForLocale("ks-Arab-IN")).toBe("rtl");
  });

  it("falls back to ltr for input it cannot read, instead of throwing", () => {
    // Reached from render paths, so a malformed tag must not take the tree down.
    expect(directionForLocale("this is not a locale")).toBe("ltr");
    expect(directionForLocale("")).toBe("ltr");
    expect(directionForLocale(undefined)).toBe("ltr");
    expect(directionForLocale(null)).toBe("ltr");
  });

  it("accepts an Intl.Locale as well as a tag", () => {
    expect(directionForLocale(new Intl.Locale("he"))).toBe("rtl");
    expect(directionForLocale(new Intl.Locale("en"))).toBe("ltr");
  });

  it("resolves from the subtag tables when the runtime has no Intl text info", () => {
    // Older engines expose `textInfo` as a getter, newer ones `getTextInfo()` as a method,
    // and some have neither. Simulate the last case: the tables have to carry it alone.
    class Bare {
      tag: string;
      constructor(tag: string) {
        this.tag = tag;
      }
      toString() {
        return this.tag;
      }
    }
    vi.stubGlobal("Intl", { ...Intl, Locale: Bare });

    expect(directionForLocale("ar-EG")).toBe("rtl");
    expect(directionForLocale("en-GB")).toBe("ltr");
    expect(directionForLocale("pa-Arab")).toBe("rtl");
  });

  it("survives an Intl.Locale that throws", () => {
    vi.stubGlobal("Intl", {
      ...Intl,
      Locale: class {
        constructor() {
          throw new RangeError("nope");
        }
      },
    });
    expect(directionForLocale("he")).toBe("rtl");
    expect(directionForLocale("en")).toBe("ltr");
  });
});

describe("directionFromDom", () => {
  it("reads the nearest ancestor's explicit dir", () => {
    document.body.innerHTML = `<div dir="rtl"><section><span id="leaf"></span></section></div>`;
    expect(directionFromDom(document.getElementById("leaf"))).toBe("rtl");
  });

  it("lets a nested dir win over an outer one", () => {
    document.body.innerHTML = `<div dir="rtl"><div dir="ltr"><span id="leaf"></span></div></div>`;
    expect(directionFromDom(document.getElementById("leaf"))).toBe("ltr");
  });

  it("reads dir from the node itself", () => {
    document.body.innerHTML = `<span id="leaf" dir="rtl"></span>`;
    expect(directionFromDom(document.getElementById("leaf"))).toBe("rtl");
  });

  it("picks up <html dir>, which is how applications actually set direction", () => {
    document.documentElement.setAttribute("dir", "rtl");
    document.body.innerHTML = `<span id="leaf"></span>`;
    expect(directionFromDom(document.getElementById("leaf"))).toBe("rtl");
  });

  it("is case-insensitive, as the HTML attribute is", () => {
    document.body.innerHTML = `<div dir="RTL"><span id="leaf"></span></div>`;
    expect(directionFromDom(document.getElementById("leaf"))).toBe("rtl");
  });

  it("defers dir=auto to the computed style, because only layout can resolve it", () => {
    document.body.innerHTML = `<div dir="auto"><span id="leaf"></span></div>`;
    const leaf = document.getElementById("leaf");
    // jsdom does resolve `direction` as an inherited property, but not the bidi algorithm
    // that `dir="auto"` depends on, so the value here is the inherited default rather than
    // a real answer — the point being asserted is that the *attribute* is not trusted.
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      direction: "rtl",
    } as unknown as CSSStyleDeclaration);
    expect(directionFromDom(leaf)).toBe("rtl");
  });

  it("returns undefined rather than ltr when there is nothing to read", () => {
    // The distinction is load-bearing: `undefined` lets a caller keep its own default
    // instead of overwriting a declared direction with a guess.
    expect(directionFromDom(null)).toBeUndefined();
    expect(directionFromDom(undefined)).toBeUndefined();
  });

  it("returns undefined when the computed style is not a direction", () => {
    document.body.innerHTML = `<span id="leaf"></span>`;
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      direction: "",
    } as unknown as CSSStyleDeclaration);
    expect(directionFromDom(document.getElementById("leaf"))).toBeUndefined();
  });
});

describe("logicalDirectionForKey", () => {
  it("mirrors the inline axis and never the block axis", () => {
    expect(logicalDirectionForKey("ArrowLeft", "ltr")).toBe("inline-start");
    expect(logicalDirectionForKey("ArrowRight", "ltr")).toBe("inline-end");
    expect(logicalDirectionForKey("ArrowLeft", "rtl")).toBe("inline-end");
    expect(logicalDirectionForKey("ArrowRight", "rtl")).toBe("inline-start");

    for (const direction of ["ltr", "rtl"] as const) {
      expect(logicalDirectionForKey("ArrowUp", direction)).toBe("block-start");
      expect(logicalDirectionForKey("ArrowDown", direction)).toBe("block-end");
    }
  });

  it("ignores keys that are not arrows", () => {
    for (const key of ["Home", "End", "Enter", " ", "a", "Tab", "PageDown"]) {
      expect(logicalDirectionForKey(key, "rtl")).toBeUndefined();
    }
  });

  it("round-trips with keyForLogicalDirection for every arrow and direction", () => {
    for (const direction of ["ltr", "rtl"] as const) {
      for (const key of ARROW_KEYS) {
        const logical = logicalDirectionForKey(key, direction);
        expect(logical).toBeDefined();
        // The inverse must land back on the same physical key, or a component that mixes
        // the two helpers would disagree with itself.
        expect(keyForLogicalDirection(logical as NonNullable<typeof logical>, direction)).toBe(key);
      }
    }
  });
});

describe("sequentialArrowKeys", () => {
  it("mirrors a horizontal widget", () => {
    expect(sequentialArrowKeys("ltr", "horizontal")).toEqual({
      previous: "ArrowLeft",
      next: "ArrowRight",
    });
    expect(sequentialArrowKeys("rtl", "horizontal")).toEqual({
      previous: "ArrowRight",
      next: "ArrowLeft",
    });
  });

  it("leaves a vertical widget alone in both directions", () => {
    const vertical = { previous: "ArrowUp", next: "ArrowDown" };
    expect(sequentialArrowKeys("ltr", "vertical")).toEqual(vertical);
    expect(sequentialArrowKeys("rtl", "vertical")).toEqual(vertical);
  });

  it("defaults to horizontal", () => {
    expect(sequentialArrowKeys("rtl")).toEqual(sequentialArrowKeys("rtl", "horizontal"));
  });
});

describe("inlineAxisSign", () => {
  it("flips a physical X delta into an inline-axis delta", () => {
    expect(inlineAxisSign("ltr")).toBe(1);
    expect(inlineAxisSign("rtl")).toBe(-1);
    // A 10px drag to the right is +10 inline in LTR and -10 inline in RTL.
    expect(10 * inlineAxisSign("rtl")).toBe(-10);
  });
});
