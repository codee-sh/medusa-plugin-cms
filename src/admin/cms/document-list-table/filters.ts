import { createDataTableFilterHelper, type DataTableFilter } from "@medusajs/ui"
import { useMemo } from "react"
import type { Field } from "../../../lib/field/types"
import { useCmsTranslation } from "../../hooks/use-cms-translation"
import type { CmsDocument } from "../../../workflows/cms/steps/list-cms-documents"
import { buildFieldFilters } from "./utils/build-field-filters"

const filterHelper = createDataTableFilterHelper<CmsDocument>()

/** What a table's filters are built from. */
export type DocumentFiltersInput = {
  /** Whether an editor filters the table by status. */
  status: boolean
  /** The collection's fields. */
  fields: Field[]
  /** The fields the table's `filters` names. */
  names: string[]
}

/**
 * Filters of the documents table: the status, where the page lets an editor filter by it, then a
 * filter per field the table's `filters` names.
 *
 * @param input - The status switch, the fields and the table's filters.
 * @returns The filters, rebuilt when the language or the input changes.
 */
export const useDocumentFilters = ({
  status,
  fields,
  names,
}: DocumentFiltersInput): DataTableFilter[] => {
  const { t } = useCmsTranslation()

  return useMemo(
    () => [
      ...(status
        ? [
            filterHelper.accessor("status", {
              type: "radio",
              label: t("fields.status"),
              options: [
                { label: t("documents.status.draft"), value: "draft" },
                { label: t("documents.status.published"), value: "published" },
              ],
            }),
          ]
        : []),
      ...buildFieldFilters(fields, names, {
        yes: t("documents.values.yes"),
        no: t("documents.values.no"),
      }),
    ],
    [t, status, fields, names]
  )
}
