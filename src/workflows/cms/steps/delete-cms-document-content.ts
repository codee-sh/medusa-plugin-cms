import { pluralize } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { listLiveRows } from "../../../lib/document/list-live-rows"
import { listRevivedRows } from "../../../lib/document/list-revived-rows"
import type { DocumentWrite, RowIds } from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"
import { getRegistry } from "../../../lib/registry/get-registry"

export type DeleteCmsDocumentContentInput = {
  /** The collection's slug. */
  collection: string
  /** The delete calls of the write. */
  delete: DocumentWrite["delete"]
  /** The document as `get-cms-document` read it before the write, whose live rows a restore keeps. */
  stored: Record<string, unknown>
}

/** What the compensation restores: the ids this run deleted, and the rows live before it. */
type DeletedRows = { deleted: RowIds; live: RowIds }

type Write = (ids: string[]) => Promise<Record<string, string[]> | void>

/**
 * Soft-deletes the rows a write removes - the blocks a save drops, or the document itself - through the
 * generated methods of the collection's module service; the models' cascades soft-delete what hangs
 * under them. A write that removes nothing makes no call and keeps nothing to undo.
 *
 * Each call is its own transaction. A call that fails after others were made answers a permanent failure
 * holding them, so the compensation restores them; a first call that fails is thrown as it is.
 *
 * The compensation restores the deleted rows, then soft-deletes again what the restore brought back and
 * was not live before the write, as `listRevivedRows` finds it, so a row deleted by an earlier save
 * stays deleted.
 */
export const deleteCmsDocumentContentStep = createStep(
  "delete-cms-document-content",
  async (input: DeleteCmsDocumentContentInput, { container }) => {
    if (!input.delete.length) {
      return new StepResponse<void, DeletedRows>(undefined)
    }

    const registry = getRegistry(container)
    const { module, collection } = getCollection(container, input.collection)
    const service = container.resolve<Record<string, Write>>(module)
    const live = listLiveRows(registry, collection, input.stored)

    for (const [index, { key, ids }] of input.delete.entries()) {
      try {
        await service[`softDelete${pluralize(key)}`](ids)
      } catch (error) {
        if (!index) {
          throw error
        }

        return StepResponse.permanentFailure((error as Error).message, {
          deleted: input.delete.slice(0, index),
          live,
        })
      }
    }

    return new StepResponse<void, DeletedRows>(undefined, {
      deleted: input.delete,
      live,
    })
  },
  async (deletedRows: DeletedRows | undefined, { container }) => {
    if (!deletedRows) {
      return
    }

    const service = container.resolve<Record<string, Write>>(
      getRegistry(container).module
    )

    for (const { key, ids } of deletedRows.deleted) {
      const restored = (await service[`restore${pluralize(key)}`](ids)) ?? {}

      for (const revived of listRevivedRows(restored, deletedRows.live)) {
        await service[`softDelete${pluralize(revived.key)}`](revived.ids)
      }
    }
  }
)
