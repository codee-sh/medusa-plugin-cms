import {
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { listCmsDocumentsQueryConfig } from "../admin/cms/collections/[collection]/documents/query-config"
import { AdminGetCmsDocumentsParams } from "../admin/cms/collections/[collection]/documents/validators"
import { getCollection } from "../../lib/registry/get-collection"

/**
 * Checks an Admin list request's query with Medusa's `validateAndTransformQuery`: the list's own
 * parameters, and `filters` on the fields the registry lets the collection's list filter by, which a
 * route's static middleware cannot know. Runs after `ensureCollection`.
 *
 * @param req - The request, with the collection in its params.
 * @param res - The response.
 * @param next - The next middleware, which gets a query its schema refuses as a 400.
 */
export const verifyAdminListQuery = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  try {
    const { adminListFilters } = getCollection(
      req.scope,
      req.params.collection
    ).collection

    return validateAndTransformQuery(
      AdminGetCmsDocumentsParams.extend({ filters: adminListFilters }),
      listCmsDocumentsQueryConfig
    )(req, res, next)
  } catch (error) {
    next(error)
  }
}
