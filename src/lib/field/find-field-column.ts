import { buildConfigError } from "../config/build-config-error"
import type { ModelColumn, ModelDescription } from "../model/types"

/**
 * Finds the column a config field names: one of the model's, or a `belongsTo`'s foreign key.
 *
 * @param model - The model.
 * @param name - The field's name.
 * @param path - Where the config sits, for error messages.
 * @returns The column.
 * @throws When the model has no column of that name.
 */
export const findFieldColumn = (
  model: ModelDescription,
  name: string,
  path: string
): ModelColumn => {
  const column = [...model.columns, ...model.foreignKeyColumns].find(
    (candidate) => candidate.name === name
  )

  if (!column) {
    throw buildConfigError(
      `${path}: "${name}" is not a column of ${model.tableName}`
    )
  }

  return column
}
