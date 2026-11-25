import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { getCollection } from "../../lib/registry/get-collection"

/**
 * Lets a store request through only when `:collection` names a registered collection the store may
 * read, one whose config does not set `store: false`.
 *
 * An unknown slug and a collection kept out of the store answer the same 404, so the store does not tell
 * which collections exist; a config that does not resolve answers 500 with its problems.
 *
 * @param req - The request, whose `collection` param is checked.
 * @param _res - The response; the error handler writes it.
 * @param next - Continues the chain, or hands it the error.
 */
export const ensureStoreCollection = (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  try {
    const { collection } = getCollection(req.scope, req.params.collection)

    if (!collection.store) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Collection "${req.params.collection}" was not found`
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}
