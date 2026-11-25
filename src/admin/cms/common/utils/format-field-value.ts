import type { FieldKind } from "../../../../lib/field/types"
import { formatPlainText } from "../../../../shared/rich-text/format-plain-text"
import type { RichTextDocument } from "../../../../shared/rich-text/types"

/** What an empty value shows. */
export const EMPTY_FIELD_VALUE = "—"

/** How the values the Admin words in the editor's language are written. */
export type FieldValueFormatters = {
  date: (value: string) => string
  boolean: (value: boolean) => string
}

/**
 * Writes a stored value as text by its field's kind: a date and a boolean through the formatters, rich
 * text as its first line of text, a list joined with commas, any other value through `String`, and an
 * empty value, an empty list or rich text without text included, as a dash.
 *
 * @param value - The stored value.
 * @param kind - The field's kind, `date` for a column that holds a date, `undefined` for another column.
 * @param formatters - How a date and a boolean are written.
 * @returns The value as text.
 */
export const formatFieldValue = (
  value: unknown,
  kind: FieldKind | undefined,
  formatters: FieldValueFormatters
): string => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return EMPTY_FIELD_VALUE
  }

  if (kind === "date") {
    return formatters.date(value as string)
  }

  if (kind === "richtext") {
    const line = formatPlainText(value as RichTextDocument)
      .split("\n")
      .find((text) => text.trim())

    return line ?? EMPTY_FIELD_VALUE
  }

  if (typeof value === "boolean") {
    return formatters.boolean(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ")
  }

  return String(value)
}
