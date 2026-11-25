import { useQueries } from "@tanstack/react-query"
import type { AdminDocument } from "../../../../workflows/cms/utils/build-admin-document"
import {
  documentListQuery,
  documentQuery,
} from "../../../hooks/api/documents/documents"

/** A singleton holds one document at most, so one row says whether it exists and which it is. */
const SINGLETON_QUERY = { limit: 1, offset: 0 }

/**
 * Reads the documents of several singletons: each one's id from its documents list, then the document
 * itself, which answers its media as records. The queries share their cache entries with the single
 * reads of `useDocuments` and `useDocument`.
 *
 * @param collections - The singletons' slugs.
 * @returns Each singleton's document by slug, `null` before its first save; `undefined` while any
 * loads; and the first error of the requests.
 */
export const useSingletonDocuments = (
  collections: string[]
): {
  documents: Record<string, AdminDocument | null> | undefined
  isError: boolean
  error: Error | null
} => {
  const lists = useQueries({
    queries: collections.map((collection) =>
      documentListQuery(collection, SINGLETON_QUERY)
    ),
  })
  const ids = lists.map((list) => list.data?.documents[0]?.id)
  const details = useQueries({
    queries: collections.map((collection, index) => ({
      ...documentQuery(collection, ids[index] ?? ""),
      enabled: Boolean(ids[index]),
    })),
  })
  const failed = [...lists, ...details].find((query) => query.isError)
  const isLoaded = lists.every(
    (list, index) =>
      list.data && (!ids[index] || details[index].data !== undefined)
  )

  return {
    documents: isLoaded
      ? Object.fromEntries(
          collections.map((collection, index) => [
            collection,
            ids[index] ? details[index].data!.document : null,
          ])
        )
      : undefined,
    isError: Boolean(failed),
    error: failed?.error ?? null,
  }
}
