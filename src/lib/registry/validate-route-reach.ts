import { buildConfigError } from "../config/build-config-error"
import type { PreparedCollection } from "../collection/types"
import type { PlacedRoute } from "./validate-route-nodes"

/**
 * Checks that every collection stands on a route, as the Admin reaches a collection on its route's page
 * alone and its documents need an address.
 *
 * @param collections - Every collection, by slug.
 * @param routes - The routes of the tree.
 * @throws At the first collection on no route.
 */
export const validateRouteReach = (
  collections: Record<string, PreparedCollection>,
  routes: PlacedRoute[]
): void => {
  for (const collection of Object.values(collections)) {
    const isRouted = routes.some(({ entries }) =>
      entries.some((entry) => entry.collection === collection.slug)
    )

    if (!isRouted) {
      throw buildConfigError(
        `admin "routes": "${collection.slug}" stands on no route, so the Admin cannot reach it: give it one in admin "routes"`
      )
    }
  }
}
