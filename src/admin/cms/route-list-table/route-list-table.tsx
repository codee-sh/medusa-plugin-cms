import { DataTable } from "@medusajs/dashboard/components"
import { Container } from "@medusajs/ui"
import { useCmsCollections } from "../../hooks/use-cms-collections"
import { buildCmsPath } from "../common/utils/build-cms-path"
import { useRouteColumns } from "./columns"
import type { RouteRow } from "./types"

type RouteListTableProps = {
  /** The slug of the route whose children the table lists; the top-level routes when left out. */
  parent?: string
  /** The table's heading. */
  heading: string
  /** The heading's level: `h1` for **Content**, `h2` for a route's children among its collections. */
  headingLevel?: "h1" | "h2"
}

/**
 * Lists routes in the tree's order, each by its label, with its description and, for a route of one
 * list, its number of documents: the top-level routes on **Content**, or a route's children on its page.
 *
 * @param props - The parent route, the heading and its level.
 * @throws The request's error, for the dashboard's error boundary.
 */
export const RouteListTable = ({
  parent,
  heading,
  headingLevel,
}: RouteListTableProps) => {
  const columns = useRouteColumns()
  const { data, isLoading, isError, error } = useCmsCollections()

  if (isError) {
    throw error
  }

  const rows: RouteRow[] = (data?.routes ?? []).flatMap((route) => {
    if (route.parent !== parent) {
      return []
    }

    const [only, ...others] = route.collections.flatMap(({ collection }) =>
      (data?.collections ?? []).filter(({ slug }) => slug === collection)
    )
    const list = only && !others.length && !only.singleton ? only : undefined

    return [
      {
        slug: route.slug,
        name: route.label,
        description:
          route.description ??
          (others.length ? undefined : only?.admin.description),
        count: list?.count,
      },
    ]
  })

  return (
    <Container className="p-0">
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.slug}
        // The table passes its own row, typed as the data, whose `id` is what getRowId returned.
        rowHref={(row) => buildCmsPath((row as unknown as { id: string }).id)}
        rowCount={rows.length}
        enablePagination={false}
        enableSearch={false}
        isLoading={isLoading}
        heading={heading}
        headingLevel={headingLevel}
      />
    </Container>
  )
}
