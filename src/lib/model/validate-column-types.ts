import { buildConfigError } from "../config/build-config-error"
import type { ModelDescription } from "./types"

/**
 * Checks that a model has each of the columns the plugin writes, with its DML type.
 *
 * @param model - The model of a collection, a block or the area model.
 * @param types - The columns, with the DML type each must have.
 * @param path - Where the config sits, for error messages.
 * @throws At the first column missing or of another type.
 */
export const validateColumnTypes = (
  model: ModelDescription,
  types: Record<string, string>,
  path: string
): void => {
  for (const [name, dataType] of Object.entries(types)) {
    const column = model.columns.find((candidate) => candidate.name === name)

    if (column?.dataType !== dataType) {
      throw buildConfigError(`${path}: needs a "${name}" ${dataType} column`)
    }
  }
}
