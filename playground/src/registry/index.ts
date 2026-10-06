import { use } from "react";
import { componentBySlug, familyFile } from "../lib/manifest";
import type { FamilyExamples, ModuleExamples } from "./types";

/**
 * The example registry: one lazily loaded file per component family,
 * `playground/src/examples/<family-file>.tsx`, each exporting `examples` keyed by manifest slug.
 * Families load on demand (the gallery, an inspector route, a frame), so the shell does not
 * parse a hundred families' demos before it can paint.
 */

type FamilyModule = { examples: FamilyExamples };

const loaders = import.meta.glob<FamilyModule>("../examples/*.tsx");

/** Example file name (without extension) → loader. */
export const familyLoaders: ReadonlyMap<string, () => Promise<FamilyModule>> = new Map(
  Object.entries(loaders).map(([path, load]) => [
    path.replace(/^.*\/examples\//, "").replace(/\.tsx$/, ""),
    load,
  ]),
);

const cache = new Map<string, Promise<FamilyExamples>>();

/** The examples for a family, loaded once. Rejects when the family has no example file. */
export function loadFamily(family: string): Promise<FamilyExamples> {
  const file = familyFile(family);
  let pending = cache.get(file);
  if (!pending) {
    const load = familyLoaders.get(file);
    pending = load
      ? load().then((module) => module.examples)
      : Promise.reject(
          new Error(`No example file for the ${family} family (examples/${file}.tsx).`),
        );
    cache.set(file, pending);
  }
  return pending;
}

/** Suspends until the family's examples are loaded. */
export function useFamilyExamples(family: string): FamilyExamples {
  return use(loadFamily(family));
}

/** Suspends until the module's examples are loaded; `null` for a slug with no example. */
export function useModuleExamples(slug: string): ModuleExamples | null {
  const component = componentBySlug.get(slug);
  const examples = use(loadFamily(component?.category ?? slug));
  return examples[slug] ?? null;
}

/** Warm the cache for every family (the gallery does this once it has painted). */
export function preloadAllFamilies(families: readonly string[]): void {
  for (const family of families) void loadFamily(family).catch(() => undefined);
}
