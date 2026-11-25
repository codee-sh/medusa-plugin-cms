import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { translateCollectionList } from "../utils/translate-collection-list"
import type { AdminCollectionsResponse } from "./api/collections/collections"

/**
 * Gives a `select` that translates the collection list's texts in the Admin's language; a new one when
 * the language changes, so a query selects again. The cache keeps the server's answer.
 *
 * @returns The `select`.
 */
export const useTranslateCollectionList = () => {
  const { t } = useTranslation()

  return useCallback(
    (response: AdminCollectionsResponse) =>
      translateCollectionList(response, (key, options) => t(key, options)),
    [t]
  )
}
