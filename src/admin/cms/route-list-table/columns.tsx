import { createDataTableColumnHelper } from "@medusajs/ui"
import { useMemo } from "react"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import type { RouteRow } from "./types"

const columnHelper = createDataTableColumnHelper<RouteRow>()

/**
 * Columns of **Content**'s list of routes.
 *
 * @returns The column definitions, rebuilt when the language changes.
 */
export const useRouteColumns = () => {
  const { t } = useCmsTranslation()

  return useMemo(
    () => [
      columnHelper.accessor("name", {
        header: t("collections.fields.name"),
      }),
      columnHelper.accessor("description", {
        header: t("collections.fields.description"),
        cell: ({ getValue }) => getValue() ?? "-",
      }),
      columnHelper.accessor("count", {
        header: t("collections.fields.documents"),
        cell: ({ getValue }) => getValue() ?? "-",
      }),
    ],
    [t]
  )
}
