/**
 * The Qeetrix component contracts — types and vocabularies that describe and govern the
 * component surface.
 *
 * This module is intentionally *not* part of the published `@qeetrix/ui` barrel: it is
 * consumed inside the package (by src/manifests) and read statically by the build and check
 * scripts. Nothing here has a runtime dependency on React or on any component, which is what
 * lets scripts/lib/ts-literals.mjs read the vocabularies without executing TypeScript.
 *
 * @see docs/architecture/overview.md
 */

export type { AccessibilityContract, AriaPattern } from "./accessibility";
export { ARIA_PATTERNS } from "./accessibility";
export type {
  ComponentCapabilities,
  ComponentCategory,
  ComponentContract,
  ComponentStatus,
  DeprecationContract,
  SsrSupport,
  SupportLevel,
  TestingContract,
} from "./component";
export {
  COMPONENT_CATEGORIES,
  COMPONENT_STATUSES,
  SSR_SUPPORT_LEVELS,
  SUPPORT_LEVELS,
} from "./component";
export type { DensityMode } from "./density";
export {
  DEFAULT_DENSITY_MODE,
  DENSITY_ATTRIBUTE,
  DENSITY_MODES,
  DENSITY_TOKEN_PREFIX,
} from "./density";
export type { Direction } from "./direction";
export {
  DEFAULT_DIRECTION,
  DIRECTIONS,
  LOGICAL_UTILITY_PREFIXES,
  PHYSICAL_UTILITY_PREFIXES,
} from "./direction";
export type { ArchitectureLayer, ComponentLayer, LayeredSource } from "./layers";
export {
  ARCHITECTURE_LAYERS,
  COMPONENT_LAYERS,
  LAYER_ALLOWED_DEPENDENCIES,
  LAYER_DIRECTORIES,
  LAYER_RULE_EXEMPT_LAYERS,
  LAYER_RULE_EXPLANATIONS,
} from "./layers";
export type { InteractionState } from "./states";
export { INTERACTION_STATES } from "./states";
export type { ResolvedThemeMode, ThemeMode } from "./theme";
export {
  DEFAULT_THEME_MODE,
  RESOLVED_THEME_MODES,
  THEME_DARK_CLASS,
  THEME_MODES,
  TOKEN_PREFIX,
} from "./theme";
export type { CanonicalVariantGroup, RecommendedSize, VariantContract } from "./variants";
export {
  CANONICAL_VARIANT_GROUPS,
  RECOMMENDED_SIZE_SCALE,
  VARIANT_GROUP_ALIASES,
} from "./variants";
