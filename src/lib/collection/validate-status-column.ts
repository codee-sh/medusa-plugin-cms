import { buildConfigError } from "../config/build-config-error"
import type { ModelDescription } from "../model/types"

const STATUSES = ["draft", "published"]

/**
 * Checks the choices of a document's `status` column: an enum of draft and published.
 *
 * @param model - The collection's model, its column types already checked.
 * @param path - Where the config sits, for error messages.
 * @throws When the enum holds other choices.
 */
export const validateStatusColumn = (
  model: ModelDescription,
  path: string
): void => {
  const choices = model.columns.find(({ name }) => name === "status")?.choices

  if (
    choices &&
    (choices.length !== STATUSES.length ||
      !STATUSES.every((status) => choices.includes(status)))
  ) {
    throw buildConfigError(
      `${path}: "status" must be an enum of draft and published`
    )
  }
}
