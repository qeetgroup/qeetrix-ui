/**
 * Typed token values.
 *
 * The values live in the `foundations` layer, generated from src/tokens/** by
 * `bun run build:tokens`. This module is the stable import path — `@qeetrix/ui/lib/token-values`
 * is a published subpath and the root barrel re-exports these names, so the file stays here
 * while the numbers moved to where they belong.
 *
 * @see src/foundations/token-values.ts
 */

export {
  CHART_COLOR,
  COMPONENT,
  DURATION,
  EASING,
  ICON_SIZE,
  ICON_STROKE,
  SHADOW,
  STATE_OPACITY,
  Z_INDEX,
} from "@/foundations/token-values";
