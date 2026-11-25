import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { buildReadPlacement } from "../../../lib/document/build-read-placement"
import { listMediaSlots } from "../../../lib/document/list-media-slots"
import { MEDIA_STORES } from "../../../lib/media-provider/media-stores"
import type { CmsMediaStore } from "../../../lib/media-provider/types"
import type { MediaRead, MediaRecords } from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"
import { getMediaProvider } from "../../../lib/registry/get-media-provider"
import { getRegistry } from "../../../lib/registry/get-registry"

export type ListCmsDocumentMediaInput = {
  /** The collection's slug. */
  collection: string
  /** The documents whose media fields are read, with their areas under their names. */
  documents: Record<string, unknown>[]
}

/**
 * Reads the media records the documents' media fields hold, their blocks' included, through the
 * config's media provider: each value once, one call per kind of stored value, and none without
 * values. Hands on where the documents hold media too, so a later transform can place or check the
 * records without the registry.
 */
export const listCmsDocumentMediaStep = createStep(
  "list-cms-document-media",
  async (input: ListCmsDocumentMediaInput, { container }) => {
    const registry = getRegistry(container)
    const { collection } = getCollection(container, input.collection)
    const placement = buildReadPlacement(registry, collection)
    const values: Record<CmsMediaStore, Set<string>> = {
      id: new Set(),
      url: new Set(),
    }

    for (const document of input.documents) {
      for (const slot of listMediaSlots(document, placement)) {
        slot.values.forEach((value) => values[slot.field.stores!].add(value))
      }
    }

    const records: MediaRecords = { id: [], url: [] }
    const stores = MEDIA_STORES.filter((store) => values[store].size)

    if (stores.length) {
      const provider = getMediaProvider(container)

      for (const store of stores) {
        records[store] = await provider.retrieve([...values[store]], store)
      }
    }

    return new StepResponse<MediaRead>({ placement, records })
  }
)
