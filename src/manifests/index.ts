/**
 * Component metadata: the generated manifest's type, and the declarations it is generated
 * from.
 *
 * Like src/contracts, this module is not part of the published `@qeetrix/ui` barrel. The
 * *data* is published — as `@qeetrix/ui/manifest.json` — while these declarations stay a
 * source-of-truth for the build.
 */

export type { ComponentManifest, ComponentManifestEntry } from "./component-manifest";
export { MANIFEST_SCHEMA_VERSION } from "./component-manifest";
export type { ComponentDeclaration, RegisteredSlug } from "./component-registry";
export { COMPONENT_REGISTRY, REGISTRY_DEFAULTS } from "./component-registry";
