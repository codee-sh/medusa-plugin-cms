import { buildConfigError } from "../config/build-config-error"
import type { ModelColumn } from "../model/types"
import { isRequiredByModel } from "./is-required-by-model"
import type { RegistryField } from "./types"

/**
 * Checks that a field whose column the model requires is required on every save, as no write could
 * leave it empty.
 *
 * @param column - The field's column.
 * @param required - When the field's schemas require it, from `findRequired`.
 * @param name - The field's name.
 * @param path - Where the config sits, for error messages.
 * @throws When the column is required and the field's `serverValidation` takes an empty value.
 */
export const validateRequiredField = (
  column: ModelColumn,
  required: RegistryField["required"],
  name: string,
  path: string
): void => {
  if (isRequiredByModel(column) && required !== "always") {
    throw buildConfigError(
      `${path}: "${name}" is required by its column, so its field's "serverValidation" must refuse an empty value`
    )
  }
}
