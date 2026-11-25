import type { ClientCollection } from "../../../../lib/collection/types"

/**
 * Names a collection's page: a singleton by its singular label, as it holds one document, another
 * collection by its plural.
 *
 * @param collection - The collection.
 * @returns The label.
 */
export const collectionPageLabel = (
  collection: Pick<ClientCollection, "singleton" | "labels">
): string =>
  collection.singleton ? collection.labels.singular : collection.labels.plural
