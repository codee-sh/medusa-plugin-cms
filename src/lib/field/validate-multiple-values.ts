import { buildConfigError } from "../config/build-config-error"
import type { ModelColumn } from "../model/types"
import type { MultipleValuesFieldConfig } from "./types"

/** What a field holding one value or several holds, as its messages name it. */
type HeldValues = {
  one: string
  several: string
  /** The columns one value sits on. */
  oneOn: string
}

/**
 * Checks a field that holds one value or several: one on its single-value column, several only on an
 * array column with `multiple`, and `max` a positive whole number, only with `multiple`.
 *
 * @param column - The field's column.
 * @param override - The field's config.
 * @param name - The field's name.
 * @param path - Where the config sits, for error messages.
 * @param held - What the field holds, for its messages.
 * @throws At the first setting that does not fit.
 */
export const validateMultipleValues = (
  column: ModelColumn,
  override: MultipleValuesFieldConfig,
  name: string,
  path: string,
  held: HeldValues
): void => {
  const field = `${override.type} "${name}"`

  if (Boolean(override.multiple) !== (column.dataType === "array")) {
    throw buildConfigError(
      `${path}: ${field} holds several ${held.several} only on an array column, with multiple: true, and one ${held.one} on ${held.oneOn}`
    )
  }

  if (
    override.max !== undefined &&
    (!override.multiple || !Number.isInteger(override.max) || override.max < 1)
  ) {
    throw buildConfigError(
      `${path}: ${field} takes max as a positive whole number, only with multiple: true`
    )
  }
}
