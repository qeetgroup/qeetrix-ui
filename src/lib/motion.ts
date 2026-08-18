/** Typed motion primitives generated from tokens/primitive/motion.json. */
import { DURATION, EASING } from "./token-values";

export { DURATION, EASING };

export type DurationToken = keyof typeof DURATION;
export type EasingToken = keyof typeof EASING;

export interface TransitionOptions {
  /** A duration token (e.g. `"fast"`) or explicit ms. Defaults to `"standard"`. */
  duration?: DurationToken | number;
  /** An easing token (e.g. `"decelerate"`) or a raw CSS easing. Defaults to `"standard"`. */
  easing?: EasingToken | (string & {});
  /** A duration token or explicit ms. Defaults to `"instant"` (no delay). */
  delay?: DurationToken | number;
}

const ms = (v: DurationToken | number | undefined, fallback: DurationToken) =>
  typeof v === "number" ? v : DURATION[v ?? fallback];

/** Build a CSS `transition` value for one or more properties from tokens. */
export function transition(properties: string | string[], opts: TransitionOptions = {}): string {
  const dur = ms(opts.duration, "standard");
  const delay = ms(opts.delay, "instant");
  const ease =
    opts.easing && opts.easing in EASING
      ? EASING[opts.easing as EasingToken]
      : (opts.easing ?? EASING.standard);
  const props = Array.isArray(properties) ? properties : [properties];
  return props.map((p) => `${p} ${dur}ms ${ease}${delay ? ` ${delay}ms` : ""}`).join(", ");
}
