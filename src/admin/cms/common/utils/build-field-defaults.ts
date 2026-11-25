import type { AnyField } from "../../../../lib/field/types"
import type {
  CmsMedia,
  CmsMediaStore,
} from "../../../../lib/media-provider/types"

/**
 * Turns what a read holds for one file - its record, or a stored value - into the value its field
 * stores: the record's id or URL.
 *
 * @param value - The record or the stored value.
 * @param store - What the field stores.
 * @returns The stored value, or an empty text for an empty field.
 */
const toMediaValue = (value: unknown, store: CmsMediaStore): string => {
  if (typeof value === "string") {
    return value
  }

  return value && typeof value === "object"
    ? ((value as CmsMedia)[store] ?? "")
    : ""
}

/**
 * Turns stored values into the values their inputs start from: an empty value becomes the input's own
 * empty value - `null` for a number, a date and a rich text, whose inputs show it empty, as an emptied
 * number input or editor gives it back - and a media field holds its record's id or URL, where the read
 * put the record.
 *
 * @param fields - The fields.
 * @param values - The stored values; none for a new block.
 * @returns The inputs' values, by field name.
 */
export const buildFieldDefaults = (
  fields: AnyField[],
  values: Record<string, unknown> = {}
): Record<string, unknown> =>
  Object.fromEntries(
    fields.map((field) => {
      const value = values[field.name]

      switch (field.kind) {
        case "boolean":
          return [field.name, value ?? false]
        case "text_list":
          return [field.name, value ?? []]
        case "combobox":
          return [field.name, field.multiple ? (value ?? []) : (value ?? "")]
        case "number":
        case "richtext":
          return [field.name, value ?? null]
        case "date":
          return [field.name, value ? new Date(value as string) : null]
        case "media":
          return [
            field.name,
            field.multiple
              ? (Array.isArray(value) ? value : []).map((held) =>
                  toMediaValue(held, field.stores!)
                )
              : toMediaValue(value, field.stores!),
          ]
        default:
          return [field.name, value ?? ""]
      }
    })
  )
