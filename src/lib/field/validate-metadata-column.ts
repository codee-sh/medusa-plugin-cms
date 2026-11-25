import { buildConfigError } from "../config/build-config-error"
import type { ModelDescription } from "../model/types"

/**
 * Checks `metadata`, which is never a field: Medusa merges it as an object, so it must be json.
 *
 * @param model - The model.
 * @param path - Where the config sits, for error messages.
 * @throws When `metadata` is not json.
 */
export const validateMetadataColumn = (
  model: ModelDescription,
  path: string
): void => {
  const metadata = model.columns.find(({ name }) => name === "metadata")

  if (metadata && metadata.dataType !== "json") {
    throw buildConfigError(`${path}: "metadata" must be a json column`)
  }
}
