import { buildConfigError } from "../config/build-config-error"
import type { CollectionConfig } from "../config/types"

/**
 * Checks that a singleton has no areas, which are for content, no drafts, whose status, publish and
 * history its page does not have, and a label on every section, which titles its card and its drawer.
 *
 * @param config - The collection's config.
 * @param path - Where the config sits, for error messages.
 * @throws When a singleton has areas or drafts, or a section without a label.
 */
export const validateSingleton = (
  config: CollectionConfig,
  path: string
): void => {
  if (!config.singleton) {
    return
  }

  if (Object.keys(config.areas ?? {}).length) {
    throw buildConfigError(`${path}: a singleton cannot have areas`)
  }

  if (config.drafts === true) {
    throw buildConfigError(
      `${path}: a singleton takes no "drafts: true", as its page shows no status, publish actions, or version history`
    )
  }

  // A JS config can leave `admin` or its sections out, which the sections' own check refuses.
  const index = (config.admin?.sections ?? []).findIndex(
    ({ label }) => label === undefined
  )

  if (index !== -1) {
    throw buildConfigError(
      `${path}: a singleton's admin section [${index}] needs a "label", which titles its card and its drawer`
    )
  }
}
