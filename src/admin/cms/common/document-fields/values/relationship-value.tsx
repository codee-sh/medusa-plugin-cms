import { isOptionsHookSource } from "../../../../../lib/field/is-options-hook-source"
import { EMPTY_FIELD_VALUE } from "../../utils/format-field-value"
import { ComboboxValue } from "./combobox-value"
import { RelationTitles } from "./relation-titles"
import type { DocumentValueProps } from "./types"

/**
 * The read-only view of a `relationship` field: by the labels of its host's options hook, as a
 * combobox shows them, or by its targets' titles, read from the target collection.
 *
 * @param props - The field, its value and the page's values a read is asked with.
 */
export const RelationshipValue = ({
  field,
  value,
  pageValues,
}: DocumentValueProps) => {
  if (isOptionsHookSource(field.options) || !field.relationTo) {
    return <ComboboxValue field={field} value={value} pageValues={pageValues} />
  }

  const ids = (Array.isArray(value) ? value : [value]).filter(
    (held): held is string => typeof held === "string" && held !== ""
  )

  if (!ids.length) {
    return <>{EMPTY_FIELD_VALUE}</>
  }

  return (
    <RelationTitles
      relationTo={field.relationTo}
      ids={ids}
      readIds={pageValues ?? ids}
    />
  )
}
