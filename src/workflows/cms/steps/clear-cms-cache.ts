import type { ICachingModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { buildCollectionCacheTag } from "../../../lib/cache/build-collection-cache-tag"
import type { DocumentWrite } from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"

export type ClearCmsCacheInput = {
  /** The collection's slug. */
  collection: string
  /** The write the workflow made, the document's own row among its rows. */
  write: DocumentWrite
}

/**
 * Clears what the Caching Module holds of the rows a write touched and of the collection's lists, so the
 * store's next read answers the write. Module events clear the same tags, but only after the workflow
 * ends, too late for a read that follows at once.
 *
 * The tags are the Caching Module's own, `computeTags` with the operation of each row: `created`,
 * `updated` or `deleted`. Every row has its id before the write, a new one included, and the
 * document's tag is among them, so a cached read of the document goes whatever block changed. The
 * collection's tag is added as it is, for a cached read that found nothing.
 *
 * Without the Caching Module it does nothing. It has no compensation: after a rollback the next read
 * fills the cache again from what is stored.
 */
export const clearCmsCacheStep = createStep(
  "clear-cms-cache",
  async (input: ClearCmsCacheInput, { container }) => {
    const caching = container.resolve<ICachingModuleService | undefined>(
      Modules.CACHING,
      { allowUnregistered: true }
    )

    if (!caching) {
      return new StepResponse(undefined)
    }

    const { collection } = getCollection(container, input.collection)
    const operations = [
      [
        "created",
        input.write.create.flatMap(({ rows }) => rows.map(({ id }) => id)),
      ],
      [
        "updated",
        input.write.update.flatMap(({ rows }) => rows.map(({ id }) => id)),
      ],
      ["deleted", input.write.delete.flatMap(({ ids }) => ids)],
    ] as const
    const computed = await Promise.all(
      operations
        .filter(([, ids]) => ids.length)
        .map(([operation, ids]) =>
          caching.computeTags(
            { rows: ids.map((id) => ({ id })) },
            { operation }
          )
        )
    )

    await caching.clear({
      tags: [
        ...new Set([...computed.flat(), buildCollectionCacheTag(collection)]),
      ],
    })

    return new StepResponse(undefined)
  }
)
