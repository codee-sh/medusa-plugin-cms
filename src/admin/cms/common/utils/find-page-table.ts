import type { ClientCollection } from "../../../../lib/collection/types"
import type { RegistryRoute } from "../../../../lib/registry/types"

/**
 * Finds the list a table of a route's page shows by the table's key, its entry's key on the route.
 * **Create**, **Add** and a row's drawer name their table so.
 *
 * @param route - The route whose page shows the table.
 * @param collections - The collections the route shows.
 * @param key - The table's key on the page.
 * @returns The slug of the list the table shows, or `undefined` when the page has no such table.
 */
export const findPageTable = (
  route: Pick<RegistryRoute<string>, "collections">,
  collections: Pick<ClientCollection, "slug" | "singleton">[],
  key: string
): string | undefined => {
  const entry = route.collections.find((candidate) => candidate.key === key)
  const collection = collections.find(({ slug }) => slug === entry?.collection)

  return collection && !collection.singleton ? collection.slug : undefined
}
