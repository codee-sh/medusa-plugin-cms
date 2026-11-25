import type { RegistryRoute } from "../../../../../lib/registry/types"
import { listRouteChain } from "../list-route-chain"

/**
 * Builds a route as far as the util reads it.
 *
 * @param slug - The route's slug.
 * @param parent - The slug of its parent, if any.
 * @returns The route.
 */
const routeOf = (slug: string, parent?: string): RegistryRoute => ({
  slug,
  label: slug,
  collections: [{ collection: `${slug}_collection`, key: slug }],
  parent,
  children: [],
})

const routes = [
  routeOf("pages"),
  routeOf("settings", "pages"),
  routeOf("homepages", "settings"),
]

describe("listRouteChain", () => {
  it("lists the chain from the topmost parent down to the route", () => {
    expect(listRouteChain(routes, "homepages").map(({ slug }) => slug)).toEqual(
      ["pages", "settings", "homepages"]
    )
  })

  it("lists a route without a parent alone", () => {
    expect(listRouteChain(routes, "pages").map(({ slug }) => slug)).toEqual([
      "pages",
    ])
  })

  it("lists nothing for a slug no route has, a collection's slug included", () => {
    expect(listRouteChain(routes, "nope")).toEqual([])
    expect(listRouteChain(routes, "pages_collection")).toEqual([])
  })
})
