/**
 * @qeetrix/ui — the Qeet Group design system.
 *
 * Components are organized by family under src/components/<Family>/; this barrel
 * re-exports every family, the providers, hooks and lib helpers.
 *
 * The published surface is locked by src/__tests__/public-api.json — any addition or
 * removal must be re-snapshotted via `bun run check:exports -- --update` and land in
 * the same PR. See scripts/check/exports.mjs.
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

// Components — 137 modules across 97 families.
export * from "./components";
// The controlled/uncontrolled contract every component follows, for building your own.
export { useControllableState } from "./hooks/use-controllable-state";
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
export { COMPONENT } from "./lib/token-values";
export { cn } from "./lib/utils";
// Providers — theme, density, direction, messages.
export * from "./providers";
