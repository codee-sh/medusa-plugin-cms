import { pluralize } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { RegistryCollection } from "../../../lib/collection/types"
import { buildDocumentShape } from "../../../lib/document/build-document-shape"
import { listDocumentBlocks } from "../../../lib/document/list-document-blocks"
import type {
  DocumentAreaRow,
  DocumentWrite,
} from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"
import { getRegistry } from "../../../lib/registry/get-registry"
import type { Registry } from "../../../lib/registry/types"

export type UpdateCmsDocumentContentInput = {
  /** The collection's slug. */
  collection: string
  /** The update calls of the write. */
  update: DocumentWrite["update"]
  /**
   * The document as `get-cms-document` read it before the save, with its areas, whose values the
   * compensation writes back.
   */
  stored: Record<string, unknown>
}

/** What the compensation writes back: per model, each updated row with the stored values of its columns. */
type StoredRows = DocumentWrite["update"]

type Write = (data: unknown) => Promise<unknown>

/**
 * Indexes the rows of a stored document by id: the document itself, its area rows, and its blocks at
 * any depth.
 *
 * @param registry - The resolved registry.
 * @param collection - The document's collection.
 * @param stored - The stored document.
 * @returns The rows by id.
 */
const indexStoredRows = (
  registry: Registry,
  collection: RegistryCollection,
  stored: Record<string, unknown>
): Map<unknown, Record<string, unknown>> =>
  new Map(
    [
      stored,
      ...((stored.areas ?? []) as DocumentAreaRow[]),
      ...listDocumentBlocks(
        buildDocumentShape(registry, collection),
        stored
      ).map(({ block }) => block),
    ].map((row) => [row.id, row])
  )

/**
 * Builds what the compensation writes back for the calls made: each row with the stored values of the
 * columns it wrote.
 *
 * @param registry - The resolved registry.
 * @param collection - The document's collection.
 * @param stored - The stored document.
 * @param calls - The update calls made.
 * @returns The rows to write back, per model.
 */
const listStoredRows = (
  registry: Registry,
  collection: RegistryCollection,
  stored: Record<string, unknown>,
  calls: DocumentWrite["update"]
): StoredRows => {
  const rows = indexStoredRows(registry, collection, stored)

  return calls.map(({ key, rows: written }) => ({
    key,
    rows: written.map(({ id, ...columns }) => {
      const row = rows.get(id) ?? {}

      return {
        id,
        ...Object.fromEntries(
          Object.keys(columns).map((column) => [column, row[column]])
        ),
      }
    }),
  }))
}

/**
 * Updates a document's rows, its own and its blocks', through the generated methods of the collection's
 * module service. It returns nothing: a caller that needs the rows reads the document back.
 *
 * Each call is its own transaction; the calls run in the write's order. A call that fails after others
 * were made answers a permanent failure holding them, so the compensation writes them back; a first call
 * that fails is thrown as it is.
 *
 * The compensation updates each row back to its stored values, for the columns this run wrote, found in
 * the stored document.
 */
export const updateCmsDocumentContentStep = createStep(
  "update-cms-document-content",
  async (input: UpdateCmsDocumentContentInput, { container }) => {
    const registry = getRegistry(container)
    const { module, collection } = getCollection(container, input.collection)
    const service = container.resolve<Record<string, Write>>(module)

    for (const [index, { key, rows }] of input.update.entries()) {
      try {
        await service[`update${pluralize(key)}`](rows)
      } catch (error) {
        if (!index) {
          throw error
        }

        return StepResponse.permanentFailure(
          (error as Error).message,
          listStoredRows(
            registry,
            collection,
            input.stored,
            input.update.slice(0, index)
          )
        )
      }
    }

    return new StepResponse<void, StoredRows>(
      undefined,
      listStoredRows(registry, collection, input.stored, input.update)
    )
  },
  async (storedRows: StoredRows | undefined, { container }) => {
    if (!storedRows) {
      return
    }

    const service = container.resolve<Record<string, Write>>(
      getRegistry(container).module
    )

    for (const { key, rows } of storedRows) {
      await service[`update${pluralize(key)}`](rows)
    }
  }
)
