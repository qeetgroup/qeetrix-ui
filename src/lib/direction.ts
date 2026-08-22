/**
 * The direction runtime: one place that answers "which way does this subtree read?" and
 * "what does this arrow key mean here?".
 *
 * Styling almost never needs any of this — logical utilities (`ps-`, `me-`, `start-`) mirror
 * on their own, and `docs/standards/rtl.md` is the rule. What logical properties cannot do is
 * mirror *behaviour*: a pointer delta whose sign flips, or the fact that <kbd>ArrowRight</kbd>
 * collapses a tree node in Arabic and expands it in English. Every widget that needed that used
 * to re-derive it, differently, from the DOM.
 *
 * Nothing here touches React, so a build script or a `@vitest-environment node` test can call
 * it. The React half — resolving the direction of a real subtree — is
 * `useResolvedDirection` in `@/providers/direction-provider`.
 *
 * @see docs/standards/rtl.md
 * @see src/contracts/direction.ts for the styling-evidence vocabulary
 */

/**
 * Reading direction of a subtree.
 *
 * Structurally identical to `Direction` in `src/contracts/direction.ts`; the duplication is
 * forced, because `lib` may not import `contracts` (`src/contracts/layers.ts`). The provider
 * layer, which may import both, asserts they stay the same type.
 */
type Direction = "ltr" | "rtl";

/**
 * What an arrow key *means*, independent of which physical key produced it.
 *
 * `inline-start` is toward the beginning of a line of text: left in LTR, right in RTL.
 * `block-start` is toward the top in both, since Qeetrix does not support vertical writing
 * modes — `writing-mode` is never set, so the block axis is always top-to-bottom.
 */
type LogicalDirection = "inline-start" | "inline-end" | "block-start" | "block-end";

/** The four physical arrow keys, as `KeyboardEvent.key` reports them. */
type ArrowKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

const ARROW_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"] as const;

/**
 * Language subtags and script subtags written right-to-left.
 *
 * Used only as the fallback for `directionForLocale` when the runtime has no
 * `Intl.Locale` text-info support. Scripts are the reliable signal — `ks-Deva` (Kashmiri in
 * Devanagari) is LTR while `ks-Arab` is RTL — so a script subtag always wins over the
 * language. The language list covers the tags that appear without a script in practice.
 */
const RTL_SCRIPTS = new Set([
  "adlm",
  "arab",
  "aran",
  "armi",
  "avst",
  "cprt",
  "hebr",
  "hung",
  "khar",
  "lydi",
  "mand",
  "mani",
  "mend",
  "merc",
  "mero",
  "nkoo",
  "narb",
  "nbat",
  "orkh",
  "palm",
  "phli",
  "phlp",
  "phnx",
  "prti",
  "rohg",
  "samr",
  "sarb",
  "sogo",
  "sogd",
  "syrc",
  "thaa",
  "yezi",
]);

/**
 * Languages whose *default* script is right-to-left, so a bare tag like `ar-EG` resolves
 * without a script subtag.
 *
 * Deliberately excludes `pa` (Punjabi, default Gurmukhi), `kk` (Kazakh, default Cyrillic) and
 * `ku` (Kurdish, default Latin) even though all three have widely-used Arabic-script variants:
 * those are RTL only when tagged, e.g. `pa-Arab`, which the script table above already
 * catches. Sorani Kurdish has its own tag, `ckb`, and is listed.
 */
const RTL_LANGUAGES = new Set([
  "ae",
  "ar",
  "arc",
  "ckb",
  "dv",
  "fa",
  "he",
  "iw",
  "nqo",
  "ps",
  "sd",
  "syr",
  "ug",
  "ur",
  "yi",
]);

/**
 * Reading direction implied by a BCP-47 locale tag.
 *
 * Prefers the runtime's own CLDR data (`Intl.Locale`'s text info, which exists as a
 * `getTextInfo()` method in newer engines and a `textInfo` getter in older ones), and falls
 * back to the script/language tables above. Returns `"ltr"` for anything unrecognisable,
 * including a malformed tag — a wrong-but-readable page beats a thrown error during render.
 *
 * ```ts
 * directionForLocale("ar-EG");   // "rtl"
 * directionForLocale("ks-Deva"); // "ltr" — script subtag wins over the language
 * directionForLocale("nonsense") // "ltr"
 * ```
 */
function directionForLocale(locale: string | Intl.Locale | undefined | null): Direction {
  if (!locale) return "ltr";

  const tag = typeof locale === "string" ? locale.trim() : locale.toString();
  if (!tag) return "ltr";

  const fromIntl = intlTextDirection(tag);
  if (fromIntl) return fromIntl;

  const subtags = tag.toLowerCase().split(/[-_]/);
  const script = subtags.find((part) => part.length === 4 && /^[a-z]{4}$/.test(part));
  if (script) return RTL_SCRIPTS.has(script) ? "rtl" : "ltr";

  return RTL_LANGUAGES.has(subtags[0] ?? "") ? "rtl" : "ltr";
}

