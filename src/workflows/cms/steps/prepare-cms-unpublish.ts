import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { DocumentWrite } from "../../../lib/document/types"
import { getCollection } from "../../../lib/registry/get-collection"
import type { CmsDocument } from "./list-cms-documents"

export type PrepareCmsUnpublishInput = {
  /** The collection's slug. */
  collection: string
  /** The document as stored. */
  stored: CmsDocument
}

/**
 * Decides the call that unpublishes a document: an update of its status back to `draft`, with
 * `published_at` cleared.
 *
 * @throws `NOT_ALLOWED` for a document that is not published.
 */
export const prepareCmsUnpublishStep = createStep(
  "prepare-cms-unpublish",
  async (input: PrepareCmsUnpublishInput, { container }) => {
    const { collection } = getCollection(container, input.collection)

    if (input.stored.status !== "published") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Document "${input.stored.id}" is not published`
      )
    }

    return new StepResponse<DocumentWrite>({
      create: [],
      delete: [],
      update: [
        {
          key: collection.key,
          rows: [{ id: input.stored.id, status: "draft", published_at: null }],
        },
      ],
    })
  }
)
