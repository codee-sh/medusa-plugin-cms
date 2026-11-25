import { RouteFocusModal } from "@medusajs/dashboard/components"
import { useParams } from "react-router-dom"
import { DocumentCreateRouteForm } from "../../../../../../cms/document-create-form"
import { buildCmsPath } from "../../../../../../cms/common/utils/build-cms-path"
import { findPageTable } from "../../../../../../cms/common/utils/find-page-table"
import { useCmsCollection } from "../../../../../../hooks/use-cms-collection"
import { useCmsRoute } from "../../../../../../hooks/use-cms-route"

/**
 * The modal over a route's page that creates a document from **Add** of one of the page's tables, named
 * by its key, then comes back to the page for a collection edited in drawers, or opens the new
 * document's page.
 *
 * @throws The collection list's error, and an error for a key under which the page shows no table, for
 * the dashboard's error boundary.
 */
const TableDocumentCreatePage = () => {
  const { slug, table: key } = useParams()
  const route = useCmsRoute(slug!)
  const tableSlug =
    route.data && findPageTable(route.data.route, route.data.collections, key!)
  const table = useCmsCollection(tableSlug ?? "")

  if (route.isError) {
    throw route.error
  }

  if (route.isSuccess && !tableSlug) {
    throw new Error(`"${slug}" shows no table under "${key}"`)
  }

  return (
    <RouteFocusModal prev={buildCmsPath(slug)}>
      {table.data && (
        <DocumentCreateRouteForm
          collection={table.data}
          successPath={
            table.data.admin.edit === "drawer" ? buildCmsPath(slug) : undefined
          }
        />
      )}
    </RouteFocusModal>
  )
}

export default TableDocumentCreatePage
