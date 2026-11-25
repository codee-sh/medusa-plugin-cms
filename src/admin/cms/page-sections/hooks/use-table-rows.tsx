import { PencilSquare, Trash } from "@medusajs/icons"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import type { ClientCollection } from "../../../../lib/collection/types"
import type { CmsDocument } from "../../../../workflows/cms/steps/list-cms-documents"
import { useCmsTranslation } from "../../../hooks/use-cms-translation"
import { buildCmsPath } from "../../common/utils/build-cms-path"
import type { DocumentRowAction } from "../../document-list-table/types"
import { buildTableRowPath } from "../utils/build-table-row-path"
import { useDeleteTableDocument } from "./use-delete-table-document"

/**
 * Decides how the rows of a collection's table are edited, as its `admin.edit` says, wherever the table
 * stands: `"page"` opens a row's document page under the collection's route; `"drawer"` opens a drawer over
 * the page the table stands on, named by the table's key, from the row or its **Edit**, beside
 * **Delete** behind a confirmation.
 *
 * @param collection - The collection the table lists.
 * @param page - The slug of the route whose page shows the table.
 * @param table - The table's key on the page.
 * @returns The path a row opens, and a row's menu for a drawer-edited collection.
 */
export const useTableRows = (
  collection: ClientCollection,
  page: string | undefined,
  table: string
) => {
  const { t } = useCmsTranslation()
  const navigate = useNavigate()
  const deleteDocument = useDeleteTableDocument(collection.slug)
  const isDrawer = collection.admin.edit === "drawer"

  const rowPath = useCallback(
    (id: string) =>
      isDrawer
        ? buildTableRowPath(page, table, id)
        : buildCmsPath(collection.admin.route, collection.slug, id),
    [collection.admin.route, collection.slug, isDrawer, page, table]
  )

  const rowActions = useCallback(
    (document: CmsDocument): DocumentRowAction[] => [
      {
        icon: <PencilSquare />,
        label: t("actions.edit"),
        onClick: () => navigate(rowPath(document.id)),
      },
      {
        icon: <Trash />,
        label: t("actions.delete"),
        onClick: () => deleteDocument(document.id),
      },
    ],
    [deleteDocument, navigate, rowPath, t]
  )

  return { rowPath, rowActions: isDrawer ? rowActions : undefined }
}
