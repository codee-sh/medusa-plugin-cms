import type { RegistryBlock } from "../block/types"
import type { RegistryCollection } from "../collection/types"
import type { Registry } from "../registry/types"
import type { DocumentShape } from "./types"

/**
 * Tells where a collection's documents hold their blocks, as the server knows it: the collection's
 * areas and every block type of the registry.
 *
 * @param registry - The resolved registry.
 * @param collection - The collection.
 * @returns The shape.
 */
export const buildDocumentShape = (
  registry: Registry,
  collection: RegistryCollection
): DocumentShape<RegistryBlock> => ({
  areas: collection.areas,
  blocks: Object.values(registry.blocks),
})
