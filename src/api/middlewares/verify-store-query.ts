import {
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import type { StoreQuery } from "../../lib/collection/types"
import { getCollection } from "../../lib/registry/get-collection"

/**
 * Checks a store request's query with Medusa's `validateAndTransformQuery`, on the schema and query
 * config the registry built for the collection, as both depend on its config, which a route's static
 * middleware cannot know. Medusa then does what it does for its own store routes: it reads `req.allowed`,
 * so a project's `allowFields` reaches the query, and sets `req.validatedQuery`, `req.filterableFields`
 * and `req.queryConfig`, which the route reads. A project's middleware on `/store/cms/*` runs before
 * this one, so what it sets on `req.query` is what is checked. Runs after `ensureStoreCollection`.
 *
 * @param route - Which of the collection's store queries to check: its list or a single document.
 * @returns The middleware, which answers 400 to a query its schema refuses.
 */
export const verifyStoreQuery =
  (route: keyof StoreQuery) =>
  (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    try {
      const { schema, config } = getCollection(req.scope, req.params.collection)
        .collection.storeQuery[route]

      return validateAndTransformQuery(schema, config)(req, res, next)
    } catch (error) {
      next(error)
    }
  }