/**
 * `Intl.Locale` text direction, or `undefined` when the runtime cannot answer.
 *
 * The shape of this API changed mid-standardisation: `textInfo` was a getter, then became a
 * `getTextInfo()` method. Both are probed, and a throw (invalid tag, or an engine that has the
 * property but not the data) means "cannot answer" rather than "LTR", so the table below still
 * gets a chance.
 */
function intlTextDirection(tag: string): Direction | undefined {
  try {
    const resolved = new Intl.Locale(tag) as Intl.Locale & {
      getTextInfo?: () => { direction?: string };
      textInfo?: { direction?: string };
    };
    const info =
      typeof resolved.getTextInfo === "function" ? resolved.getTextInfo() : resolved.textInfo;
    if (info?.direction === "rtl" || info?.direction === "ltr") return info.direction;
  } catch {
    // Invalid tag or unimplemented API — fall through to the subtag tables.
  }
  return undefined;
}

/**
 * Reading direction of `node`, read from the DOM, or `undefined` when it cannot be determined.
 *
 * The nearest ancestor carrying an explicit `dir` wins, which covers `<html dir>`, a plain
 * `<div dir>`, and `<DirectionProvider>` (it renders a `dir` wrapper). `dir="auto"` is
 * deliberately *not* honoured from the attribute: its value depends on the first strong
 * directional character in the content, which only the browser knows — so the computed style
 * is consulted instead.
 *
 * `undefined` rather than `"ltr"` on failure, so callers can distinguish "the DOM says LTR"
 * from "there is no DOM yet" and keep their own default.
 */
function directionFromDom(node: Element | null | undefined): Direction | undefined {
  if (!node) return undefined;

  const explicit = node.closest("[dir]")?.getAttribute("dir")?.toLowerCase();
  if (explicit === "rtl" || explicit === "ltr") return explicit;

  // `dir="auto"`, or direction inherited through a shadow boundary: only layout knows.
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
    return undefined;
  }
  const computed = window.getComputedStyle(node).direction;
  return computed === "rtl" || computed === "ltr" ? computed : undefined;
}

/**
 * What `key` means in `direction`, or `undefined` if it is not an arrow key.
 *
 * This is the whole point of the module: a widget switches on the *logical* result and stops
 * caring about direction.
 *
 * ```ts
 * logicalDirectionForKey("ArrowRight", "rtl"); // "inline-start"
 * logicalDirectionForKey("ArrowDown", "rtl");  // "block-end" — the block axis never flips
 * ```
 */
function logicalDirectionForKey(key: string, direction: Direction): LogicalDirection | undefined {
  switch (key) {
    case "ArrowLeft":
      return direction === "rtl" ? "inline-end" : "inline-start";
    case "ArrowRight":
      return direction === "rtl" ? "inline-start" : "inline-end";
    case "ArrowUp":
      return "block-start";
    case "ArrowDown":
      return "block-end";
    default:
      return undefined;
  }
}

/**
 * The physical arrow key that expresses `logical` in `direction` — the inverse of
 * `logicalDirectionForKey`, for the cases where a component must compare against a key name
 * (or name the key in a hint).
 */
function keyForLogicalDirection(logical: LogicalDirection, direction: Direction): ArrowKey {
  switch (logical) {
    case "inline-start":
      return direction === "rtl" ? "ArrowRight" : "ArrowLeft";
    case "inline-end":
      return direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    case "block-start":
      return "ArrowUp";
    default:
      return "ArrowDown";
  }
}

/**
 * The previous/next key pair for a one-dimensional widget, given its orientation.
 *
 * A vertical widget is on the block axis, which does not mirror; a horizontal one is on the
 * inline axis, which does. Carousels, steppers and tab-like strips all want exactly this.
 *
 * ```ts
 * sequentialArrowKeys("rtl", "horizontal"); // { previous: "ArrowRight", next: "ArrowLeft" }
 * sequentialArrowKeys("rtl", "vertical");   // { previous: "ArrowUp",    next: "ArrowDown" }
 * ```
 */
function sequentialArrowKeys(
  direction: Direction,
  orientation: "horizontal" | "vertical" = "horizontal",
): { previous: ArrowKey; next: ArrowKey } {
  if (orientation === "vertical") return { previous: "ArrowUp", next: "ArrowDown" };
  return {
    previous: keyForLogicalDirection("inline-start", direction),
    next: keyForLogicalDirection("inline-end", direction),
  };
}

/**
 * `+1` or `-1` for a pointer/scroll delta measured on the physical X axis.
 *
 * A drag of `+10px` moves toward the inline *end* in LTR and toward the inline *start* in RTL.
 * Multiply a `clientX` delta by this to get an inline-axis delta.
 */
function inlineAxisSign(direction: Direction): 1 | -1 {
  return direction === "rtl" ? -1 : 1;
}

export type { ArrowKey, Direction, LogicalDirection };
export {
  ARROW_KEYS,
  directionForLocale,
  directionFromDom,
  inlineAxisSign,
  keyForLogicalDirection,
  logicalDirectionForKey,
  sequentialArrowKeys,
};
