import type { RegistryCollection } from "../collection/types"
import type { Registry } from "../registry/types"
import { buildDocumentShape } from "./build-document-shape"
import { listDocumentBlocks } from "./list-document-blocks"
import type { DocumentAreaRow, RowIds } from "./types"

/**
 * Lists the live rows of a document as `get-cms-document` reads it, per model: the document, its area
 * rows, and its blocks of every configured type at any depth, a type without blocks listed with no ids.
 *
 * @param registry - The resolved registry.
 * @param collection - The document's collection.
 * @param document - The document, with its area rows under `areas` and its blocks under each area's name.
 * @returns The ids per model, parents first.
 */
export const listLiveRows = (
  registry: Registry,
  collection: RegistryCollection,
  document: Record<string, unknown>
): RowIds => {
  const blocks = listDocumentBlocks(
    buildDocumentShape(registry, collection),
    document
  )
  const live: RowIds = [{ key: collection.key, ids: [document.id as string] }]

  if (registry.area) {
    live.push({
      key: registry.area.key,
      ids: ((document.areas ?? []) as DocumentAreaRow[]).map(({ id }) => id),
    })
  }

  for (const block of Object.values(registry.blocks)) {
    live.push({
      key: block.key,
      ids: blocks
        .filter(({ type }) => type === block)
        .map(({ block: { id } }) => id as string),
    })
  }

  return live
}
