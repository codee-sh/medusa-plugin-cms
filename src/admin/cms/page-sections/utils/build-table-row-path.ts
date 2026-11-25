import { buildCmsPath } from "../../common/utils/build-cms-path"

/**
 * Builds the path of the drawer that edits a row of a drawer-edited list's table, over the route's page
 * the table stands on.
 *
 * @param page - The slug of the route whose page shows the table.
 * @param table - The table's key on the page, its list's entry key.
 * @param id - The row's document id.
 * @returns The Admin path of the drawer.
 */
export const buildTableRowPath = (
  page: string | undefined,
  table: string,
  id: string
) => buildCmsPath(page, "tables", table, id, "edit")
