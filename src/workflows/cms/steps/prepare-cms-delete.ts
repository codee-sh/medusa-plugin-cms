import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { DocumentWrite } from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"
import type { CmsDocument } from "./list-cms-documents"

export type PrepareCmsDeleteInput = {
  /** The collection's slug. */
  collection: string
  /** The document as stored. */
  stored: CmsDocument
}

/**
 * Decides the call that deletes a document: a soft delete of its row, which the models' cascades carry
 * to its areas and blocks.
 */
export const prepareCmsDeleteStep = createStep(
  "prepare-cms-delete",
  async (input: PrepareCmsDeleteInput, { container }) => {
    const { collection } = getCollection(container, input.collection)

    return new StepResponse<DocumentWrite>({
      create: [],
      update: [],
      delete: [{ key: collection.key, ids: [input.stored.id] }],
    })
  }
)
