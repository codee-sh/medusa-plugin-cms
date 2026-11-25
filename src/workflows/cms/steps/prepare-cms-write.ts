import { generateEntityId } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { prepareDocumentWrite } from "../../../lib/document/prepare-document-write"
import type { DocumentWrite } from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"
import { getRegistry } from "../../../lib/registry/get-registry"
import type { PreparedCmsDocument } from "./prepare-cms-document-input"

export type PrepareCmsWriteInput = {
  /** The collection's slug. */
  collection: string
  document: PreparedCmsDocument
  /** The document as stored, when an existing one is edited; without it, the document is new. */
  stored?: Record<string, unknown>
}

/**
 * Decides the calls that write a document, through `prepareDocumentWrite`: with nothing stored the
 * document is created, otherwise it is updated. The write steps after it take the calls of their own
 * kind.
 *
 * A new document's id is generated here, with the model's prefix, so a retry of the workflow writes the
 * same id; its status is left to the column's default, a draft. An edit updates the values the body
 * holds and `updated_by`, and leaves every other column as stored.
 *
 * In a collection without drafts every write is live: a new document, and a draft row left from before
 * drafts were turned off, are written `published` with `published_at` now, the time taken here so a
 * retry writes the same one. The status is added after the validation, whose schema refuses it in a
 * body.
 */
export const prepareCmsWriteStep = createStep(
  "prepare-cms-write",
  async (input: PrepareCmsWriteInput, { container }) => {
    const { collection } = getCollection(container, input.collection)
    const documentId = input.stored
      ? (input.stored.id as string)
      : generateEntityId(undefined, collection.idPrefix)
    const publishes = !collection.drafts && input.stored?.status !== "published"
    const document = publishes
      ? {
          ...input.document,
          values: {
            ...input.document.values,
            status: "published",
            published_at: new Date(),
          },
        }
      : input.document

    return new StepResponse<DocumentWrite>(
      prepareDocumentWrite(
        getRegistry(container),
        collection,
        documentId,
        input.stored,
        document
      )
    )
  }
)
