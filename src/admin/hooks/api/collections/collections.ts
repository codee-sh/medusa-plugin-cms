import { queryOptions, useQuery } from "@tanstack/react-query"
import type { ClientText } from "../../../../lib/config/types"
import type { ClientMediaProvider } from "../../../../lib/media/types"
import type { RegistryRoute } from "../../../../lib/registry/types"
import type { CmsCollectionWithCount } from "../../../../workflows/cms/steps/list-cms-collections"
import { sdk } from "../../../lib/client"
import { queryKeysFactory } from "../../../lib/query-key-factory"

/**
 * The answer of `GET /admin/cms/collections`. Its texts are `ClientText` as the server sends them, and
 * strings once `useCmsCollections` or `useCmsCollection` translated them.
 */
export type AdminCollectionsResponse<TText = ClientText> = {
  collections: CmsCollectionWithCount<TText>[]
  /** The Admin's pages, in the tree's order: each route before its children. */
  routes: RegistryRoute<TText>[]
  /** What the media picker needs of the media provider; `null` without one. */
  media_provider: ClientMediaProvider
}

export const collectionsQueryKeys = queryKeysFactory("cms_collections")

/** The query of `GET /admin/cms/collections`, which every hook below reads from one cache entry. */
const collectionListQuery = queryOptions({
  queryKey: collectionsQueryKeys.list(),
  queryFn: () =>
    sdk.client.fetch<AdminCollectionsResponse>("/admin/cms/collections"),
})

/**
 * Reads the registered collections with their document counts, as the server sends them: the config's
 * texts untranslated. A screen shows them through `useCmsCollections` or `useCmsCollection`, which
 * translate them.
 *
 * @param options - `select` shapes what the query returns from the cached response.
 * @returns The query of `GET /admin/cms/collections`.
 */
export const useCollections = <TData = AdminCollectionsResponse>(
  options: { select?: (response: AdminCollectionsResponse) => TData } = {}
) => useQuery({ ...collectionListQuery, select: options.select })

/**
 * Reads what the media picker needs of the media provider from the collection list, which shares its
 * cache with `useCollections`.
 *
 * @returns The query, whose data is the provider's search and upload limit, or `null` without one.
 */
export const useMediaProvider = () =>
  useQuery({
    ...collectionListQuery,
    select: ({ media_provider }) => media_provider,
  })
