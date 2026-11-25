import { useFieldValueFormatters } from "../../hooks/use-field-value-formatters"
import { formatFieldValue } from "../../utils/format-field-value"
import type { DocumentValueProps } from "./types"

/**
 * The read-only view of a field shown as text: a date, a boolean, rich text's first line, a list and
 * any other value, through `formatFieldValue`.
 *
 * @param props - The field and its value.
 */
export const TextValue = ({ field, value }: DocumentValueProps) => {
  const formatters = useFieldValueFormatters()

  return <>{formatFieldValue(value, field.kind, formatters)}</>
}
