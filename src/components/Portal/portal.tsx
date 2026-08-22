"use client";

/**
 * Portal — re-exported from the `primitives` layer, where the implementation lives.
 *
 * The file stays here because `@qeetrix/ui/components/portal` is a published path and Portal is
 * part of the component catalogue.
 */

export type { PortalProps } from "@/internal/portal";
export { Portal } from "@/internal/portal";
