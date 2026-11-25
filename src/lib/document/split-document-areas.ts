import type { RegistryCollection } from "../collection/types"
import type { SubmittedBlock } from "./types"

/**
 * Splits a document's values from the areas it holds, as they are written to rows of their own.
 *
 * @param collection - The document's collection, whose areas are taken out.
 * @param document - The document's values, with the areas it holds under their names.
 * @returns The values without the areas, and each area the document holds under its name.
 */
export const splitDocumentAreas = (
  collection: RegistryCollection,
  document: Record<string, unknown>
): {
  values: Record<string, unknown>
  areas: Record<string, SubmittedBlock[]>
} => {
  const values = { ...document }
  const areas: Record<string, SubmittedBlock[]> = {}

  for (const { name } of collection.areas) {
    if (name in values) {
      areas[name] = values[name] as SubmittedBlock[]
      delete values[name]
    }
  }

  return { values, areas }
}
