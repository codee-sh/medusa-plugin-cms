import { useCallback } from "react"
import {
  type AdminCollectionsResponse,
  useCollections,
} from "./api/collections/collections"
import { useTranslateCollectionList } from "./use-translate-collection-list"

/**
 * Reads one registered collection from the collection list, which shares its cache with
 * `useCmsCollections`, the config's texts translated in the Admin's language.
 *
 * @param slug - The collection's slug.
 * @returns The query, whose data is the collection, or `undefined` for an unknown slug.
 */
export const useCmsCollection = (slug: string) => {
  const translate = useTranslateCollectionList()
  const select = useCallback(
    (response: AdminCollectionsResponse) =>
      translate(response).collections.find(
        (collection) => collection.slug === slug
      ),
    [translate, slug]
  )

  return useCollections({ select })
}
