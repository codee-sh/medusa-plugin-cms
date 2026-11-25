import { buildConfigError } from "../config/build-config-error"
import type { FieldConfig } from "../config/types"
import type { ModelColumn } from "../model/types"
import { FIELD_TYPES } from "./field-types"
import { validateFieldOptions } from "./validate-field-options"
import { validateMediaField } from "./validate-media-field"
import { validateMultipleValues } from "./validate-multiple-values"
import { validateOptionsHook } from "./validate-options-hook"

/**
 * Checks that a config field fits its column: not one Medusa or the plugin manages, with a label, of a
 * type that may sit on its data type, without the `required` its schemas replaced; for a select, a
 * combobox or a media field, options and values the column can hold; for a relationship drawn by a
 * hook, the hook's name; and for a `richtext` field, a column that is not searchable.
 *
 * @param column - The field's column.
 * @param name - The field's name.
 * @param override - The field's config.
 * @param managedColumns - The columns the plugin and Medusa manage on this model.
 * @param path - Where the config sits, for error messages.
 * @throws When the field does not fit its column.
 */
export const validateFieldColumn = (
  column: ModelColumn,
  name: string,
  override: FieldConfig,
  managedColumns: string[],
  path: string
): void => {
  if (managedColumns.includes(name)) {
    throw buildConfigError(
      `${path}: "${name}" is managed by the CMS, so it cannot be a field`
    )
  }

  if (!override.label) {
    throw buildConfigError(`${path}: field "${name}" needs a label`)
  }

  const fieldType = FIELD_TYPES[override.type]

  if (!fieldType) {
    throw buildConfigError(
      `${path}: field "${name}" has the type "${override.type}", which is not a field type`
    )
  }

  if (!fieldType.dataTypes.includes(column.dataType)) {
    throw buildConfigError(
      `${path}: field "${name}" of type "${override.type}" cannot sit on a ${column.dataType} column`
    )
  }

  // The types refuse it; a config written in JavaScript can still give it.
  if ("required" in override) {
    throw buildConfigError(
      `${path}: field "${name}" takes no "required": its "serverValidation" or "serverPublishValidation" says whether it must be filled`
    )
  }

  if (override.type === "select" || override.type === "combobox") {
    validateFieldOptions(column, override, name, path)
  }

  if (override.type === "combobox") {
    validateMultipleValues(column, override, name, path, {
      one: "value",
      several: "values",
      oneOn: "a text or an enum column",
    })
  }

  if (override.type === "media") {
    validateMediaField(column, override, name, path)
  }

  if (override.type === "relationship" && override.options !== undefined) {
    validateOptionsHook(
      column,
      override.options,
      { name, type: "relationship" },
      path
    )
  }

  if (override.type === "richtext" && column.searchable) {
    throw buildConfigError(
      `${path}: richtext "${name}" cannot sit on a searchable column, as a search would match the JSON of its document`
    )
  }
}
