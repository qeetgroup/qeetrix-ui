import rawManifest from "../../../component-manifest.json";

/**
 * Typed view of component-manifest.json (schema v3). The file is imported, not fetched, so Vite
 * hot-reloads it when `build:manifest` rewrites it. Only the fields the playground reads are
 * typed; everything is treated as optional-tolerant so a schema addition never breaks the build.
 */

export type Status = "experimental" | "beta" | "stable" | "deprecated";
export type Audit = "not-audited" | "partial" | "audited" | "exception";
export type CapabilityKey = "rtl" | "darkMode" | "density" | "ssr" | "reducedMotion";
export type DimensionResult = "pass" | "partial" | "fail" | "not-audited" | "not-applicable";

export interface ManifestComponent {
  slug: string;
  name: string;
  category: string;
  layer: string;
  import: string;
  deepImport: string;
  groupImport: string;
  status: Status;
  capabilities: Record<CapabilityKey, string>;
  states: string[] | null;
  api: {
    variants: string[] | null;
    sizes: string[] | null;
    variantGroups: string[] | null;
    variantAliases: Record<string, string> | null;
    domainAxes: string[] | null;
    axisSources: Record<string, unknown> | null;
    controlled: { value: string; default: string; change: string }[] | null;
  };
  accessibility: {
    required: boolean;
    pattern: string;
    audit: Audit;
    dimensions: Record<string, DimensionResult>;
    keyboard: string[] | null;
    focus: { model: string; contained: boolean; restored: boolean } | null;
    liveRegion: string | null;
    exceptions: unknown;
  };
  testing: Record<"unit" | "accessibility" | "interaction" | "visual" | "hydration", boolean>;
  deprecation: {
    since: string;
    reason: string;
    replacement: string | null;
    migration: string | null;
    removeIn: string | null;
  } | null;
  story: boolean;
  tested: boolean;
  deprecated: boolean;
}

export interface Manifest {
  schemaVersion: number;
  name: string;
  version: string;
  description: string;
  generated: string;
  count: number;
  categories: Record<string, number>;
  statuses: Record<Status, number>;
  accessibilityAudit: Record<Audit, number>;
  components: ManifestComponent[];
}

export const manifest = rawManifest as unknown as Manifest;

export const components: readonly ManifestComponent[] = [...manifest.components].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export const componentBySlug: ReadonlyMap<string, ManifestComponent> = new Map(
  components.map((component) => [component.slug, component]),
);

export interface Family {
  name: string;
  modules: ManifestComponent[];
}

/** Families (manifest `category`) in alphabetical order, modules sorted by name within. */
export const families: readonly Family[] = (() => {
  const byName = new Map<string, ManifestComponent[]>();
  for (const component of components) {
    const list = byName.get(component.category) ?? [];
    list.push(component);
    byName.set(component.category, list);
  }
  return [...byName.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, modules]) => ({ name, modules }));
})();

/** "OTPInput" → "otp-input", "QRCode" → "qr-code": the family's example file name. */
export function familyFile(family: string): string {
  return family
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

export const statusOrder: readonly Status[] = ["stable", "beta", "experimental", "deprecated"];
export const auditOrder: readonly Audit[] = ["audited", "partial", "not-audited", "exception"];

export const capabilityLabels: Record<CapabilityKey, string> = {
  rtl: "RTL",
  darkMode: "Dark mode",
  density: "Density",
  ssr: "SSR",
  reducedMotion: "Reduced motion",
};

/** The value of a capability that counts as "covered" for that axis. */
export function capabilityCovered(key: CapabilityKey, value: string): boolean {
  return key === "ssr" ? value === "server-safe" : value === "supported";
}

export const statusBadge: Record<Status, "success" | "warning" | "destructive" | "secondary"> = {
  stable: "success",
  beta: "warning",
  experimental: "secondary",
  deprecated: "destructive",
};

export const auditLabel: Record<Audit, string> = {
  audited: "Audited",
  partial: "Partially audited",
  "not-audited": "Not audited",
  exception: "Exception",
};
