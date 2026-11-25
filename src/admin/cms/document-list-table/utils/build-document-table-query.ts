import type { CmsTableConfig } from "../../../../lib/config/types"
import type { AdminDocumentsQuery } from "../../../hooks/api/documents/documents"

/** A documents table's state as the dashboard's `DataTable` keeps it in the URL. */
export type DocumentTableParams = {
  q?: string
  order?: string
  /** The status filter's value, which the table writes as JSON. */
  status?: string
  offset?: string
  /**
   * The field filters' values, by field: a select's as a JSON list, a boolean's as the text the
   * table was given, `true` or `false`.
   */
  filters?: Record<string, string | undefined>
}

/**
 * Reads the values an editor picked in one field's filter, as `DataTable` keeps them: a select's as a
 * JSON list of texts, a boolean's as the text `true` or `false`.
 *
 * @param raw - The value in the URL.
 * @returns The values for the list's `filters`, or `undefined` when none can be read.
 */
const readPickedValues = (raw: string): string[] | boolean | undefined => {
  if (raw === "true" || raw === "false") {
    return raw === "true"
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    return Array.isArray(parsed) &&
      parsed.length &&
      parsed.every((value) => typeof value === "string")
      ? parsed
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Builds the list's `filters` from the values an editor picked, leaving out a filter with no value it
 * can read.
 *
 * @param picked - The editor's filters, as the URL holds them.
 * @returns The filters, or `undefined` when there are none.
 */
const buildTableFilters = (
  picked: Record<string, string | undefined> = {}
): AdminDocumentsQuery["filters"] => {
  const entries = Object.entries(picked).flatMap(([name, raw]) => {
    const values = raw === undefined ? undefined : readPickedValues(raw)

    return values === undefined ? [] : [[name, values] as const]
  })

  return entries.length ? Object.fromEntries(entries) : undefined
}

/**
 * Builds the documents query of the page a table shows from its state in the URL, its first order
 * the table's `defaultSort` until the editor sorts it, and its filters the editor's picks.
 *
 * @param params - The table's parameters, read under its prefix.
 * @param pageSize - How many documents a page of the table shows.
 * @param defaultSort - The table's first order; the list's own when left out.
 * @returns The query.
 */
export const buildDocumentTableQuery = (
  { q, order, status, offset, filters }: DocumentTableParams,
  pageSize: number,
  defaultSort?: CmsTableConfig["defaultSort"]
): AdminDocumentsQuery => {
  const tableFilters = buildTableFilters(filters)

  return {
    q,
    order:
      order ??
      (defaultSort &&
        `${defaultSort.direction === "desc" ? "-" : ""}${defaultSort.column}`),
    status: status ? JSON.parse(status) : undefined,
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    ...(tableFilters && { filters: tableFilters }),
  }
}
