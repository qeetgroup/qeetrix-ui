/**
 * The shape of `component-manifest.json`.
 *
 * The manifest is the published, machine-readable projection of the component contract
 * (`@qeetrix/ui/manifest.json`). It is **generated** by scripts/build/manifest.mjs from three
 * inputs and nothing else:
 *
 *   1. the filesystem + scripts/config/category-map.json — identity, category, layer
 *   2. the component source — capabilities, states, variants, client boundary
 *   3. src/manifests/component-registry.ts — the declared facts that cannot be derived
 *
 * Never hand-edit the JSON. `scripts/check/component-contract.mjs` validates it against these
 * types' vocabularies on every `bun run verify`.
 *
 * @see docs/standards/component-manifest.md
 */

import type { AccessibilityContract } from "@/contracts/accessibility";
import type {
  ComponentCapabilities,
  ComponentCategory,
  ComponentStatus,
  DeprecationContract,
  TestingContract,
} from "@/contracts/component";
import type { ComponentLayer } from "@/contracts/layers";
import type { InteractionState } from "@/contracts/states";
import type { VariantContract } from "@/contracts/variants";

/**
 * Manifest schema version.
 *
 * Bumped whenever an entry's shape changes. `1` was the pre-governance manifest (identity and
 * import paths only); `2` adds the contract fields. The version-1 fields are still emitted, so
 * a version-1 consumer keeps working — see docs/standards/component-manifest.md § Compatibility.
 */
export const MANIFEST_SCHEMA_VERSION = 2;

/** One component's entry in the manifest. */
export type ComponentManifestEntry = {
  // ── identity ────────────────────────────────────────────────────────────────────────
  slug: string;
  name: string;
  category: ComponentCategory;
  layer: ComponentLayer;

  // ── import surface (schema v1, unchanged) ───────────────────────────────────────────
  /** The specifier that exports this component — the root barrel, unless barrel-excluded. */
  import: string;
  /** The stable flat deep import, valid regardless of the component's category. */
  deepImport: string;
  /** The category group import. */
  groupImport: string;

  // ── governance (schema v2) ──────────────────────────────────────────────────────────
  status: ComponentStatus;
  capabilities: ComponentCapabilities;
  states: readonly InteractionState[];
  api: VariantContract;
  accessibility: AccessibilityContract;
  testing: TestingContract;
  deprecation: DeprecationContract | null;

  // ── schema v1 fields, retained for existing consumers ───────────────────────────────
  /** Mirrors `testing.visual`. */
  story: boolean;
  /** Mirrors `testing.unit`. */
  tested: boolean;
  /** Mirrors `status === "deprecated"`. */
  deprecated: boolean;
};

/** The manifest document. */
export type ComponentManifest = {
  $schema: string;
  schemaVersion: number;
  name: string;
  version: string;
  description: string;
  /** ISO date (YYYY-MM-DD) the manifest was generated. */
  generated: string;
  styles: string;
  tokens: string;
  count: number;
  /** Component count per category. */
  categories: Record<string, number>;
  /** Component count per maturity status. */
  statuses: Record<ComponentStatus, number>;
  components: readonly ComponentManifestEntry[];
};
