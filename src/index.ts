/**
 * @qeetrix/ui — the Qeet Group design system.
 *
 * Components are grouped by category under src/components/<category>/; this barrel
 * re-exports every category, the providers, brand assets, hooks and lib helpers.
 *
 * The published surface is locked by src/__tests__/public-api.json — any addition or
 * removal must be re-snapshotted via `bun run check:exports -- --update` and land in
 * the same changeset. See scripts/check/exports.mjs.
 */

// Re-exported third-party types so consumers can type data-table/date-picker props
// without taking a direct dependency on the underlying libraries.
export type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  Row,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
export { createColumnHelper } from "@tanstack/react-table";
export type { DateRange } from "react-day-picker";

// Brand — Qeet logos + custom icons (also at the @qeetrix/ui/brand subpath).
export * from "./brand";
// Components — 145 modules across 11 categories.
export * from "./components";
export { useMediaQuery } from "./hooks/use-media-query";
export { useIsMobile } from "./hooks/use-mobile";
export { useMotion } from "./hooks/use-motion";
export { usePrefersReducedMotion } from "./hooks/use-prefers-reduced-motion";
export type { MessageOverrides } from "./lib/messages";
// The English source text, and the pure resolver behind `useMessages` — for building a
// translation and for testing one. Every default is reachable through `QEETRIX_MESSAGES`.
export { QEETRIX_MESSAGES, resolveMessages } from "./lib/messages";
export type { DurationToken, EasingToken, TransitionOptions } from "./lib/motion";
export { DURATION, EASING, transition } from "./lib/motion";
export type { Breakpoint } from "./lib/responsive";
export { BREAKPOINTS, belowWidthQuery, minWidthQuery } from "./lib/responsive";
export { CHART_COLOR, COMPONENT, SHADOW, STATE_OPACITY, Z_INDEX } from "./lib/token-values";
export { cn } from "./lib/utils";
// Providers — theme, density, direction, messages.
export * from "./providers";
