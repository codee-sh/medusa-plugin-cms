import { useDebouncedSearch } from "@medusajs/dashboard/hooks"
import {
  createDataTableColumnHelper,
  DataTable,
  type DataTablePaginationState,
  type DataTableRowSelectionState,
  Text,
  useDataTable,
} from "@medusajs/ui"
import { useMemo, useState } from "react"
import { useManagerFormFieldsTranslation } from "../../manager-form-fields/hooks/use-manager-form-fields-translation"
import { useMediaSource } from "../media-fields-provider"
import { MediaThumbnail } from "../media-thumbnail"
import type { MediaRecord } from "../types"
import { mediaName } from "../utils/media-name"
import { mimeTypeLabel } from "../utils/mime-type-label"

const columnHelper = createDataTableColumnHelper<MediaRecord>()

type MediaSelectTableProps = {
  /** The MIME types the library lists, the field's `accept`. */
  accept: string[]
  /** Called with the row the editor ticks, or `null` when the tick is cleared. */
  onSelectionChange: (media: MediaRecord | null) => void
}

/**
 * The media source's records as a table to choose one from: a select column, a preview, the name and
 * the type, with search and pages in local state, so it never writes to the page URL. Lists only the
 * field's MIME types, a page of the source's size at a time. Knows nothing of the container it sits in.
 *
 * @param props - The MIME types and the selection handler.
 */
export const MediaSelectTable = ({
  accept,
  onSelectionChange,
}: MediaSelectTableProps) => {
  const { t } = useManagerFormFieldsTranslation()
  const source = useMediaSource()
  const { searchValue, onSearchValueChange, query } = useDebouncedSearch()
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: source.pageSize,
  })
  const [selection, setSelection] = useState<DataTableRowSelectionState>({})

  const { data, isPending, error } = source.useList({
    q: query || undefined,
    mime_type: accept,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
  })

  const columns = useMemo(
    () => [
      columnHelper.select(),
      columnHelper.display({
        id: "preview",
        header: t("media.columns.preview"),
        cell: ({ row }) => <MediaThumbnail media={row.original} />,
      }),
      columnHelper.display({
        id: "name",
        header: t("media.columns.name"),
        cell: ({ row }) => (
          <Text size="small" leading="compact" className="truncate">
            {mediaName(row.original)}
          </Text>
        ),
      }),
      columnHelper.display({
        id: "type",
        header: t("media.columns.type"),
        cell: ({ row }) =>
          row.original.mime_type ? mimeTypeLabel(row.original.mime_type) : "-",
      }),
    ],
    [t]
  )

  /**
   * Keeps one row selected: the one the editor just ticked. The row itself is handed on, so the caller
   * can confirm it after the table has paged away from it.
   *
   * @param next - The selection the table proposes.
   */
  const handleSelectionChange = (next: DataTableRowSelectionState) => {
    const addedId = Object.keys(next).find((id) => next[id] && !selection[id])

    setSelection(addedId ? { [addedId]: true } : {})
    onSelectionChange(
      addedId
        ? (data?.media.find((media) => media.id === addedId) ?? null)
        : null
    )
  }

  /**
   * Starts again from the first page whenever the search changes.
   *
   * @param next - The new search text.
   */
  const handleSearchChange = (next: string) => {
    onSearchValueChange(next)
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }

  const table = useDataTable({
    data: error ? [] : (data?.media ?? []),
    columns,
    getRowId: (media) => media.id,
    rowCount: data?.count ?? 0,
    isLoading: isPending,
    rowSelection: {
      state: selection,
      onRowSelectionChange: handleSelectionChange,
    },
    search: { state: searchValue, onSearchChange: handleSearchChange },
    pagination: { state: pagination, onPaginationChange: setPagination },
  })

  return (
    <DataTable instance={table} className="flex-1 overflow-hidden">
      <DataTable.Toolbar className="flex items-center justify-end">
        <div className="w-full md:w-auto">
          <DataTable.Search placeholder={t("media.modal.searchPlaceholder")} />
        </div>
      </DataTable.Toolbar>
      <DataTable.Table
        emptyState={{
          empty: error
            ? { heading: t("media.modal.loadFailed") }
            : {
                heading: t("media.modal.emptyTitle"),
                description: t("media.modal.emptyDescription"),
              },
          filtered: {
            heading: t("media.noResults.title"),
            description: t("media.noResults.description"),
          },
        }}
      />
      <DataTable.Pagination />
    </DataTable>
  )
}
