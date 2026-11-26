import { buildConfigError } from "../config/build-config-error"
import type { CollectionConfig } from "../config/types"

/** The ways a row of a table is edited. */
const EDIT_MODES = ["page", "drawer"]

/**
 * Checks how a collection's rows are edited: a singleton takes neither `admin.edit` nor `admin.table`,
 * as its sections are edited from their cards; `admin.edit` is `"page"` or `"drawer"`; and a drawer,
 * saved live with no status, publish or blocks, takes no drafts and no areas.
 *
 * @param config - The collection's config.
 * @param path - Where the config sits, for error messages.
 * @throws When a singleton names either, or the mode is unknown or does not fit the collection.
 */
export const validateEditMode = (
  config: CollectionConfig,
  path: string
): void => {
  const admin = config.admin ?? {}

  if (config.singleton) {
    if (admin.edit !== undefined || admin.table !== undefined) {
      throw buildConfigError(
        `${path}: a singleton takes no admin "edit" or "table", as its sections are edited from their cards`
      )
    }

    return
  }

  if (admin.edit === undefined) {
    return
  }

  if (!EDIT_MODES.includes(admin.edit)) {
    throw buildConfigError(
      `${path}: admin "edit" needs ${EDIT_MODES.map((mode) => `"${mode}"`).join(" or ")}`
    )
  }

  if (admin.edit !== "drawer") {
    return
  }

  if (config.drafts === true) {
    throw buildConfigError(
      `${path}: admin "edit" "drawer" takes no "drafts: true", as a drawer shows no status and cannot publish`
    )
  }

  if (Object.keys(config.areas ?? {}).length) {
    throw buildConfigError(
      `${path}: admin "edit" "drawer" cannot have areas, as a drawer has no blocks`
    )
  }
}
