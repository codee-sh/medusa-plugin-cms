import { useQueryParams } from "@medusajs/dashboard/hooks"
import type { CmsTableConfig } from "../../../lib/config/types"
import type { AdminDocumentsQuery } from "../../hooks/api/documents/documents"
import { buildDocumentTableQuery } from "./utils/build-document-table-query"

/** The parameters a documents table keeps in the URL beside its field filters. */
const TABLE_PARAMS = ["q", "order", "status", "offset"]

/**
 * Reads a documents table's state from the URL, where the dashboard's `DataTable` keeps it, under the
 * table's prefix, so several tables on one page keep their search, order, filters and page apart.
 *
 * @param prefix - The table's prefix; none for a page's only table.
 * @param table - The table: its page size, first order and the fields an editor filters it by.
 * @param pageSize - How many documents a page of the table shows when the table does not say.
 * @returns The query of the page the table shows.
 */
export const useDocumentTableQuery = (
  prefix: string | undefined,
  table: CmsTableConfig<string> | undefined,
  pageSize: number
): AdminDocumentsQuery => {
  const filterNames = table?.filters ?? []
  const params = useQueryParams([...TABLE_PARAMS, ...filterNames], prefix)

  return buildDocumentTableQuery(
    {
      q: params.q,
      order: params.order,
      status: params.status,
      offset: params.offset,
      filters: Object.fromEntries(
        filterNames.map((name) => [name, params[name]])
      ),
    },
    table?.pageSize ?? pageSize,
    table?.defaultSort
  )
}
