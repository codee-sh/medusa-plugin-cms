import type { CmsDocument } from "../../../../workflows/cms/steps/list-cms-documents"

/**
 * Lists the values one field holds across a page of documents, each once in the page's order, a list
 * field's values taken apart and empty values left out: what a column's cells ask a read with, so they
 * ask alike and the query client sends one request.
 *
 * @param documents - The page's documents.
 * @param name - The field's name.
 * @returns The values.
 */
export const listPageValues = (
  documents: CmsDocument[],
  name: string
): string[] => {
  const values = documents.flatMap((document) => {
    const value = document[name]

    return Array.isArray(value) ? value : [value]
  })

  return [
    ...new Set(
      values.filter(
        (value): value is string => typeof value === "string" && value !== ""
      )
    ),
  ]
}
