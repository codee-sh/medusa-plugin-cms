import type { DataTableFilter } from "@medusajs/ui"
import type { Field } from "../../../../lib/field/types"

/** The labels of a boolean filter's two options. */
export type BooleanFilterLabels = { yes: string; no: string }

/**
 * Builds the filter an editor picks one field's values with: a select's options to tick, or a
 * boolean's yes or no.
 *
 * @param field - The field.
 * @param labels - The labels of a boolean's options.
 * @returns The filter.
 */
const buildFieldFilter = (
  field: Field,
  labels: BooleanFilterLabels
): DataTableFilter =>
  field.kind === "boolean"
    ? {
        id: field.name,
        type: "radio",
        label: field.label,
        options: [
          { label: labels.yes, value: "true" },
          { label: labels.no, value: "false" },
        ],
      }
    : {
        id: field.name,
        type: "multiselect",
        label: field.label,
        options: Array.isArray(field.options) ? field.options : [],
      }

/**
 * Builds the filters an editor picks a table's documents with, one per field its `filters` names, in
 * that order. They are kept in the URL under the fields' names, which the start keeps apart from the
 * table's own parameters.
 *
 * @param fields - The collection's fields.
 * @param names - The table's `filters`.
 * @param labels - The labels of a boolean's options.
 * @returns The filters.
 */
export const buildFieldFilters = (
  fields: Field[],
  names: string[],
  labels: BooleanFilterLabels
): DataTableFilter[] =>
  names.flatMap((name) => {
    const field = fields.find((candidate) => candidate.name === name)

    return field ? [buildFieldFilter(field, labels)] : []
  })
