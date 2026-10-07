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

import type { A11yAuditState, AccessibilityContract } from "@/contracts/accessibility";
import type {
  ComponentCapabilities,
  ComponentCategory,
  ComponentStatus,
  DeprecationContract,
  TestingContract,
} from "@/contracts/component";
import type { ComponentLayer } from "@/contracts/layers";
import type { InteractionState } from "@/contracts/states";
import type { AxisSource, ControlledStateContract, VariantContract } from "@/contracts/variants";

/**
 * Manifest schema version.
 *
 * Bumped whenever an entry's shape changes. `1` was the pre-governance manifest (identity and
 * import paths only); `2` added the contract fields; `3` adds the accessibility audit matrix
 * and the declared API surface. The version-1 fields are still emitted, so
 * a version-1 consumer keeps working — see docs/standards/component-manifest.md § Compatibility.
 */
export const MANIFEST_SCHEMA_VERSION = 3;

/** One component's entry in the manifest. */
export type ComponentManifestEntry = {
  // ── identity ────────────────────────────────────────────────────────────────────────
  slug: string;
  name: string;
  /**
   * One sentence on what the component is for: the first sentence of the doc comment on its
   * declaration, or the registry's `description` for a module of several exports. `null` when
   * neither exists.
   */
  description: string | null;
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
  /**
   * The public API surface: the `cva` variants and sizes read from the source, plus the declared
   * parts — legacy variant aliases, axes that use domain names, and the controlled-state triples.
   */
  api: VariantContract & {
    variantAliases: Readonly<Record<string, string>> | null;
    domainAxes: readonly ("variant" | "size")[] | null;
    controlled: readonly ControlledStateContract[] | null;
    /**
     * Where each public design-axis prop's values come from, for axes `cva` did not produce.
     * `null` means the component declares no axis-shaped prop at all — which is a different
     * statement from "it has one and nobody recorded it", and the reason this field exists.
     */
    axisSources: Readonly<Record<string, { source: AxisSource; note: string }>> | null;
  };
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
  /** Component count per accessibility audit roll-up state. */
  accessibilityAudit: Record<A11yAuditState, number>;
  components: readonly ComponentManifestEntry[];
};

/**
 * The field list, as data — the local, versioned schema `check:contract` enforces.
 *
 * MAN-001: the types above are erased at build time, so nothing stopped the generator from
 * emitting a field the shape does not declare (`accessibilityAudit` was emitted for a whole
 * schema version without appearing in `ComponentManifest`) or from dropping one. These arrays
 * are read statically by scripts/lib/ts-literals.mjs and checked in both directions, so the
 * published artifact and the declared shape cannot drift apart again.
 *
 * Adding a field to the manifest means adding it here. That is the point.
 */
export const MANIFEST_DOCUMENT_FIELDS = [
  "$schema",
  "schemaVersion",
  "name",
  "version",
  "description",
  "generated",
  "styles",
  "tokens",
  "count",
  "categories",
  "statuses",
  "accessibilityAudit",
  "components",
] as const;

/** The field list for one component entry. Same contract, same reason. */
export const MANIFEST_ENTRY_FIELDS = [
  "slug",
  "name",
  "description",
  "category",
  "layer",
  "import",
  "deepImport",
  "groupImport",
  "status",
  "capabilities",
  "states",
  "api",
  "accessibility",
  "testing",
  "deprecation",
  "story",
  "tested",
  "deprecated",
] as const;

/** The field list for `api`. */
export const MANIFEST_API_FIELDS = [
  "variants",
  "sizes",
  "variantGroups",
  "variantAliases",
  "domainAxes",
  "controlled",
  "axisSources",
] as const;
