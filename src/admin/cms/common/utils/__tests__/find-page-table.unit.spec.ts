import type { RegistryRoute } from "../../../../../lib/registry/types"
import { findPageTable } from "../find-page-table"

/**
 * Builds a route as far as the util reads it.
 *
 * @param entries - Its entries, by collection and key.
 * @returns The route.
 */
const routeOf = (
  entries: [string, string][]
): Pick<RegistryRoute<string>, "collections"> => ({
  collections: entries.map(([collection, key]) => ({ collection, key })),
})

const collections = [
  { slug: "tag", singleton: false },
  { slug: "recipe", singleton: false },
  { slug: "settings", singleton: true },
]

describe("findPageTable", () => {
  it("finds a list on the route by its entry's key", () => {
    const route = routeOf([
      ["tag", "tag"],
      ["recipe", "dishes"],
    ])

    expect(findPageTable(route, collections, "tag")).toBe("tag")
    expect(findPageTable(route, collections, "dishes")).toBe("recipe")
  })

  it("finds nothing for a key the page has no table under, a singleton's and a list's slug under another key included", () => {
    const route = routeOf([
      ["settings", "settings"],
      ["recipe", "dishes"],
    ])

    expect(findPageTable(route, collections, "settings")).toBeUndefined()
    expect(findPageTable(route, collections, "recipe")).toBeUndefined()
    expect(findPageTable(route, collections, "nope")).toBeUndefined()
  })
})
