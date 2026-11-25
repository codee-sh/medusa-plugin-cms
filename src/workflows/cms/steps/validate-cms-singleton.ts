import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getCollection } from "../../../lib/registry/get-collection"

export type ValidateCmsSingletonInput = {
  /** The collection's slug. */
  collection: string
  operation: "create" | "delete"
  /** For a create, how many live documents the collection holds. */
  count?: number
}

/**
 * Refuses a write that would leave a singleton with other than one document: a create while its document
 * exists, and any delete. A list collection passes.
 *
 * The message names no collection: its label may be a key of the Admin's translations.
 *
 * @throws `NOT_ALLOWED` when the write is refused.
 */
export const validateCmsSingletonStep = createStep(
  "validate-cms-singleton",
  async (input: ValidateCmsSingletonInput, { container }) => {
    const { collection } = getCollection(container, input.collection)

    if (!collection.singleton) {
      return new StepResponse<void>(undefined)
    }

    if (input.operation === "delete") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This collection holds one document, which cannot be deleted. Edit it instead."
      )
    }

    if (input.count) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This collection holds one document, which already exists. Edit it instead."
      )
    }

    return new StepResponse<void>(undefined)
  }
)
