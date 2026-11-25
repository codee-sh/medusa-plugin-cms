import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { getCollection } from "../../lib/registry/get-collection"

/**
 * Lets a request through only when `:collection` names a registered collection.
 *
 * An unknown slug answers 404; a config that does not resolve answers 500 with its problems.
 *
 * @param req - The request, whose `collection` param is checked.
 * @param _res - The response; the error handler writes it.
 * @param next - Continues the chain, or hands it the error.
 */
export const ensureCollection = (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  try {
    getCollection(req.scope, req.params.collection)
    next()
  } catch (error) {
    next(error)
  }
}
