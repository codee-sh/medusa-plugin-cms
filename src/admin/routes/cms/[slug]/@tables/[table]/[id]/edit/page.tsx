import { RouteDrawer } from "@medusajs/dashboard/components"
import { Heading } from "@medusajs/ui"
import { useMemo } from "react"
import { useParams } from "react-router-dom"
import { DocumentDrawerRouteForm } from "../../../../../../../cms/document-drawer-form"
import { buildCmsPath } from "../../../../../../../cms/common/utils/build-cms-path"
import { findPageTable } from "../../../../../../../cms/common/utils/find-page-table"
import { listSectionCards } from "../../../../../../../cms/page-sections/utils/list-section-cards"
import { useDocument } from "../../../../../../../hooks/api/documents/documents"
import { useCmsCollection } from "../../../../../../../hooks/use-cms-collection"
import { useCmsRoute } from "../../../../../../../hooks/use-cms-route"
import { useCmsTranslation } from "../../../../../../../hooks/use-cms-translation"

/**
 * The drawer over a route's page that edits a row of one of the page's tables, named by its key, of a
 * drawer-edited collection: the collection's whole form, its sections laid out as a singleton's cards
 * are, saved live, and back to the page.
 *
 * @throws The requests' errors, and an error for a key under which the page shows no table or for a
 * collection that is not edited in a drawer, for the dashboard's error boundary.
 */
const TableDocumentEditPage = () => {
  const { slug, table: key, id } = useParams()
  const { t } = useCmsTranslation()
  const route = useCmsRoute(slug!)
  const tableSlug =
    route.data && findPageTable(route.data.route, route.data.collections, key!)
  const table = useCmsCollection(tableSlug ?? "")
  const document = useDocument(tableSlug ?? "", id!, {
    enabled: Boolean(tableSlug),
  })
  const sections = useMemo(() => {
    if (!table.data) {
      return undefined
    }

    const { main, side } = listSectionCards(table.data)

    return [...main, ...side]
  }, [table.data])

  if (route.isError) {
    throw route.error
  }

  if (document.isError) {
    throw document.error
  }

  if (route.isSuccess && !tableSlug) {
    throw new Error(`"${slug}" shows no table under "${key}"`)
  }

  if (table.data && table.data.admin.edit !== "drawer") {
    throw new Error(`"${tableSlug}" is not edited in a drawer`)
  }

  return (
    <RouteDrawer prev={buildCmsPath(slug)}>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>
            {table.data &&
              t("documents.edit.title", { label: table.data.labels.singular })}
          </Heading>
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      {table.data && sections && document.data && (
        <DocumentDrawerRouteForm
          collection={table.data}
          sections={sections}
          document={document.data.document}
          successPath={buildCmsPath(slug)}
        />
      )}
    </RouteDrawer>
  )
}

export default TableDocumentEditPage
