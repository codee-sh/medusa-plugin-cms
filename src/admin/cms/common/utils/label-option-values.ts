import type { FieldOption } from "../../../../lib/config/types"
import { EMPTY_FIELD_VALUE } from "./format-field-value"

/**
 * Writes a select's or a combobox's stored value by its options' labels, as the field's input shows it:
 * several values joined with commas, a value no option has as it is stored, and an empty value as a
 * dash.
 *
 * @param value - The stored value: a text, or a list for a field of several values.
 * @param options - The field's options.
 * @returns The labels as text.
 */
export const labelOptionValues = (
  value: unknown,
  options: FieldOption<string>[]
): string => {
  const values = (Array.isArray(value) ? value : [value]).filter(
    (held): held is string => typeof held === "string" && held !== ""
  )

  if (!values.length) {
    return EMPTY_FIELD_VALUE
  }

  return values
    .map(
      (held) => options.find((option) => option.value === held)?.label ?? held
    )
    .join(", ")
}
