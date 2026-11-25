import { buildConfigError } from "../config/build-config-error"
import type { ModelDescription } from "../model/types"
import { isRequiredByModel } from "./is-required-by-model"
import type { RegistryField } from "./types"

/**
 * Checks that the config lists every column the model requires, apart from the ones the plugin and
 * Medusa fill, as no write could fill another.
 *
 * @param model - The model.
 * @param fields - The fields the config lists.
 * @param managedColumns - The columns the plugin and Medusa write themselves.
 * @param path - Where the config sits, for error messages.
 * @throws At the first required column the config does not list.
 */
export const validateRequiredColumns = (
  model: ModelDescription,
  fields: RegistryField[],
  managedColumns: string[],
  path: string
): void => {
  for (const column of model.columns) {
    if (
      isRequiredByModel(column) &&
      !managedColumns.includes(column.name) &&
      !fields.some(({ name }) => name === column.name)
    ) {
      throw buildConfigError(
        `${path}: "${column.name}" is required by its column, so the config must list it in fields`
      )
    }
  }
}
