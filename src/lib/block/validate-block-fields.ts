import { buildConfigError } from "../config/build-config-error"
import type { BlockConfig } from "../config/types"

/**
 * Checks that a block holds no relationship field: the references of a document are read from the
 * collections' rows only, so a block's relation would point at a document nothing reports.
 *
 * @param config - The block's config.
 * @param path - Where the config sits, for error messages.
 * @throws At the first relationship field.
 */
export const validateBlockFields = (
  config: BlockConfig,
  path: string
): void => {
  const relationship = Object.entries(config.fields ?? {}).find(
    ([, field]) => field.type === "relationship"
  )

  if (relationship) {
    throw buildConfigError(
      `${path}: field "${relationship[0]}" is a relationship, which a block cannot hold`
    )
  }
}
