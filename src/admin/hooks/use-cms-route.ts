import { useCallback } from "react"
import {
  type AdminCollectionsResponse,
  useCollections,
} from "./api/collections/collections"
import { useTranslateCollectionList } from "./use-translate-collection-list"

/**
 * Reads one route of the Admin and the collections its page shows from the collection list, which
 * shares its cache with `useCmsCollections`, the config's texts translated in the Admin's language.
 *
 * @param slug - The route's slug, from the URL.
 * @returns The query, whose data is the route and its collections in the route's order, or `undefined`
 * for a slug no route has.
 */
export const useCmsRoute = (slug: string) => {
  const translate = useTranslateCollectionList()
  const select = useCallback(
    (response: AdminCollectionsResponse) => {
      const list = translate(response)
      const route = list.routes.find((candidate) => candidate.slug === slug)

      return (
        route && {
          route,
          collections: route.collections.flatMap(({ collection }) =>
            list.collections.filter(({ slug }) => slug === collection)
          ),
        }
      )
    },
    [translate, slug]
  )

  return useCollections({ select })
}
