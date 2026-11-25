import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getCollection } from "../../../lib/registry/get-collection"

export type ValidateCmsDraftsInput = {
  /** The collection's slug. */
  collection: string
}

/**
 * Refuses an operation on drafts or versions - a publish, an unpublish, a discard, a restore, or a read
 * of the versions - in a collection without drafts, where every save is live and records no version.
 *
 * The message names no collection: its label may be a key of the Admin's translations.
 *
 * @throws `NOT_ALLOWED` when the collection has no drafts.
 */
export const validateCmsDraftsStep = createStep(
  "validate-cms-drafts",
  async (input: ValidateCmsDraftsInput, { container }) => {
    const { collection } = getCollection(container, input.collection)

    if (!collection.drafts) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Drafts and versions are off for this collection, so changes go live when saved."
      )
    }

    return new StepResponse<void>(undefined)
  }
)
