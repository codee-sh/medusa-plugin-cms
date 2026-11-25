import { useCollections } from "./api/collections/collections"
import { useTranslateCollectionList } from "./use-translate-collection-list"

/**
 * Reads the registered collections with their document counts, the config's texts translated in the
 * Admin's language: what a screen shows.
 *
 * @returns The query of `GET /admin/cms/collections`.
 */
export const useCmsCollections = () => {
  const translate = useTranslateCollectionList()

  return useCollections({ select: translate })
}
