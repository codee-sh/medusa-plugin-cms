import { useQuery } from "@tanstack/react-query"
import { sdk } from "../../../lib/client"
import { queryKeysFactory } from "../../../lib/query-key-factory"

export type AdminTakenValueQuery = {
  collection: string
  column: string
  value: string
  /** The document being edited, whose own value is not taken. */
  id?: string
}

export type AdminTakenValueResponse = {
  taken: boolean
  /** The first free `-<n>` form of a taken value. */
  suggestion?: string
}

export const takenValuesQueryKeys = queryKeysFactory<
  "cms_taken_values",
  AdminTakenValueQuery
>("cms_taken_values")

/**
 * Tells whether a live document of the collection already holds a value of a unique column.
 *
 * @param query - The collection, the column, the value and the edited document's id; nothing is read
 * while the value is empty.
 * @returns The query of `GET /admin/cms/collections/:collection/taken-values`.
 */
export const useTakenValue = ({
  collection,
  column,
  value,
  id,
}: AdminTakenValueQuery) =>
  useQuery({
    queryKey: takenValuesQueryKeys.list({ collection, column, value, id }),
    queryFn: () =>
      sdk.client.fetch<AdminTakenValueResponse>(
        `/admin/cms/collections/${collection}/taken-values`,
        { query: { column, value, id } }
      ),
    enabled: Boolean(value),
  })
