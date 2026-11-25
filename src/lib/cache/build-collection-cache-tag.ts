import type { RegistryCollection } from "../collection/types"

/**
 * Builds the Caching Module's tag of every cached read of a collection's documents, which Medusa clears
 * when one of them is created, updated or deleted.
 *
 * Medusa tags a cached `query.graph` result with `<Type>:list:*` for each entity it finds in an array;
 * `<Type>` is the name Query gives the model, its DML name in PascalCase, which the collection's `key`
 * is. A read passes the tag itself, as an empty result gets no tag of its own, and `clear-cms-cache`
 * clears it, as module events reach the cache only after the workflow. Medusa's own tag rather than one
 * of the CMS's, so a write outside the plugin clears it too.
 *
 * @param collection - The collection.
 * @returns The tag.
 */
export const buildCollectionCacheTag = (
  collection: Pick<RegistryCollection, "key">
): string => `${collection.key}:list:*`
