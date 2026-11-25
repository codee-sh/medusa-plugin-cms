import { pluralize } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { DocumentWrite, RowIds } from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"
import { getRegistry } from "../../../lib/registry/get-registry"

export type CreateCmsDocumentContentInput = {
  /** The collection's slug. */
  collection: string
  /** The create calls of the write. */
  create: DocumentWrite["create"]
}

type Write = (data: unknown) => Promise<unknown>

/**
 * Lists the ids the create calls write, which the compensation removes; each row carries the id the
 * write plan gave it.
 *
 * @param calls - The create calls.
 * @returns The ids per model.
 */
const listCreatedIds = (calls: DocumentWrite["create"]): RowIds =>
  calls.map(({ key, rows }) => ({
    key,
    ids: rows.map(({ id }) => id as string),
  }))

/**
 * Creates a document's rows through the generated methods of the collection's module service. It
 * returns nothing: a caller that needs the rows reads the document back.
 *
 * Each call is its own transaction; the calls run in the write's order, parents first. A call that fails
 * after others were made answers a permanent failure holding them, so the compensation removes them; a
 * first call that fails is thrown as it is.
 *
 * The compensation deletes what this run created, children first. The delete is a hard one: a created
 * row undone leaves nothing behind, and its unique values are free again.
 */
export const createCmsDocumentContentStep = createStep(
  "create-cms-document-content",
  async (input: CreateCmsDocumentContentInput, { container }) => {
    const { module } = getCollection(container, input.collection)
    const service = container.resolve<Record<string, Write>>(module)

    for (const [index, { key, rows }] of input.create.entries()) {
      try {
        await service[`create${pluralize(key)}`](rows)
      } catch (error) {
        if (!index) {
          throw error
        }

        return StepResponse.permanentFailure(
          (error as Error).message,
          listCreatedIds(input.create.slice(0, index))
        )
      }
    }

    return new StepResponse<void, RowIds>(
      undefined,
      listCreatedIds(input.create)
    )
  },
  async (createdIds: RowIds | undefined, { container }) => {
    if (!createdIds) {
      return
    }

    const service = container.resolve<Record<string, Write>>(
      getRegistry(container).module
    )

    for (const { key, ids } of [...createdIds].reverse()) {
      await service[`delete${pluralize(key)}`](ids)
    }
  }
)
