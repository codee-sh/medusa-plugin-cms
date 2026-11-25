import { DataTable } from "@medusajs/dashboard/components"
import { Container } from "@medusajs/ui"
import type { ClientCollection } from "../../../lib/collection/types"
import type { CmsTableConfig } from "../../../lib/config/types"
import type { CmsDocument } from "../../../workflows/cms/steps/list-cms-documents"
import { useDocuments } from "../../hooks/api/documents/documents"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import type { HeaderAction } from "../common/utils/build-header-actions"
import { useDocumentColumns } from "./columns"
import { useDocumentFilters } from "./filters"
import type { DocumentRowAction } from "./types"
import { useDocumentTableQuery } from "./use-document-table-query"

/** The page before the first read, kept as one list so the columns are not rebuilt for it. */
const NO_DOCUMENTS: CmsDocument[] = []

/** A table that names no filters, kept as one list so the filters are not rebuilt for it. */
const NO_FILTERS: string[] = []

type DocumentListTableProps = {
  /** The collection the table lists. */
  collection: ClientCollection
  /**
   * The table's prefix in the URL, under which it keeps its search, order and page apart from any other
   * table on the page; none for a page's only table.
   */
  prefix?: string
  /** How many documents a page of the table shows, unless the collection's `admin.table` says. */
  pageSize: number
  /** The table's heading and description; the collection's plural label and description when left out. */
  heading?: string
  description?: string
  /** The table's columns, order and size, in place of the collection's `admin.table`. */
  table?: CmsTableConfig<string>
  /** The heading's level: `h1` for a page's own table, `h2` for one among cards. */
  headingLevel?: "h1" | "h2"
  /** Whether an editor filters the table by status. */
  statusFilter?: boolean
  /** The buttons of the table's header. */
  actions: HeaderAction[]
  /** The path a row opens: its document's page, or a drawer over the page. */
  rowPath: (id: string) => string
  /** The actions of a row's menu; no menu when left out. Memoised by the page. */
  rowActions?: (document: CmsDocument) => DocumentRowAction[]
}

/**
 * Lists the documents of one collection, with search, sorting and pages kept in the URL, and what the
 * page showing it decides: its prefix, page size and heading, the status filter, the header's buttons,
 * where a row goes and a row's menu, and a `table` entry's heading, description and table. The columns, the first order, the page size and the fields an editor filters by come from
 * that table, or the collection's `admin.table`.
 *
 * @param props - The collection and what the page decides.
 * @throws The request's error, for the dashboard's error boundary.
 */
export const DocumentListTable = ({
  collection,
  prefix,
  pageSize,
  heading,
  description,
  table = collection.admin.table,
  headingLevel,
  statusFilter = false,
  actions,
  rowPath,
  rowActions,
}: DocumentListTableProps) => {
  const { t } = useCmsTranslation()
  const size = table?.pageSize ?? pageSize
  const filters = useDocumentFilters({
    status: statusFilter,
    fields: collection.fields,
    names: table?.filters ?? NO_FILTERS,
  })
  const query = useDocumentTableQuery(prefix, table, pageSize)
  const { data, isLoading, isError, error } = useDocuments(
    collection.slug,
    query
  )
  const columns = useDocumentColumns(
    collection,
    table,
    data?.documents ?? NO_DOCUMENTS,
    rowActions
  )

  if (isError) {
    throw error
  }

  return (
    <Container className="p-0">
      <DataTable
        data={data?.documents ?? []}
        columns={columns}
        filters={filters.length ? filters : undefined}
        getRowId={(document) => document.id}
        rowHref={(row) => rowPath((row as unknown as { id: string }).id)}
        rowCount={data?.count ?? 0}
        pageSize={size}
        prefix={prefix}
        enableSearch={collection.fields.some(({ searchable }) => searchable)}
        isLoading={isLoading}
        heading={heading ?? collection.labels.plural}
        headingLevel={headingLevel}
        subHeading={description ?? collection.admin.description}
        actions={actions}
        emptyState={{
          empty: { heading: t("documents.empty.heading") },
          filtered: {
            heading: t("general.noResultsTitle"),
            description: t("general.noResultsMessage"),
          },
        }}
      />
    </Container>
  )
}
