import { CMS_DOCUMENTS_PAGE_SIZE } from "../../../api/admin/cms/collections/[collection]/documents/query-config"
import type { ClientCollection } from "../../../lib/collection/types"
import type {
  RegistryRoute,
  RegistryRouteEntry,
} from "../../../lib/registry/types"
import { useCmsCollections } from "../../hooks/use-cms-collections"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import { buildHeaderActions } from "../common/utils/build-header-actions"
import { DocumentListTable } from "../document-list-table"
import { useTableRows } from "../page-sections/hooks/use-table-rows"

/** A list among other collections shares the page with them, so it shows fewer rows. */
const SHARED_LIST_PAGE_SIZE = 10

type ListEntryProps = {
  /** The route whose page shows the list. */
  route: RegistryRoute<string>
  /** The list's entry on the route, with its key and its table. */
  entry: RegistryRouteEntry<string>
  collection: ClientCollection
  /** Whether the route shows this list alone, its table then the page's own. */
  alone: boolean
}

/**
 * Draws a list on a route's page as its documents' table, under its entry's key, its rows edited as its
 * `admin.edit` says and its header holding its actions, **Create** among them. A route of this list
 * alone gives the table the page's heading, the route's label, at `h1`, and the full page size; among
 * other collections the table takes its entry's heading, or its collection's label, at `h2`, and its
 * search, order and page sit in the URL under its key. A collection with drafts is filtered by status.
 *
 * @param props - The route, the list's entry, its collection, and whether the route shows it alone.
 */
export const ListEntry = ({
  route,
  entry,
  collection,
  alone,
}: ListEntryProps) => {
  const { t } = useCmsTranslation()
  const { data } = useCmsCollections()
  const { rowPath, rowActions } = useTableRows(
    collection,
    route.slug,
    entry.key
  )
  const actions = buildHeaderActions(
    collection,
    entry.key,
    { collections: data?.collections ?? [], routes: data?.routes ?? [] },
    t("actions.create")
  )

  return (
    <DocumentListTable
      collection={collection}
      prefix={alone ? undefined : entry.key}
      pageSize={alone ? CMS_DOCUMENTS_PAGE_SIZE : SHARED_LIST_PAGE_SIZE}
      heading={alone ? route.label : entry.label}
      description={alone ? route.description : entry.description}
      table={entry.table}
      headingLevel={alone ? "h1" : "h2"}
      statusFilter={collection.drafts}
      actions={actions}
      rowPath={rowPath}
      rowActions={rowActions}
    />
  )
}
