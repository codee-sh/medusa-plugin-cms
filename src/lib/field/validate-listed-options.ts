import { buildConfigError } from "../config/build-config-error"
import type { FieldOption } from "../config/types"
import type { ModelColumn } from "../model/types"
import type { OptionsFieldConfig } from "./types"

/**
 * Checks the options a field's config lists: at least one, each value once, and on an enum column only
 * values the enum holds.
 *
 * @param column - The field's column.
 * @param override - The field's config, with its options listed.
 * @param name - The field's name.
 * @param path - Where the config sits, for error messages.
 * @throws At the first option that does not fit.
 */
export const validateListedOptions = (
  column: ModelColumn,
  override: OptionsFieldConfig & { options: FieldOption[] },
  name: string,
  path: string
): void => {
  const field = `${override.type} "${name}"`
  const values = (override.options ?? []).map(({ value }) => value)

  if (!values.length) {
    throw buildConfigError(`${path}: ${field} needs options`)
  }

  if (new Set(values).size !== values.length) {
    throw buildConfigError(`${path}: ${field} repeats an option`)
  }

  const outside = values.find(
    (value) => !(column.choices ?? [value]).includes(value)
  )

  if (outside !== undefined) {
    throw buildConfigError(
      `${path}: ${field} offers "${outside}", which its column does not allow`
    )
  }
}
