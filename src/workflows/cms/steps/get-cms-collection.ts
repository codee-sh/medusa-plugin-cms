import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getCollection } from "../../../lib/registry/get-collection"

export type GetCmsCollectionInput = {
  /** The collection's slug. */
  collection: string
}

/** What a workflow's conditions read of a collection. */
export type CmsCollectionOptions = {
  slug: string
  /** Whether its documents have drafts and versions. */
  drafts: boolean
}

/**
 * Reads a collection's options from the registry and returns them, so a workflow's `when()` conditions,
 * which cannot read the registry while the workflow is composed, can branch on them.
 *
 * @throws `NOT_FOUND` for an unknown collection.
 */
export const getCmsCollectionStep = createStep(
  "get-cms-collection",
  async (input: GetCmsCollectionInput, { container }) => {
    const { collection } = getCollection(container, input.collection)

    return new StepResponse<CmsCollectionOptions>({
      slug: collection.slug,
      drafts: collection.drafts,
    })
  }
)
