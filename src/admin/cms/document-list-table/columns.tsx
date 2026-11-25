import { useDate } from "@medusajs/dashboard/hooks"
import { createDataTableColumnHelper, StatusBadge } from "@medusajs/ui"
import { useMemo } from "react"
import type { ClientCollection } from "../../../lib/collection/types"
import type { CmsTableColumn, CmsTableConfig } from "../../../lib/config/types"
import type { CmsDocument } from "../../../workflows/cms/steps/list-cms-documents"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import { DocumentFieldValue } from "../common/document-fields"
import { EMPTY_FIELD_VALUE } from "../common/utils/format-field-value"
import type { DocumentRowAction } from "./types"
import { listPageValues } from "./utils/list-page-values"

const columnHelper = createDataTableColumnHelper<CmsDocument>()

/**
 * Columns of a collection's documents table: exactly its table's columns, in order, then a row's
 * actions when the page gives some. A field's value is drawn by its type, as a singleton's cards draw
 * it, each cell asking a read with the values its column holds on the page. The columns show the row,
 * which is what is published.
 *
 * @param collection - The collection the table lists.
 * @param table - The table: a `table` entry's, or the collection's own.
 * @param documents - The page's documents, whose values a column's cells read by.
 * @param rowActions - The actions of a row's menu; no menu when left out.
 * @returns The column definitions, rebuilt when the collection, the page or the language changes.
 */
export const useDocumentColumns = (
  collection: ClientCollection,
  table: CmsTableConfig<string> | undefined,
  documents: CmsDocument[],
  rowActions?: (document: CmsDocument) => DocumentRowAction[]
) => {
  const { t } = useCmsTranslation()
  const { getFullDate } = useDate()

  return useMemo(() => {
    /**
     * Builds the column of a field's value. `validateTableColumns` has checked that it names a field.
     *
     * @param column - The field column.
     * @returns The column.
     */
    const buildFieldColumn = (
      column: Extract<CmsTableColumn<string>, { field: string }>
    ) => {
      const field = collection.fields.find(
        (candidate) => candidate.name === column.field
      )!
      const header = column.label ?? field.label
      const isDate = field.kind === "date"
      const pageValues = listPageValues(documents, field.name)

      return columnHelper.accessor((document) => document[field.name], {
        id: field.name,
        header,
        cell: ({ getValue }) => (
          <DocumentFieldValue
            field={field}
            value={getValue()}
            pageValues={pageValues}
          />
        ),
        enableSorting: column.sortable !== false,
        sortLabel: header,
        sortAscLabel: isDate
          ? t("documents.sorting.oldestFirst")
          : t("filters.sorting.alphabeticallyAsc"),
        sortDescLabel: isDate
          ? t("documents.sorting.newestFirst")
          : t("filters.sorting.alphabeticallyDesc"),
      })
    }

    /**
     * Builds a column of a date the plugin writes, sorted oldest or newest first.
     *
     * @param name - The column.
     * @param header - Its header.
     * @returns The column.
     */
    const buildDateColumn = (
      name: "created_at" | "updated_at",
      header: string
    ) =>
      columnHelper.accessor(name, {
        header,
        cell: ({ getValue }) => {
          const date = getValue()

          return date
            ? getFullDate({ date: date as string })
            : EMPTY_FIELD_VALUE
        },
        enableSorting: true,
        sortLabel: header,
        sortAscLabel: t("documents.sorting.oldestFirst"),
        sortDescLabel: t("documents.sorting.newestFirst"),
      })

    /**
     * Builds a column of the plugin's own, under the config's label or the plugin's.
     *
     * @param column - The system column.
     * @returns The column.
     */
    const buildSystemColumn = (
      column: Extract<CmsTableColumn<string>, { system: string }>
    ) => {
      switch (column.system) {
        case "id":
          return columnHelper.accessor("id", {
            header: column.label ?? t("fields.id"),
          })
        case "status":
          return columnHelper.accessor("status", {
            header: column.label ?? t("fields.status"),
            cell: ({ getValue, row }) =>
              getValue() === "published" ? (
                row.original.has_unpublished_changes ? (
                  <StatusBadge color="orange">
                    {t("documents.status.publishedWithChanges")}
                  </StatusBadge>
                ) : (
                  <StatusBadge color="green">
                    {t("documents.status.published")}
                  </StatusBadge>
                )
              ) : (
                <StatusBadge color="grey">
                  {t("documents.status.draft")}
                </StatusBadge>
              ),
            enableSorting: true,
            sortLabel: column.label ?? t("fields.status"),
            sortAscLabel: t("filters.sorting.alphabeticallyAsc"),
            sortDescLabel: t("filters.sorting.alphabeticallyDesc"),
          })
        case "published_version":
          return columnHelper.accessor("published_version", {
            header: column.label ?? t("documents.columns.publishedVersion"),
            cell: ({ getValue }) => {
              const version = getValue()

              return typeof version === "number"
                ? `v${version}`
                : EMPTY_FIELD_VALUE
            },
          })
        case "created_at":
          return buildDateColumn(
            "created_at",
            column.label ?? t("fields.createdAt")
          )
        case "updated_at":
          return buildDateColumn(
            "updated_at",
            column.label ?? t("fields.updatedAt")
          )
      }
    }

    return [
      ...(table?.columns ?? []).map((column) =>
        "field" in column ? buildFieldColumn(column) : buildSystemColumn(column)
      ),
      ...(rowActions
        ? [
            columnHelper.action({
              actions: ({ row }) => rowActions(row.original),
            }),
          ]
        : []),
    ]
  }, [collection, table, documents, rowActions, getFullDate, t])
}
