import { describe, expect, it } from "vitest";
import { components, families, familyFile } from "../src/lib/manifest";
import { familyLoaders } from "../src/registry";
import type { FamilyExamples } from "../src/registry/types";

/**
 * Every module in component-manifest.json must have playground examples — demos for the gallery
 * and a playground spec for the inspector — and the playground must not carry examples for
 * modules the manifest no longer has. Run with `bunx vitest run playground`.
 */

async function loadAll(): Promise<Map<string, FamilyExamples>> {
  const loaded = new Map<string, FamilyExamples>();
  for (const [file, load] of familyLoaders) loaded.set(file, (await load()).examples);
  return loaded;
}

describe("playground example coverage", () => {
  it("has an example file for every component family", () => {
    const missing = families
      .map((family) => familyFile(family.name))
      .filter((file) => !familyLoaders.has(file));
    expect(missing, `Add playground/src/examples/<family>.tsx for: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("has examples for every manifest module, in its family's file", async () => {
    const loaded = await loadAll();
    const missing = components
      .filter((component) => !loaded.get(familyFile(component.category))?.[component.slug])
      .map((component) => `${component.slug} (${component.category})`);
    expect(missing, `Modules without playground examples: ${missing.join(", ")}`).toEqual([]);
  }, 60_000);

  it("has no examples for slugs the manifest does not list", async () => {
    const loaded = await loadAll();
    const known = new Map(components.map((component) => [component.slug, component.category]));
    const stray: string[] = [];
    for (const [file, examples] of loaded) {
      for (const slug of Object.keys(examples)) {
        const family = known.get(slug);
        if (!family || familyFile(family) !== file) stray.push(`${slug} in examples/${file}.tsx`);
      }
    }
    expect(stray, `Examples for unknown or misplaced slugs: ${stray.join(", ")}`).toEqual([]);
  }, 60_000);

  it("gives every module at least one demo and a playground spec", async () => {
    const loaded = await loadAll();
    const incomplete: string[] = [];
    for (const examples of loaded.values()) {
      for (const [slug, entry] of Object.entries(examples)) {
        if (entry.demos.length === 0) incomplete.push(`${slug}: no demos`);
        if (typeof entry.playground?.render !== "function")
          incomplete.push(`${slug}: no playground`);
        if (typeof entry.playground?.code !== "function") incomplete.push(`${slug}: no code`);
        const names = entry.demos.map((demo) => demo.name);
        if (new Set(names).size !== names.length) incomplete.push(`${slug}: duplicate demo names`);
      }
    }
    expect(incomplete).toEqual([]);
  }, 60_000);
});
