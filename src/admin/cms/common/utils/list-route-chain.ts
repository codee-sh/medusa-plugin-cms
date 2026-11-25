import type { RegistryRoute } from "../../../../lib/registry/types"

/**
 * Lists a route with the routes whose pages its own sits under, as the tree chains them. A route sits
 * under one route at most, so the chain ends at a top-level route.
 *
 * @param routes - Every route.
 * @param slug - The route's slug.
 * @returns The chain from its topmost parent down to it; empty for an unknown slug.
 */
export const listRouteChain = <
  TRoute extends Pick<RegistryRoute, "slug" | "parent">,
>(
  routes: TRoute[],
  slug: string
): TRoute[] => {
  const chain: TRoute[] = []
  let current = routes.find((route) => route.slug === slug)

  while (current) {
    chain.unshift(current)
    const parent: string | undefined = current.parent
    current = parent ? routes.find((route) => route.slug === parent) : undefined
  }

  return chain
}
